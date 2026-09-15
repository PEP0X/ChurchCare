use async_trait::async_trait;
use crate::domain::models::License;

#[async_trait]
pub trait LicenseRepository: Send + Sync {
    async fn get_all(&self) -> Result<Vec<License>, String>;
    async fn find_by_serial(&self, serial: &str) -> Result<Option<License>, String>;
    async fn create(&self, serial: &str, client_name: &str, notes: Option<&str>) -> Result<License, String>;
    async fn update_activation(&self, id: &str, hwid: &str, activated_at: &str, notes: Option<&str>) -> Result<License, String>;
    async fn update_status(&self, id: &str, status: &str) -> Result<License, String>;
    async fn reset_hwid(&self, id: &str) -> Result<License, String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    async fn log_activation(&self, serial: &str, hwid: &str, success: bool, message: &str) -> Result<(), String>;
}
