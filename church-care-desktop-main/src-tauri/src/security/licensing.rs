use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce
};
use obfstr::obfstr;
use crate::security::hwid::get_hardware_id;

type HmacSha256 = Hmac<Sha256>;

const MASTER_SECRET: &str = "zkVv79AOxNrjyFVm/VtKToJJfrY1SnwXCYfjvgYb7jU=";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LicenseData {
    pub serial_key: String,
    pub client_name: String,
    pub hwid: String,
    pub activated_at: String,
    pub license_type: String,
    pub signature: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LicenseStatus {
    pub is_licensed: bool,
    pub client_name: Option<String>,
    pub serial_key: Option<String>,
    pub hwid: String,
    pub message: String,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct SupabaseRpcResponse {
    success: bool,
    serial_key: Option<String>,
    client_name: Option<String>,
    hwid: Option<String>,
    activated_at: Option<String>,
    license_type: Option<String>,
    signature: Option<String>,
    error_code: Option<String>,
    message: Option<String>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct ServerValidationResponse {
    valid: Option<bool>,
    reason: Option<String>,
    message: Option<String>,
    client_name: Option<String>,
}

/// Returns the path to the machine-bound encrypted license file
fn get_license_file_path() -> PathBuf {
    let base_dir = dirs_or_local();
    base_dir.join(".churchcare_license.vault")
}

fn dirs_or_local() -> PathBuf {
    if let Ok(app_data) = std::env::var("APPDATA") {
        let p = PathBuf::from(app_data).join("ChurchCare");
        let _ = fs::create_dir_all(&p);
        p
    } else {
        PathBuf::from(".")
    }
}

/// Derives a 32-byte AES key uniquely bound to this machine's HWID
fn derive_machine_aes_key(hwid: &str) -> [u8; 32] {
    use sha2::Digest;
    let mut hasher = Sha256::new();
    hasher.update(hwid.as_bytes());
    hasher.update(obfstr!("CHURCH_CARE_MACHINE_KEY_SALT_2026").as_bytes());
    let res = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&res);
    key
}

/// Verifies whether the HMAC-SHA256 signature on the license data is valid
pub fn verify_license_signature(lic: &LicenseData) -> bool {
    let check_candidate = |payload_str: &str| -> bool {
        if let Ok(mut mac) = <HmacSha256 as Mac>::new_from_slice(MASTER_SECRET.as_bytes()) {
            mac.update(payload_str.as_bytes());
            let expected_sig = hex::encode(mac.finalize().into_bytes());
            expected_sig.eq_ignore_ascii_case(&lic.signature)
        } else {
            false
        }
    };

    let serial = lic.serial_key.trim();
    let hwid = lic.hwid.trim();
    let client = lic.client_name.trim();
    let activated = lic.activated_at.trim();

    // Candidate 1: Canonical payload (serial|hwid|client)
    let p1 = format!("{}|{}|{}", serial, hwid, client);
    if check_candidate(&p1) {
        return true;
    }

    // Candidate 2: Postgres text format (2026-09-10 13:29:27+00)
    let pg_timestamp = activated.replace('T', " ").replace("+00:00", "+00");
    let p2 = format!("{}|{}|{}|{}", serial, hwid, client, pg_timestamp);
    if check_candidate(&p2) {
        return true;
    }

    // Candidate 3: Standard ISO-8601 (2026-09-10T13:29:27+00:00)
    let p3 = format!("{}|{}|{}|{}", serial, hwid, client, activated);
    if check_candidate(&p3) {
        return true;
    }

    false
}

/// Reads and decrypts the local license file, verifying HWID and cryptographic signature
pub fn load_local_license() -> Result<LicenseData, String> {
    let current_hwid = get_hardware_id();
    let lic_path = get_license_file_path();

    if !lic_path.exists() {
        return Err("البرنامج غير مفعّل. يرجى إدخال السيريال الخاص بك للتفعيل.".to_string());
    }

    let encrypted_bytes = fs::read(&lic_path)
        .map_err(|_| "فشل قراءة ملف الترخيص المحلي.".to_string())?;

    if encrypted_bytes.len() < 12 {
        return Err("ملف الترخيص المحلي تالف.".to_string());
    }

    // Decrypt using machine AES key
    let (nonce_bytes, ciphertext) = encrypted_bytes.split_at(12);
    let key = derive_machine_aes_key(&current_hwid);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|_| "خطأ في تهيئة نظام فك التشفير.".to_string())?;

    let nonce = Nonce::from_slice(nonce_bytes);
    let decrypted_bytes = cipher.decrypt(nonce, ciphertext)
        .map_err(|_| "الترخيص غير مطابق لعتاد هذا الجهاز.".to_string())?;

    let license_data: LicenseData = serde_json::from_slice(&decrypted_bytes)
        .map_err(|_| "بيانات الترخيص غير صالحة.".to_string())?;

    // 1. Strict HWID verification
    if license_data.hwid != current_hwid {
        return Err("تم نقل ملف الترخيص لجهاز غير مصرح به.".to_string());
    }

    // 2. Cryptographic signature check
    if !verify_license_signature(&license_data) {
        return Err("فشل التحقق من التوقيع الرقمي للترخيص (تم التلاعب به).".to_string());
    }

    Ok(license_data)
}

/// Instant local verification (0ms, offline-safe, used for startup and PDF guard)
pub fn check_local_license() -> LicenseStatus {
    let current_hwid = get_hardware_id();
    match load_local_license() {
        Ok(lic) => LicenseStatus {
            is_licensed: true,
            client_name: Some(lic.client_name),
            serial_key: Some(lic.serial_key),
            hwid: current_hwid,
            message: "الترخيص سارٍ ومفعّل مدى الحياة لهذا الجهاز بنجاح.".to_string(),
        },
        Err(err_msg) => LicenseStatus {
            is_licensed: false,
            client_name: None,
            serial_key: None,
            hwid: current_hwid,
            message: err_msg,
        },
    }
}

/// Queries cloud validation (Vercel/Firestore), then Supabase RPC validate_license, then local microservice
pub fn query_remote_validation(serial: &str, hwid: &str) -> Result<bool, String> {
    let client = match reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(4))
        .build() {
            Ok(c) => c,
            Err(e) => return Err(format!("فشل تهيئة الاتصال: {}", e)),
        };

    let body = serde_json::json!({
        "p_serial": serial.trim(),
        "p_hwid": hwid.trim()
    });

    // 1. Primary priority: Cloud Vercel / Firebase Firestore (/api/validate)
    let cloud_validate = obfstr!("https://coptic-care.vercel.app/api/validate").to_string();
    if let Ok(res) = client.post(&cloud_validate)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
    {
        if res.status().is_success() {
            if let Ok(val) = res.json::<ServerValidationResponse>() {
                if let Some(valid) = val.valid {
                    return Ok(valid);
                }
            }
        }
    }

    // 2. Secondary fallback: Supabase RPC validate_license
    let supabase_url = obfstr!("https://pluijiucmbqjwnaoyyhi.supabase.co").to_string();
    let publishable_key = obfstr!("sb_publishable_AXTJg_CXmTcON9dIgDdHYA_QQcOgTBt").to_string();
    let endpoint = format!("{}/rest/v1/rpc/validate_license", supabase_url);

    if let Ok(res) = client.post(&endpoint)
        .header("apikey", &publishable_key)
        .header("Authorization", format!("Bearer {}", publishable_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
    {
        if res.status().is_success() {
            if let Ok(val) = res.json::<ServerValidationResponse>() {
                if let Some(valid) = val.valid {
                    return Ok(valid);
                }
            }
        }
    }

    // 3. Third priority: Licensing microservice (http://localhost:4040/api/validate)
    let ms_endpoint = "http://localhost:4040/api/validate";
    let ms_body = serde_json::json!({
        "serial_key": serial.trim(),
        "hwid": hwid.trim()
    });

    if let Ok(res) = client.post(ms_endpoint)
        .header("Content-Type", "application/json")
        .json(&ms_body)
        .send()
    {
        if res.status().is_success() {
            if let Ok(val) = res.json::<ServerValidationResponse>() {
                if let Some(valid) = val.valid {
                    return Ok(valid);
                }
            }
        }
    }

    Err("تعذر الاتصال بالخادم (وضع عدم الاتصال)".to_string())
}

/// Realtime Heartbeat: checks local vault and validates with server.
/// If server explicitly revokes, unbinds (HWID reset), or deletes the license,
/// this immediately deletes the local encrypted vault and locks the app.
pub fn check_license_heartbeat() -> LicenseStatus {
    let current_hwid = get_hardware_id();

    // 1. Verify local license cryptographic integrity first
    let local_data = match load_local_license() {
        Ok(data) => data,
        Err(err_msg) => {
            return LicenseStatus {
                is_licensed: false,
                client_name: None,
                serial_key: None,
                hwid: current_hwid,
                message: err_msg,
            };
        }
    };

    // 2. Query remote server for live validation
    match query_remote_validation(&local_data.serial_key, &local_data.hwid) {
        Ok(true) => {
            // Server confirms license is active and valid for this HWID
            LicenseStatus {
                is_licensed: true,
                client_name: Some(local_data.client_name),
                serial_key: Some(local_data.serial_key),
                hwid: current_hwid,
                message: "الترخيص سارٍ ومفعّل.".to_string(),
            }
        }
        Ok(false) => {
            // 🚨 Authoritative Server Revocation: HWID was reset, license deleted, or revoked!
            // Wipe the local encrypted vault file immediately so it can never be reused.
            let lic_path = get_license_file_path();
            if lic_path.exists() {
                let _ = fs::remove_file(&lic_path);
            }

            LicenseStatus {
                is_licensed: false,
                client_name: None,
                serial_key: None,
                hwid: current_hwid,
                message: "تم إلغاء التفعيل أو فك ربط هذا الجهاز من قبل إدارة النظام.".to_string(),
            }
        }
        Err(_) => {
            // 🛡️ Graceful Offline Fallback ("مش رخم لل user"):
            // Network is unreachable or timed out. Since local cryptographic signature & hardware binding
            // are 100% valid, allow the user to continue working offline peacefully.
            LicenseStatus {
                is_licensed: true,
                client_name: Some(local_data.client_name),
                serial_key: Some(local_data.serial_key),
                hwid: current_hwid,
                message: "الترخيص سارٍ محلياً (وضع عدم الاتصال).".to_string(),
            }
        }
    }
}


/// Encrypts and saves a valid license to local disk bound to this machine
fn save_local_license(lic: &LicenseData) -> Result<(), String> {
    let current_hwid = get_hardware_id();
    let lic_path = get_license_file_path();
    let key = derive_machine_aes_key(&current_hwid);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("فشل تهيئة التشفير: {}", e))?;

    let json_bytes = serde_json::to_vec(lic)
        .map_err(|e| format!("فشل تحويل البيانات: {}", e))?;

    // 12-byte nonce (using deterministic pseudo-random or timestamp-based for simplicity)
    use sha2::Digest;
    let mut nonce_hasher = Sha256::new();
    nonce_hasher.update(lic.serial_key.as_bytes());
    nonce_hasher.update(current_hwid.as_bytes());
    let nonce_digest = nonce_hasher.finalize();
    let mut nonce_bytes = [0u8; 12];
    nonce_bytes.copy_from_slice(&nonce_digest[0..12]);

    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, json_bytes.as_ref())
        .map_err(|e| format!("فشل تشفير الترخيص: {}", e))?;

    let mut final_file = Vec::with_capacity(12 + ciphertext.len());
    final_file.extend_from_slice(&nonce_bytes);
    final_file.extend_from_slice(&ciphertext);

    fs::write(lic_path, final_file)
        .map_err(|e| format!("فشل حفظ ملف الترخيص: {}", e))?;

    Ok(())
}

