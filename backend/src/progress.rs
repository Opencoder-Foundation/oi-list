use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
};
use axum_extra::extract::CookieJar;
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::AppState;

type ApiError = (StatusCode, Json<serde_json::Value>);

#[derive(Serialize)]
pub struct ProblemProgress {
    problem_id: String,
    status: String,
}

#[derive(Deserialize)]
pub struct UpdateProgressRequest {
    status: Option<String>,
}

async fn user_id(jar: &CookieJar, state: &AppState) -> Result<i64, ApiError> {
    let session = jar.get("session").ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Not logged in" })),
        )
    })?;

    sqlx::query_scalar::<_, i64>(
        "SELECT user_id FROM sessions WHERE session_id = ? AND expires_at > unixepoch()",
    )
    .bind(session.value())
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "Database error" })),
        )
    })?
    .ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid session" })),
        )
    })
}

pub async fn get_progress(
    jar: CookieJar,
    State(state): State<AppState>,
) -> Result<Json<Vec<ProblemProgress>>, ApiError> {
    let user_id = user_id(&jar, &state).await?;
    let rows = sqlx::query("SELECT problem_id, status FROM problem_progress WHERE user_id = ?")
        .bind(user_id)
        .fetch_all(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Database error" })),
            )
        })?;

    let progress = rows
        .into_iter()
        .map(|row| ProblemProgress {
            problem_id: row.get("problem_id"),
            status: row.get("status"),
        })
        .collect();

    Ok(Json(progress))
}

pub async fn update_progress(
    jar: CookieJar,
    State(state): State<AppState>,
    Path(problem_id): Path<String>,
    Json(request): Json<UpdateProgressRequest>,
) -> Result<StatusCode, ApiError> {
    let user_id = user_id(&jar, &state).await?;

    match request.status.as_deref() {
        Some("todo") | Some("done") => {
            sqlx::query(
                "INSERT INTO problem_progress (user_id, problem_id, status) VALUES (?, ?, ?) ON CONFLICT(user_id, problem_id) DO UPDATE SET status = excluded.status, updated_at = unixepoch()",
            )
            .bind(user_id)
            .bind(problem_id)
            .bind(request.status)
            .execute(&state.pool)
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": "Database error" })),
                )
            })?;
        }
        None => {
            sqlx::query("DELETE FROM problem_progress WHERE user_id = ? AND problem_id = ?")
                .bind(user_id)
                .bind(problem_id)
                .execute(&state.pool)
                .await
                .map_err(|_| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({ "error": "Database error" })),
                    )
                })?;
        }
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "Invalid status" })),
            ));
        }
    }

    Ok(StatusCode::NO_CONTENT)
}
