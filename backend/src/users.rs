use serde_json::{json, Value};
use axum::{Json, extract::State};
use serde::Serialize;

use crate::{AppError, AppState};

#[derive(Serialize)]
pub struct UserSummary {
    pub id: i64,
    pub username: String,
    pub avatar: Option<String>,
}

pub async fn list_users(
    State(state): State<AppState>,
) -> Result<Json<Vec<UserSummary>>, AppError> {
    let users = sqlx::query_as!(
        UserSummary,
        r#"
        SELECT id, username, avatar
        FROM users
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(users))
}