/// Calls cloud activation endpoint (Vercel/Firestore) via HTTPS with fallback to Supabase, binding license to this machine
pub fn activate_license_online(serial: &str) -> Result<LicenseStatus, String> {
    let current_hwid = get_hardware_id();
    let cleaned_serial = serial.trim().to_uppercase();

    if cleaned_serial.is_empty() {
        return Err("يرجى إدخال السيريال.".to_string());
    }

    let device_name = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Desktop-PC".to_string());

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("فشل تهيئة الاتصال بالشبكة: {}", e))?;

    let body = serde_json::json!({
        "p_serial": cleaned_serial,
        "p_hwid": current_hwid,
        "p_device_name": device_name
    });

    // 1. Primary priority: Cloud Vercel / Firebase Firestore endpoint
    let cloud_activate = obfstr!("https://coptic-care.vercel.app/api/activate").to_string();
    if let Ok(res) = client.post(&cloud_activate)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
    {
        if res.status().is_success() {
            if let Ok(rpc_res) = res.json::<SupabaseRpcResponse>() {
                if rpc_res.success {
                    let lic_data = LicenseData {
                        serial_key: rpc_res.serial_key.unwrap_or_else(|| cleaned_serial.clone()),
                        client_name: rpc_res.client_name.unwrap_or_else(|| "العميل".to_string()),
                        hwid: rpc_res.hwid.unwrap_or_else(|| current_hwid.clone()),
                        activated_at: rpc_res.activated_at.unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
                        license_type: rpc_res.license_type.unwrap_or_else(|| "LIFETIME".to_string()),
                        signature: rpc_res.signature.ok_or("لم يرسل السيرفر توقيعاً رقمياً معتمداً.")?,
                    };

                    if verify_license_signature(&lic_data) {
                        save_local_license(&lic_data)?;
                        return Ok(LicenseStatus {
                            is_licensed: true,
                            client_name: Some(lic_data.client_name),
                            serial_key: Some(lic_data.serial_key),
                            hwid: current_hwid,
                            message: "تم تفعيل البرنامج بنجاح مدى الحياة لهذا الجهاز!".to_string(),
                        });
                    }
                } else if let Some(code) = rpc_res.error_code.as_deref() {
                    // Stop on explicit status errors (Revoked or Hardware Mismatch)
                    if code == "LICENSE_REVOKED" || code == "HARDWARE_MISMATCH" {
                        let msg = rpc_res.message.unwrap_or_else(|| "فشل التفعيل.".to_string());
                        return Err(msg);
                    }
                }
            }
        }
    }

    // 2. Secondary fallback: Supabase RPC activate_license
    let supabase_url = obfstr!("https://pluijiucmbqjwnaoyyhi.supabase.co").to_string();
    let publishable_key = obfstr!("sb_publishable_AXTJg_CXmTcON9dIgDdHYA_QQcOgTBt").to_string();
    let endpoint = format!("{}/rest/v1/rpc/activate_license", supabase_url);

    let res = client.post(&endpoint)
        .header("apikey", &publishable_key)
        .header("Authorization", format!("Bearer {}", publishable_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| {
            if e.is_timeout() {
                "انتهت مهلة الاتصال بالسيرفر. يرجى التحقق من اتصال الإنترنت والمحاولة ثانية.".to_string()
            } else {
                format!("تعذر الاتصال بسيرفر التفعيل: {}", e)
            }
        })?;

    if !res.status().is_success() {
        let error_body = res.text().unwrap_or_default();
        return Err(format!("فشل طلب التفعيل من السيرفر: {}", error_body));
    }

    let rpc_res: SupabaseRpcResponse = res.json()
        .map_err(|e| format!("استجابة غير صالحة من السيرفر: {}", e))?;

    if !rpc_res.success {
        let msg = rpc_res.message.unwrap_or_else(|| "فشل التفعيل لأسباب غير محددة.".to_string());
        return Err(msg);
    }

    let lic_data = LicenseData {
        serial_key: rpc_res.serial_key.unwrap_or(cleaned_serial),
        client_name: rpc_res.client_name.unwrap_or_else(|| "العميل".to_string()),
        hwid: rpc_res.hwid.unwrap_or_else(|| current_hwid.clone()),
        activated_at: rpc_res.activated_at.unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
        license_type: rpc_res.license_type.unwrap_or_else(|| "LIFETIME".to_string()),
        signature: rpc_res.signature.ok_or("لم يرسل السيرفر توقيعاً رقمياً معتمداً.")?,
    };

    // Verify signature immediately
    if !verify_license_signature(&lic_data) {
        return Err("فشل التحقق من التوقيع الرقمي الصادر من السيرفر (قد يكون الاتصال مخترقاً أو معترضاً).".to_string());
    }

    // Save locally
    save_local_license(&lic_data)?;

    Ok(LicenseStatus {
        is_licensed: true,
        client_name: Some(lic_data.client_name),
        serial_key: Some(lic_data.serial_key),
        hwid: current_hwid,
        message: "تم تفعيل البرنامج بنجاح مدى الحياة لهذا الجهاز!".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hwid_generation() {
        let hwid = get_hardware_id();
        assert!(hwid.starts_with("HWID-"));
        assert_eq!(hwid.len(), 24); // HWID-XXXX-XXXX-XXXX-XXXX
        println!("Generated HWID: {}", hwid);
    }

    #[test]
    fn test_signature_verification_and_anti_tamper() {
        let mut lic = LicenseData {
            serial_key: "CCARE-TEST-1111-2222".to_string(),
            client_name: "كنيسة مارجرجس".to_string(),
            hwid: "HWID-AAAA-BBBB-CCCC-DDDD".to_string(),
            activated_at: "2026-09-10T12:00:00Z".to_string(),
            license_type: "LIFETIME".to_string(),
            signature: String::new(),
        };

        // Compute valid signature
        let mut mac = <HmacSha256 as Mac>::new_from_slice(MASTER_SECRET.as_bytes()).unwrap();
        let payload = format!(
            "{}|{}|{}",
            lic.serial_key.trim(),
            lic.hwid.trim(),
            lic.client_name.trim()
        );
        mac.update(payload.as_bytes());
        lic.signature = hex::encode(mac.finalize().into_bytes());

        // 1. Valid signature must pass
        assert!(verify_license_signature(&lic));

        // 2. Tampered HWID must FAIL
        let mut tampered_hwid = lic.clone();
        tampered_hwid.hwid = "HWID-HACKED-MACHINE".to_string();
        assert!(!verify_license_signature(&tampered_hwid));

        // 3. Tampered client name must FAIL
        let mut tampered_name = lic.clone();
        tampered_name.client_name = "قرصنة".to_string();
        assert!(!verify_license_signature(&tampered_name));
    }

    #[test]
    fn test_local_vault_tamper_detection() {
        let current_hwid = get_hardware_id();
        let lic = LicenseData {
            serial_key: "CCARE-TEST-3333-4444".to_string(),
            client_name: "كنيسة الملاك".to_string(),
            hwid: current_hwid.clone(),
            activated_at: "2026-09-10T12:00:00Z".to_string(),
            license_type: "LIFETIME".to_string(),
            signature: String::new(),
        };

        let mut mac = <HmacSha256 as Mac>::new_from_slice(MASTER_SECRET.as_bytes()).unwrap();
        let payload = format!("{}|{}|{}", lic.serial_key, lic.hwid, lic.client_name);
        mac.update(payload.as_bytes());
        let mut valid_lic = lic.clone();
        valid_lic.signature = hex::encode(mac.finalize().into_bytes());

        // Derived AES key for current machine
        let key = derive_machine_aes_key(&current_hwid);
        let cipher = Aes256Gcm::new_from_slice(&key).unwrap();

        // Ensure key derived for a fake HWID CANNOT decrypt current machine's data
        let fake_key = derive_machine_aes_key("HWID-FAKE-9999-8888-7777");
        let fake_cipher = Aes256Gcm::new_from_slice(&fake_key).unwrap();

        let json_bytes = serde_json::to_vec(&valid_lic).unwrap();
        let nonce = Nonce::from_slice(b"123456789012");
        let ciphertext = cipher.encrypt(nonce, json_bytes.as_ref()).unwrap();

        // Fake machine decryption MUST fail
        let fake_decrypt_res = fake_cipher.decrypt(nonce, ciphertext.as_ref());
        assert!(fake_decrypt_res.is_err(), "Hardware lock failed: different machine was able to decrypt!");
    }
}

