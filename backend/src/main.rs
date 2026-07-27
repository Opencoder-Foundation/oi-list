use axum::{routing::get, Router};

mod health;
mod problems;

use health::health_check;
use problems::get_problems;

#[tokio::main]
async fn main() {
    let api_routes = Router::new()
        .route("/", get(health_check))
        .route("/problems", get(get_problems));

    let app = Router::new().nest("/api", api_routes);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Successfully started the backend at 0.0.0.0:3000");

    axum::serve(listener, app).await.unwrap();
}