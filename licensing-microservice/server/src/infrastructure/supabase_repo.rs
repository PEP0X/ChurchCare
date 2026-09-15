use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use crate::domain::models::License;
use crate::domain::repository::LicenseRepository;

pub struct SupabaseLicenseRepository {
    client: Client,
    base_url: String,
    secret_key: String,
}

impl SupabaseLicenseRepository {
    pub fn new(base_url: String, secret_key: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            secret_key,
        }
    }

    fn headers(&self) -> reqwest::header::HeaderMap {
        let mut h = reqwest::header::HeaderMap::new();
        h.insert("apikey", self.secret_key.parse().unwrap());
        h.insert("Authorization", format!("Bearer {}", self.secret_key).parse().unwrap());
        h.insert("Content-Type", "application/json".parse().unwrap());
        h
    }
}

#[async_trait]
impl LicenseRepository for SupabaseLicenseRepository {
    async fn get_all(&self) -> Result<Vec<License>, String> {
        let url = format!("{}/rest/v1/licenses?select=*&order=created_at.desc", self.base_url);
        let res = self.client.get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("Supabase error: {}", res.text().await.unwrap_or_default()));
        }

        res.json::<Vec<License>>()
            .await
            .map_err(|e| format!("Parse error: {}", e))
    }

    async fn find_by_serial(&self, serial: &str) -> Result<Option<License>, String> {
        let url = format!("{}/rest/v1/licenses?serial_key=eq.{}&select=*&limit=1", self.base_url, serial.trim());
        let res = self.client.get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("Supabase query error: {}", res.text().await.unwrap_or_default()));
        }

        let mut list = res.json::<Vec<License>>()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        Ok(list.pop())
    }

    async fn create(&self, serial: &str, client_name: &str, notes: Option<&str>) -> Result<License, String> {
        let url = format!("{}/rest/v1/licenses", self.base_url);
        let payload = json!({
            "serial_key": serial.trim(),
            "client_name": client_name.trim(),
            "status": "unactivated",
            "notes": notes
        });

        let mut headers = self.headers();
        headers.insert("Prefer", "return=representation".parse().unwrap());

        let res = self.client.post(&url)
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("Create failed: {}", res.text().await.unwrap_or_default()));
        }

        let mut created = res.json::<Vec<License>>()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        created.pop().ok_or("Empty response from database".to_string())
    }

    async fn update_activation(&self, id: &str, hwid: &str, activated_at: &str, notes: Option<&str>) -> Result<License, String> {
        let url = format!("{}/rest/v1/licenses?id=eq.{}", self.base_url, id);
        let payload = json!({
            "hwid": hwid.trim(),
            "status": "active",
            "activated_at": activated_at,
            "notes": notes
        });

        let mut headers = self.headers();
        headers.insert("Prefer", "return=representation".parse().unwrap());

        let res = self.client.patch(&url)
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("Update activation failed: {}", res.text().await.unwrap_or_default()));
        }

        let mut list = res.json::<Vec<License>>()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        list.pop().ok_or("License not found for update".to_string())
    }

    async fn update_status(&self, id: &str, status: &str) -> Result<License, String> {
        let url = format!("{}/rest/v1/licenses?id=eq.{}", self.base_url, id);
        let payload = json!({ "status": status });

        let mut headers = self.headers();
        headers.insert("Prefer", "return=representation".parse().unwrap());

        let res = self.client.patch(&url)
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("Status update failed: {}", res.text().await.unwrap_or_default()));
        }

        let mut list = res.json::<Vec<License>>()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        list.pop().ok_or("License not found".to_string())
    }

    async fn reset_hwid(&self, id: &str) -> Result<License, String> {
        let url = format!("{}/rest/v1/licenses?id=eq.{}", self.base_url, id);
        let payload = json!({
            "hwid": serde_json::Value::Null,
            "status": "unactivated"
        });

        let mut headers = self.headers();
        headers.insert("Prefer", "return=representation".parse().unwrap());

        let res = self.client.patch(&url)
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("HWID reset failed: {}", res.text().await.unwrap_or_default()));
        }

        let mut list = res.json::<Vec<License>>()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        list.pop().ok_or("License not found".to_string())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        let url = format!("{}/rest/v1/licenses?id=eq.{}", self.base_url, id);
        let res = self.client.delete(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("Delete failed: {}", res.text().await.unwrap_or_default()));
        }

        Ok(())
    }

    async fn log_activation(&self, serial: &str, hwid: &str, success: bool, message: &str) -> Result<(), String> {
        let url = format!("{}/rest/v1/activation_logs", self.base_url);
        let payload = json!({
            "serial_key": serial.trim(),
            "attempted_hwid": hwid.trim(),
            "success": success,
            "message": message
        });

        let _ = self.client.post(&url)
            .headers(self.headers())
            .json(&payload)
            .send()
            .await;

        Ok(())
    }
}
