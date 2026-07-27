use axum::{Json, extract::State};
use serde::Serialize;

use crate::{AppError, AppState};

#[derive(Serialize)]
pub struct User {
    pub id: i64,
    pub discord_id: String,
    pub username: String,
    pub avatar: Option<String>,
    pub is_admin: bool,
}

pub async fn list_users(
    State(state): State<AppState>,
) -> Result<Json<Vec<User>>, AppError> {
    let users = sqlx::query_as!(
        User,
        r#"
        SELECT id, discord_id::text as discord_id, username, avatar, is_admin
        FROM users
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(users))
}