use axum::{
    extract::{Json, State}, response::IntoResponse,
};
use axum_extra::extract::CookieJar;
use csv::ReaderBuilder;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::fs::File;

use crate::{AppState, utils::year_to_oi};

#[derive(Deserialize)]
pub struct FindResultRequest {
    pub year: String,
    pub stage: usize,
    pub place: usize,
}

#[derive(Serialize)]
pub struct FindResultResponse {
    pub center: usize,
    pub rows: Vec<RankingRow>,
}

#[derive(Serialize)]
pub struct RankingRow {
    pub place: usize,
    pub initials: String,
    pub scores: Vec<f64>,
    pub total: f64,
}

pub async fn find_result(
    Json(req): Json<FindResultRequest>
) -> Result<Json<FindResultResponse>, Json<serde_json::Value>> {

    if req.stage < 1 || req.stage > 3 {
        return Err(Json(serde_json::json!({
            "error": "invalid stage"
        })));
    }

    let year: u32 = match req.year.parse() {
        Ok(y) => y,
        Err(_) => {
            return Err(Json(serde_json::json!({
                "error": "invalid year"
            })));
        }
    };

    if year < 2004 {
        return Err(Json(serde_json::json!({
            "error": "invalid year"
        })));
    }

    if req.place == 0 {
        return Err(Json(serde_json::json!({
            "error": "invalid place"
        })));
    }

    let path = format!(
        "data/results/{}oi.csv",
        year_to_oi(year as i32)
    );

    let file = match File::open(&path) {
        Ok(f) => f,
        Err(_) => {
            return Err(Json(serde_json::json!({
                "error": "result file not found"
            })));
        }
    };

    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);

    let headers = match reader.headers() {
        Ok(h) => h.clone(),
        Err(_) => {
            return Err(Json(serde_json::json!({
                "error": "invalid csv headers"
            })));
        }
    };

    let stage_suffix = format!("_{}e", req.stage);

    let score_columns: Vec<usize> = headers
        .iter()
        .enumerate()
        .filter(|(_, name)| {
            name.contains('_')
                && name.ends_with(&stage_suffix)
                && !name.starts_with("suma")
        })
        .map(|(i, _)| i)
        .collect();

    if score_columns.is_empty() {
        return Err(Json(serde_json::json!({
            "error": "no problems found for stage"
        })));
    }

    let mut ranking: Vec<(String, Vec<f64>, f64)> = Vec::new();

    for result in reader.records() {
        let record = match result {
            Ok(r) => r,
            Err(_) => continue,
        };

        let name = record
            .get(0)
            .unwrap_or("")
            .trim()
            .to_string();

        if name.is_empty() || name == "- -" {
            continue;
        }

        let mut scores = Vec::new();
        let mut total = 0.0;

        for idx in &score_columns {
            let value: f64 = record
                .get(*idx)
                .unwrap_or("0")
                .replace(",", ".")
                .parse()
                .unwrap_or(0.0);

            scores.push(value);
            total += value;
        }

        ranking.push(
            (
                name,
                scores,
                total
            )
        );
    }

    ranking.sort_by(|a, b| {
        b.2.partial_cmp(&a.2)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    if req.place > ranking.len() {
        return Err(Json(serde_json::json!({
            "error": "place out of range"
        })));
    }

    let target = req.place - 1;

    let start = target.saturating_sub(2);

    let end = (target + 3)
        .min(ranking.len());

    let rows = ranking[start..end]
        .iter()
        .enumerate()
        .map(|(i, item)| {
            RankingRow {
                place: start + i + 1,
                initials: make_initials(&item.0),
                scores: item.1.clone(),
                total: item.2,
            }
        })
        .collect::<Vec<_>>();


    Ok(Json(
        FindResultResponse {
            center: target - start,
            rows,
        }
    ))
}


fn make_initials(name: &str) -> String {
    name
        .split_whitespace()
        .filter_map(|x| x.chars().next())
        .map(|c| format!("{}.", c.to_uppercase()))
        .collect::<Vec<_>>()
        .join(" ")
}

#[derive(Deserialize)]
pub struct ConfirmResultRequest {
    year: String,
    stage: i32,
    place: i32,
}

pub async fn confirm_result(
    jar: CookieJar,
    State(state): State<AppState>,
    Json(req): Json<ConfirmResultRequest>,
) -> Result<Json<serde_json::Value>, impl IntoResponse> {
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

    if req.stage < 1 || req.stage > 3 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "invalid stage"
            }))
        ));
    }

    let year: u32 = match req.year.parse() {
        Ok(y) => y,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "invalid year"
                }))
            ));
        }
    };

    if year < 2004 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "invalid year"
            }))
        ));
    }

    if req.place <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "invalid place"
            }))
        ));
    }
    let path = format!(
        "data/results/{}oi.csv",
        year_to_oi(year as i32)
    );

    let file = match File::open(&path) {
        Ok(f) => f,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "result file not found"
                }))
            ));
        }
    };

    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);

    let headers = reader.headers().unwrap();

    let stage_suffix = format!("_{}e", req.stage);

    let score_columns: Vec<usize> = headers
        .iter()
        .enumerate()
        .filter(|(_, name)| {
            name.contains('_')
                && name.ends_with(&stage_suffix)
                && !name.starts_with("suma")
        })
        .map(|(i, _)| i)
        .collect();

    if score_columns.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "no problems found for stage"
            }))
        ));
    }

    let mut ranking: Vec<(String, Vec<f64>, f64)> = Vec::new();

    for result in reader.records() {
        let record = match result {
            Ok(r) => r,
            Err(_) => continue,
        };

        let name = record
            .get(0)
            .unwrap_or("")
            .trim()
            .to_string();

        if name.is_empty() || name == "- -" {
            continue;
        }

        let mut scores = Vec::new();
        let mut total = 0.0;

        for idx in &score_columns {
            let value: f64 = record
                .get(*idx)
                .unwrap_or("0")
                .replace(",", ".")
                .parse()
                .unwrap_or(0.0);

            scores.push(value);
            total += value;
        }

        ranking.push(
            (
                name,
                scores,
                total
            )
        );
    }

    ranking.sort_by(|a, b| {
        b.2.partial_cmp(&a.2)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    if req.place > ranking.len() as i32 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "place out of length"
            }))
        ));
    }

    let result = sqlx::query!(
        r#"
        UPDATE users
        SET
            result_year = ?,
            result_stage = ?,
            result_place = ?,
            result_is_oi = ?
        WHERE id = (
            SELECT user_id
            FROM sessions
            WHERE session_id = ?
            AND expires_at > unixepoch()
        )
        "#,
        req.year,
        req.stage.to_string(),
        req.place.to_string(),
        true,
        session
    )
    .execute(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "database error"
            }))
        )
    })?;


    if result.rows_affected() == 0 {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "invalid session"
            }))
        ));
    }

    Ok(Json(serde_json::json!({"success": true})))

}