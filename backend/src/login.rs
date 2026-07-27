use serde::Deserialize;
use axum::{extract::Query, response::{IntoResponse, Redirect}};
use std::env;


#[derive(Deserialize)]
pub struct DiscordCallback {
    code: String,
}


pub async fn dc_auth() -> Redirect {
    let url = format!("https://discord.com/oauth2/authorize/\
        ?client_id={}\
        &response_type=code\
        &redirect_uri=http://localhost:3000/api/auth/callback\
        &scope=identify", env::var("CLIENT_ID").expect("imagine nie ustawić CLIENT_ID w .env. skill issue tbh"));

    Redirect::temporary(&url)
}

pub async fn dc_callback(Query(params): Query<DiscordCallback>) -> impl IntoResponse {

    let client = reqwest::Client::new();

     let response = client
        .post("https://discord.com/api/oauth2/token")
        .form(&[
            ("client_id", &*env::var("CLIENT_ID").expect("imagine nie ustawić CLIENT_ID w .env. skill issue tbh")),
            ("client_secret", &*env::var("CLIENT_SECRET").expect("imagine nie ustawić CLIENT_SECRET w .env. skill issue tbh")),
            ("grant_type", "authorization_code"),
            ("code", &params.code),
            (
                "redirect_uri",
                "http://localhost:3000/api/auth/callback"
            ),
        ])
        .send()
        .await
        .unwrap();

    let token: serde_json::Value = response
        .json()
        .await
        .unwrap();

    let _access_token = token["access_token"]
        .as_str()
        .unwrap();

    "Logged in!"


}