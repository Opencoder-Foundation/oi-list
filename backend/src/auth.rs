use axum_extra::extract::CookieJar;
use reqwest::{StatusCode, header};
use serde::Deserialize;
use axum::{Json, extract::{Query, State}, http::HeaderMap, response::{IntoResponse, Redirect}};
use std::env;
use chrono::Utc;

use crate::{AppError, AppState};


#[derive(Deserialize)]
pub struct DiscordCallback {
    code: String,
}

#[derive(serde::Deserialize)]
struct DiscordUser {
    id: String,
    username: String,
    avatar: Option<String>,
}

pub async fn dc_auth() -> Redirect {
    let url = format!("https://discord.com/oauth2/authorize/\
        ?client_id={}\
        &response_type=code\
        &redirect_uri=https://zadania.oki.org.pl/api/auth/callback\
        &scope=identify", env::var("CLIENT_ID").expect("imagine nie ustawić CLIENT_ID w .env. skill issue tbh"));

    Redirect::temporary(&url)
}

pub async fn dc_callback(
    Query(params): Query<DiscordCallback>, 
    State(state): State<AppState>) -> Result<impl IntoResponse, AppError> {

    let client = reqwest::Client::new();

    let response = client
        .post("https://discord.com/api/oauth2/token")
        .form(&[
            ("client_id", &*env::var("CLIENT_ID").expect("imagine nie ustawić CLIENT_ID w .env. skill issue tbh")),
            ("client_secret", &*env::var("CLIENT_SECRET").expect("imagine nie ustawić CLIENT_SECRET w .env. skill issue tbh")),
            ("grant_type", "authorization_code"),
            ("code", &params.code),
            (
                "redirect_uri",
                "https://zadania.oki.org.pl/api/auth/callback"
            ),
        ])
        .send()
        .await?;

    let token: serde_json::Value = response
        .json()
        .await?;

    let access_token = token["access_token"]
        .as_str()
        .unwrap();

    let discord_user = client
        .get("https://discord.com/api/users/@me")
        .bearer_auth(access_token)
        .send()
        .await?
        .json::<DiscordUser>()
        .await?;
    sqlx::query!(
        r#"
        INSERT INTO users (discord_id, username, avatar)
        VALUES (?, ?, ?)
        ON CONFLICT(discord_id)
        DO UPDATE SET
            username = excluded.username,
            avatar = excluded.avatar
        "#,
        discord_user.id,
        discord_user.username,
        discord_user.avatar,
    )
    .execute(&state.pool)
    .await?;

    let user = sqlx::query!(
        r#"
        SELECT id
        FROM users
        WHERE discord_id = ?
        "#,
        discord_user.id
    )
    .fetch_one(&state.pool)
    .await?;

    let session_id = uuid::Uuid::new_v4().to_string();
    let expires_at = Utc::now()
        .timestamp() + (60 * 60 * 24 * 30);

    sqlx::query!(
        r#"
        INSERT INTO sessions (session_id, user_id, expires_at)
        VALUES (?, ?, ?)
        "#,
        session_id,
        user.id,
        expires_at,
    )
    .execute(&state.pool)
    .await?;

    let mut headers = HeaderMap::new();

    headers.insert(
        header::SET_COOKIE,
        format!(
            "session={}; HttpOnly; Path=/; SameSite=Lax; Max-Age={}",
            session_id,
            60 * 60 * 24 * 30
        )
        .parse()
        .unwrap(),
    );

    Ok((
        headers,
        Redirect::temporary("/")
    ))
}

pub async fn user(
    jar: CookieJar,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let session = match jar.get("session") {
        Some(cookie) => cookie.value(),
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Not logged in"
                })),
            );
        }
    };

    let user = sqlx::query!(
        r#"
        SELECT 
            users.id,
            users.discord_id,
            users.username,
            users.avatar,
            users.result_year,
            users.result_stage,
            users.result_place
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.session_id = ?
        "#,
        session
    )
    .fetch_optional(&state.pool)
    .await
    .unwrap();

    match user {
        Some(user) =>{ 
            if user.result_year.is_some() { 
                (
                    StatusCode::OK,
                    Json(serde_json::json!({
                        "id": user.id,
                        "discord_id": user.discord_id.to_string(),
                        "username": user.username,
                        "avatar": user.avatar,
                        "result": {
                            "year": user.result_year,
                            "stage": user.result_stage,
                            "place": user.result_place
                        }
                    })),
                )
            } else {
                (
                    StatusCode::OK,
                    Json(serde_json::json!({
                        "id": user.id,
                        "discord_id": user.discord_id.to_string(),
                        "username": user.username,
                        "avatar": user.avatar
                    })),
                )
            }
        }

        None => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Invalid session"
            })),
        ),
    }
}