use std::sync::Arc;
use axum::{
    routing::{get, post, delete},
    Router,
};
use tower_http::cors::{CorsLayer, Any};
use crate::api::handlers::{
    AppState,
    list_licenses,
    create_license,
    reset_hwid,
    update_status,
    delete_license,
    activate_client,
    validate_license_handler,
    health_check,
};

pub fn create_router(state: Arc<AppState>) -> Router {
    // Permissive CORS to allow Svelte dev server and Desktop app to connect without CORS errors
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health_check))
        .route("/api/licenses", get(list_licenses).post(create_license))
        .route("/api/licenses/:id/reset", post(reset_hwid))
        .route("/api/licenses/:id/status", post(update_status))
        .route("/api/licenses/:id", delete(delete_license))
        .route("/api/activate", post(activate_client))
        .route("/api/validate", post(validate_license_handler))
        .layer(cors)
        .with_state(state)
}
