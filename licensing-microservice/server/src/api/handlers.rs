use std::sync::Arc;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use crate::domain::models::{CreateLicenseRequest, ActivateRequest, ValidateRequest, ValidateResponse};
use crate::services::licensing_service::LicensingService;

#[derive(Clone)]
pub struct AppState {
    pub service: LicensingService,
}

pub async fn list_licenses(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.service.get_all_licenses().await {
        Ok(list) => (StatusCode::OK, Json(json!({ "success": true, "data": list }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "success": false, "message": e }))),
    }
}

pub async fn create_license(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateLicenseRequest>,
) -> impl IntoResponse {
    match state.service.create_license(payload).await {
        Ok(lic) => (StatusCode::CREATED, Json(json!({ "success": true, "data": lic }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "success": false, "message": e }))),
    }
}

pub async fn reset_hwid(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.service.reset_license_hwid(&id).await {
        Ok(lic) => (StatusCode::OK, Json(json!({ "success": true, "data": lic }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "success": false, "message": e }))),
    }
}

#[derive(Deserialize)]
pub struct UpdateStatusPayload {
    pub status: String,
}

pub async fn update_status(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateStatusPayload>,
) -> impl IntoResponse {
    match state.service.set_license_status(&id, &payload.status).await {
        Ok(lic) => (StatusCode::OK, Json(json!({ "success": true, "data": lic }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "success": false, "message": e }))),
    }
}

pub async fn delete_license(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.service.delete_license(&id).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "success": true, "message": "Deleted successfully" }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "success": false, "message": e }))),
    }
}

pub async fn activate_client(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ActivateRequest>,
) -> impl IntoResponse {
    match state.service.activate(payload).await {
        Ok(resp) => (StatusCode::OK, Json(resp)),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::domain::models::ActivationResponse {
            success: false,
            serial_key: None,
            client_name: None,
            hwid: None,
            activated_at: None,
            license_type: None,
            signature: None,
            message: e,
        })),
    }
}

pub async fn validate_license_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ValidateRequest>,
) -> impl IntoResponse {
    match state.service.validate(payload).await {
        Ok(resp) => (StatusCode::OK, Json(resp)),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(ValidateResponse {
            valid: false,
            reason: Some("INTERNAL_ERROR".to_string()),
            message: Some(e),
            client_name: None,
        })),
    }
}

pub async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "status": "healthy", "service": "church-care-licensing-microservice" })))
}

