use axum::{Json, extract::State};
use axum_extra::extract::CookieJar;
use reqwest::StatusCode;
use serde::Serialize;

use crate::AppState;

#[derive(Serialize)]
pub struct User {
    pub id: i64,
    pub discord_id: String,
    pub username: String,
    pub avatar: Option<String>,
    pub is_admin: bool,
}

pub async fn list_users(
    jar: CookieJar,
    State(state): State<AppState>,
) -> Result<Json<Vec<User>>, (StatusCode, Json<serde_json::Value>)> {
    let session = match jar.get("session") {
        Some(cookie) => cookie.value(),
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Not logged in"
                })),
            ));
        }
    };

    let requester = sqlx::query!(
        r#"
        SELECT users.is_admin as "is_admin: bool"
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.session_id = ?
        AND sessions.expires_at > unixepoch()
        "#,
        session
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error"
            })),
        )
    })?;

    let requester = match requester {
        Some(requester) => requester,
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid session"
                })),
            ));
        }
    };

    if !requester.is_admin {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Admin permissions required"
            })),
        ));
    }

    let users = sqlx::query_as!(
        User,
        r#"
        SELECT id, CAST(discord_id AS TEXT) as discord_id, username, avatar, is_admin
        FROM users
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error"
            })),
        )
    })?;

    Ok(Json(users))
}