use axum::{
    http::{header::CONTENT_TYPE, HeaderValue, Method},
    routing::get,
    Router,
};
use tower_http::cors::CorsLayer;

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

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers([CONTENT_TYPE])
        .allow_origin([
            HeaderValue::from_static("http://localhost:5173"),
            HeaderValue::from_static("http://127.0.0.1:5173"),
            HeaderValue::from_static("https://zadania.oki.org.pl"),
        ]);

    let app = Router::new().nest("/api", api_routes).layer(cors);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Successfully started the backend at 127.0.0.1:3000");

    axum::serve(listener, app).await.unwrap();
}