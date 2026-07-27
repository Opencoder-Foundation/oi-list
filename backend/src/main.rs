use axum::{Router, response::{IntoResponse, Response}, routing::get};

mod health;
mod problems;
mod auth;

use health::health_check;
use problems::get_problems;
use auth::{dc_auth, dc_callback};

use reqwest::StatusCode;
use sqlx::SqlitePool;

use crate::auth::user;

#[derive(Clone)]
pub struct AppState {
    pool: SqlitePool,
}
#[derive(Debug)]
pub enum AppError {
    Database(sqlx::Error),
    Request(reqwest::Error),
    Discord(String),
}
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            ),
            AppError::Request(_) => (
                StatusCode::BAD_GATEWAY,
                "Discord request failed".to_string(),
            ),
            AppError::Discord(msg) => (
                StatusCode::BAD_REQUEST,
                msg
            ),
        };

        (status, message).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err)
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::Request(err)
    }
}


#[tokio::main]
async fn main() {
    let pool = SqlitePool::connect(
        "sqlite://database.db"
    )
    .await.expect("jakie skill issue");

    let state = AppState { pool };


    dotenv::dotenv().ok();

    let api_routes = Router::new()
        .route("/", get(health_check))
        .route("/problems", get(get_problems))
        .route("/auth", get(dc_auth))
        .route("/auth/callback", get(dc_callback))
        .route("/user", get(user))
        .with_state(state);

    let app = Router::new().nest("/api", api_routes);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Successfully started the backend at 0.0.0.0:3000");

    axum::serve(listener, app).await.unwrap();
}