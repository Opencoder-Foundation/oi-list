use serde_json::Value;
use std::sync::LazyLock;
use axum::Json;

const PROBLEMS: &str = include_str!("../data/problems.json");

static PROBLEMS_JSON: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(PROBLEMS).expect("Error while parsing data/problems.json")
});

pub async fn get_problems() -> Json<Value> {
    Json(PROBLEMS_JSON.clone())
}