use std::sync::Arc;
use rand::Rng;
use crate::domain::models::{License, CreateLicenseRequest, ActivateRequest, ActivationResponse, ValidateRequest, ValidateResponse};
use crate::domain::repository::LicenseRepository;
use crate::infrastructure::crypto_service::CryptoService;

#[derive(Clone)]
pub struct LicensingService {
    repo: Arc<dyn LicenseRepository>,
}

impl LicensingService {
    pub fn new(repo: Arc<dyn LicenseRepository>) -> Self {
        Self { repo }
    }

    /// Generates a cryptographically strong serial number in the format CCARE-XXXX-XXXX-XXXX
    pub fn generate_serial_number() -> String {
        const CHARS: &[u8] = b"23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // No 0, O, 1, I
        let mut rng = rand::thread_rng();
        let mut segments = Vec::new();
        
        for _ in 0..3 {
            let seg: String = (0..4)
                .map(|_| {
                    let idx = rng.gen_range(0..CHARS.len());
                    CHARS[idx] as char
                })
                .collect();
            segments.push(seg);
        }

        format!("CCARE-{}", segments.join("-"))
    }

    pub async fn get_all_licenses(&self) -> Result<Vec<License>, String> {
        self.repo.get_all().await
    }

    pub async fn create_license(&self, req: CreateLicenseRequest) -> Result<License, String> {
        let serial = Self::generate_serial_number();
        self.repo.create(&serial, &req.client_name, req.notes.as_deref()).await
    }

    pub async fn reset_license_hwid(&self, id: &str) -> Result<License, String> {
        self.repo.reset_hwid(id).await
    }

    pub async fn set_license_status(&self, id: &str, status: &str) -> Result<License, String> {
        self.repo.update_status(id, status).await
    }

    pub async fn delete_license(&self, id: &str) -> Result<(), String> {
        self.repo.delete(id).await
    }

    pub async fn activate(&self, req: ActivateRequest) -> Result<ActivationResponse, String> {
        let serial = req.serial_key.trim().to_uppercase();
        let hwid = req.hwid.trim();

        if serial.is_empty() {
            return Ok(ActivationResponse {
                success: false,
                serial_key: None,
                client_name: None,
                hwid: None,
                activated_at: None,
                license_type: None,
                signature: None,
                message: "يرجى إدخال كود السيريال.".to_string(),
            });
        }

        // 1. Search in DB
        let license_opt = self.repo.find_by_serial(&serial).await?;
        let license = match license_opt {
            Some(l) => l,
            None => {
                self.repo.log_activation(&serial, hwid, false, "Serial key does not exist").await?;
                return Ok(ActivationResponse {
                    success: false,
                    serial_key: Some(serial),
                    client_name: None,
                    hwid: Some(hwid.to_string()),
                    activated_at: None,
                    license_type: None,
                    signature: None,
                    message: "السيريال المدخل غير مسجل في قاعدة البيانات. يرجى التحقق من كتابته بدقة.".to_string(),
                });
            }
        };

        // 2. Check if revoked
        if license.status == "revoked" {
            self.repo.log_activation(&serial, hwid, false, "License is revoked").await?;
            return Ok(ActivationResponse {
                success: false,
                serial_key: Some(serial),
                client_name: Some(license.client_name),
                hwid: Some(hwid.to_string()),
                activated_at: None,
                license_type: None,
                signature: None,
                message: "تم إلغاء هذا الترخيص من قبل إدارة النظام.".to_string(),
            });
        }

        // 3. Hardware Mismatch Check
        if let Some(ref bound_hwid) = license.hwid {
            if bound_hwid != hwid {
                self.repo.log_activation(&serial, hwid, false, &format!("Bound to {}", bound_hwid)).await?;
                return Ok(ActivationResponse {
                    success: false,
                    serial_key: Some(serial),
                    client_name: Some(license.client_name),
                    hwid: Some(hwid.to_string()),
                    activated_at: None,
                    license_type: None,
                    signature: None,
                    message: "هذا السيريال مفعل بالفعل على جهاز كمبيوتر آخر ولا يمكن استخدامه على هذا الجهاز.".to_string(),
                });
            }
        }

        // 4. Update activation
        let activated_at = chrono::Utc::now().to_rfc3339();
        let device_info = req.device_name.as_deref().unwrap_or("Desktop-PC");
        let note = format!("Activated on {} @ {}", device_info, activated_at);
        let updated = self.repo.update_activation(&license.id, hwid, &activated_at, Some(&note)).await?;

        // 5. Sign cryptographically
        let signature = CryptoService::sign_license(&updated.serial_key, hwid, &updated.client_name)?;

        // 6. Log success
        self.repo.log_activation(&serial, hwid, true, &format!("Activated for {}", updated.client_name)).await?;

        Ok(ActivationResponse {
            success: true,
            serial_key: Some(updated.serial_key),
            client_name: Some(updated.client_name),
            hwid: Some(hwid.to_string()),
            activated_at: Some(activated_at),
            license_type: Some("LIFETIME".to_string()),
            signature: Some(signature),
            message: "تم تفعيل البرنامج بنجاح مدى الحياة لهذا الجهاز!".to_string(),
        })
    }

