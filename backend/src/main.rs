use axum::{routing::get, Router};

mod health;
mod problems;
mod login;

use health::health_check;
use problems::get_problems;
use login::dc_auth;

use crate::login::dc_callback;

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    let api_routes = Router::new()
        .route("/", get(health_check))
        .route("/problems", get(get_problems))
        .route("/auth", get(dc_auth))
        .route("/auth/callback", get(dc_callback));

    let app = Router::new().nest("/api", api_routes);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Successfully started the backend at 0.0.0.0:3000");

    axum::serve(listener, app).await.unwrap();
}