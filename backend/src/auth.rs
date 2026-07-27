use axum::{
    extract::{Query, State},
    http::HeaderMap,
    response::{IntoResponse, Redirect},
    Json,
};
use axum_extra::extract::CookieJar;
use chrono::Utc;
use reqwest::{header, StatusCode};
use serde::Deserialize;
use std::env;

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

#[derive(serde::Deserialize)]
struct DiscordTokenResponse {
    access_token: String,
}

pub async fn dc_auth() -> Redirect {
    let url = format!(
        "https://discord.com/oauth2/authorize\
        ?client_id={}\
        &response_type=code\
        &redirect_uri=https://zadania.oki.org.pl/api/auth/callback\
        &scope=identify",
        env::var("CLIENT_ID").expect("imagine nie ustawić CLIENT_ID w .env. skill issue tbh")
    );

    Redirect::temporary(&url)
}

pub async fn dc_callback(
    Query(params): Query<DiscordCallback>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let client = reqwest::Client::new();

    let response = client
        .post("https://discord.com/api/oauth2/token")
        .form(&[
            (
                "client_id",
                &*env::var("CLIENT_ID").expect("imagine nie ustawić CLIENT_ID w .env. skill issue tbh"),
            ),
            (
                "client_secret",
                &*env::var("CLIENT_SECRET").expect("imagine nie ustawić CLIENT_SECRET w .env. skill issue tbh"),
            ),
            ("grant_type", "authorization_code"),
            ("code", &params.code),
            ("redirect_uri", "https://zadania.oki.org.pl/api/auth/callback"),
        ])
        .send()
        .await?
        .error_for_status()?
        .json::<DiscordTokenResponse>()
        .await?;

    let discord_user = client
        .get("https://discord.com/api/users/@me")
        .bearer_auth(&response.access_token)
        .send()
        .await?
        .error_for_status()?
        .json::<DiscordUser>()
        .await?;

    let existing_user = sqlx::query!(
        r#"SELECT id FROM users WHERE discord_id = ?"#,
        discord_user.id
    )
    .fetch_optional(&state.pool)
    .await?;

    let user_id = match existing_user {
        Some(user) => {
            sqlx::query!(
                r#"
                UPDATE users
                SET username = ?, avatar = ?
                WHERE id = ?
                "#,
                discord_user.username,
                discord_user.avatar,
                user.id
            )
            .execute(&state.pool)
            .await?;

            user.id
        }
        None => {
            let res = sqlx::query!(
                r#"
                INSERT INTO users (discord_id, username, avatar)
                VALUES (?, ?, ?)
                "#,
                discord_user.id,
                discord_user.username,
                discord_user.avatar
            )
            .execute(&state.pool)
            .await?;

            res.last_insert_rowid()
        }
    };

    let session_id = uuid::Uuid::new_v4().to_string();
    let expires_at = Utc::now().timestamp() + (60 * 60 * 24 * 30);

    sqlx::query!(
        r#"
        INSERT INTO sessions (session_id, user_id, expires_at)
        VALUES (?, ?, ?)
        "#,
        session_id,
        user_id,
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

    Ok((headers, Redirect::temporary("/")))
}

pub async fn user(jar: CookieJar, State(state): State<AppState>) -> impl IntoResponse {
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

    let user = match sqlx::query!(
        r#"
        SELECT 
            users.id,
            users.discord_id AS "discord_id: String",
            users.username,
            users.avatar,
            users.is_admin AS "is_admin: bool",
            users.result_year,
            users.result_stage,
            users.result_place
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.session_id = ?
        AND sessions.expires_at > unixepoch()
        "#,
        session
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(user) => user,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Database error"
                })),
            );
        }
    };

    match user {
        Some(user) => {
            if user.result_year.is_some() {
                (
                    StatusCode::OK,
                    Json(serde_json::json!({
                        "id": user.id,
                        "discord_id": user.discord_id,
                        "username": user.username,
                        "avatar": user.avatar,
                        "is_admin": user.is_admin,
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
                        "discord_id": user.discord_id,
                        "username": user.username,
                        "avatar": user.avatar,
                        "is_admin": user.is_admin,
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