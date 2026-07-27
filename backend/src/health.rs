use std::time::{SystemTime, UNIX_EPOCH};
use serde_json::{json, Value};
use axum::Json;

pub async fn health_check() -> Json<Value> {
    let epoch_seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    Json(json!({ "status": "ok", "server_time": epoch_seconds }))
}