    pub async fn validate(&self, req: ValidateRequest) -> Result<ValidateResponse, String> {
        let serial = req.serial_key.trim().to_uppercase();
        let hwid = req.hwid.trim();

        let license_opt = self.repo.find_by_serial(&serial).await?;
        let license = match license_opt {
            Some(l) => l,
            None => {
                return Ok(ValidateResponse {
                    valid: false,
                    reason: Some("NOT_FOUND".to_string()),
                    message: Some("الترخيص غير موجود في قاعدة البيانات (تم حذفه).".to_string()),
                    client_name: None,
                });
            }
        };

        if license.status != "active" {
            return Ok(ValidateResponse {
                valid: false,
                reason: Some("NOT_ACTIVE".to_string()),
                message: Some("الترخيص غير نشط أو تم إلغاؤه.".to_string()),
                client_name: Some(license.client_name),
            });
        }

        if let Some(ref bound_hwid) = license.hwid {
            if bound_hwid != hwid {
                return Ok(ValidateResponse {
                    valid: false,
                    reason: Some("HWID_MISMATCH".to_string()),
                    message: Some("الترخيص مرتبط بجهاز آخر.".to_string()),
                    client_name: Some(license.client_name),
                });
            }
        } else {
            return Ok(ValidateResponse {
                valid: false,
                reason: Some("HWID_RESET".to_string()),
                message: Some("تم فك ربط هذا الجهاز من قبل المسؤول.".to_string()),
                client_name: Some(license.client_name),
            });
        }

        Ok(ValidateResponse {
            valid: true,
            reason: None,
            message: Some("الترخيص سارٍ.".to_string()),
            client_name: Some(license.client_name),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;
    use std::sync::Mutex;

    struct MockRepo {
        license: Mutex<Option<License>>,
    }

    #[async_trait]
    impl LicenseRepository for MockRepo {
        async fn get_all(&self) -> Result<Vec<License>, String> { Ok(vec![]) }
        async fn find_by_serial(&self, serial: &str) -> Result<Option<License>, String> {
            let guard = self.license.lock().unwrap();
            if let Some(ref l) = *guard {
                if l.serial_key == serial {
                    return Ok(Some(l.clone()));
                }
            }
            Ok(None)
        }
        async fn create(&self, _s: &str, _c: &str, _n: Option<&str>) -> Result<License, String> { unimplemented!() }
        async fn update_activation(&self, _id: &str, _h: &str, _a: &str, _n: Option<&str>) -> Result<License, String> { unimplemented!() }
        async fn update_status(&self, _id: &str, _s: &str) -> Result<License, String> { unimplemented!() }
        async fn reset_hwid(&self, _id: &str) -> Result<License, String> { unimplemented!() }
        async fn delete(&self, _id: &str) -> Result<(), String> { unimplemented!() }
        async fn log_activation(&self, _s: &str, _h: &str, _suc: bool, _m: &str) -> Result<(), String> { Ok(()) }
    }

    #[tokio::test]
    async fn test_validate_not_found() {
        let repo = Arc::new(MockRepo { license: Mutex::new(None) });
        let service = LicensingService::new(repo);

        let res = service.validate(ValidateRequest {
            serial_key: "CCARE-NOT-EXIST".to_string(),
            hwid: "HWID-1234".to_string(),
        }).await.unwrap();

        assert!(!res.valid);
        assert_eq!(res.reason.as_deref(), Some("NOT_FOUND"));
    }

    #[tokio::test]
    async fn test_validate_hwid_reset_by_admin() {
        let lic = License {
            id: "1".to_string(),
            serial_key: "CCARE-VALID-KEY1".to_string(),
            client_name: "كنيسة العذراء".to_string(),
            hwid: None, // Reset by admin
            status: "active".to_string(),
            max_activations: 1,
            activated_at: None,
            created_at: None,
            notes: None,
        };
        let repo = Arc::new(MockRepo { license: Mutex::new(Some(lic)) });
        let service = LicensingService::new(repo);

        let res = service.validate(ValidateRequest {
            serial_key: "CCARE-VALID-KEY1".to_string(),
            hwid: "HWID-OLD-DEVICE".to_string(),
        }).await.unwrap();

        assert!(!res.valid);
        assert_eq!(res.reason.as_deref(), Some("HWID_RESET"));
    }

    #[tokio::test]
    async fn test_validate_revoked() {
        let lic = License {
            id: "1".to_string(),
            serial_key: "CCARE-VALID-KEY1".to_string(),
            client_name: "كنيسة العذراء".to_string(),
            hwid: Some("HWID-MY-DEVICE".to_string()),
            status: "revoked".to_string(),
            max_activations: 1,
            activated_at: None,
            created_at: None,
            notes: None,
        };
        let repo = Arc::new(MockRepo { license: Mutex::new(Some(lic)) });
        let service = LicensingService::new(repo);

        let res = service.validate(ValidateRequest {
            serial_key: "CCARE-VALID-KEY1".to_string(),
            hwid: "HWID-MY-DEVICE".to_string(),
        }).await.unwrap();

        assert!(!res.valid);
        assert_eq!(res.reason.as_deref(), Some("NOT_ACTIVE"));
    }

    #[tokio::test]
    async fn test_validate_success() {
        let lic = License {
            id: "1".to_string(),
            serial_key: "CCARE-VALID-KEY1".to_string(),
            client_name: "كنيسة العذراء".to_string(),
            hwid: Some("HWID-MY-DEVICE".to_string()),
            status: "active".to_string(),
            max_activations: 1,
            activated_at: Some("2026-09-10T10:00:00Z".to_string()),
            created_at: None,
            notes: None,
        };
        let repo = Arc::new(MockRepo { license: Mutex::new(Some(lic)) });
        let service = LicensingService::new(repo);

        let res = service.validate(ValidateRequest {
            serial_key: "CCARE-VALID-KEY1".to_string(),
            hwid: "HWID-MY-DEVICE".to_string(),
        }).await.unwrap();

        assert!(res.valid);
        assert_eq!(res.client_name.as_deref(), Some("كنيسة العذراء"));
    }
}


