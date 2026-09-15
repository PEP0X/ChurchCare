use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct License {
    pub id: String,
    pub serial_key: String,
    pub client_name: String,
    pub hwid: Option<String>,
    pub status: String,
    pub max_activations: i32,
    pub activated_at: Option<String>,
    pub created_at: Option<String>,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreateLicenseRequest {
    pub client_name: String,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ActivateRequest {
    pub serial_key: String,
    pub hwid: String,
    pub device_name: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ActivationResponse {
    pub success: bool,
    pub serial_key: Option<String>,
    pub client_name: Option<String>,
    pub hwid: Option<String>,
    pub activated_at: Option<String>,
    pub license_type: Option<String>,
    pub signature: Option<String>,
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[allow(dead_code)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ValidateRequest {
    pub serial_key: String,
    pub hwid: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ValidateResponse {
    pub valid: bool,
    pub reason: Option<String>,
    pub message: Option<String>,
    pub client_name: Option<String>,
}

