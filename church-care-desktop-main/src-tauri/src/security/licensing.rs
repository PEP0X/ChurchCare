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
use crate::security::hwid::{get_hardware_id, persist_hardware_id};

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

#[derive(Debug, PartialEq)]
pub enum RemoteValidationResult {
    Valid(Option<String>),
    Revoked(String),
    OfflineOrUncertain(String),
}

/// Queries cloud validation across Vercel and Supabase.
/// Resilient against server desync, cold starts, and network packet drops.
/// A license is considered valid if EITHER server confirms it is active.
/// It is only considered revoked if all reachable servers authoritatively confirm revocation.
pub fn query_remote_validation(serial: &str, hwid: &str) -> RemoteValidationResult {
    let client = match reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build() {
            Ok(c) => c,
            Err(e) => return RemoteValidationResult::OfflineOrUncertain(format!("فشل تهيئة الاتصال: {}", e)),
        };

    let body = serde_json::json!({
        "p_serial": serial.trim(),
        "p_hwid": hwid.trim()
    });

    let mut vercel_result: Option<ServerValidationResponse> = None;
    let mut supabase_result: Option<ServerValidationResponse> = None;

    // 1. Cloud Vercel / Firebase Firestore (/api/validate)
    let cloud_validate = obfstr!("https://coptic-care.vercel.app/api/validate").to_string();
    if let Ok(res) = client.post(&cloud_validate)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
    {
        if res.status().is_success() {
            if let Ok(val) = res.json::<ServerValidationResponse>() {
                if val.valid == Some(true) {
                    return RemoteValidationResult::Valid(val.client_name);
                }
                vercel_result = Some(val);
            }
        }
    }

    // 2. Supabase RPC validate_license
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
                if val.valid == Some(true) {
                    return RemoteValidationResult::Valid(val.client_name);
                }
                supabase_result = Some(val);
            }
        }
    }

    // 3. Fallback: Local Licensing microservice (if running in diocese / intranet)
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
                if val.valid == Some(true) {
                    return RemoteValidationResult::Valid(val.client_name);
                }
            }
        }
    }

    // Evaluate responses if neither server returned valid: true
    match (vercel_result, supabase_result) {
        // Both servers responded and confirmed false
        (Some(v), Some(s)) => {
            let reason_msg = s.message.or(v.message)
                .unwrap_or_else(|| "تم إلغاء التفعيل أو فك ربط هذا الجهاز من قبل إدارة النظام.".to_string());
            RemoteValidationResult::Revoked(reason_msg)
        }
        // Exactly one responded with explicit revocation (HWID_RESET or LICENSE_REVOKED)
        (Some(v), None) if v.reason.as_deref() == Some("HWID_RESET") || v.reason.as_deref() == Some("LICENSE_REVOKED") || v.reason.as_deref() == Some("NOT_ACTIVE") => {
            let msg = v.message.unwrap_or_else(|| "تم إلغاء هذا الترخيص من قبل إدارة النظام.".to_string());
            RemoteValidationResult::Revoked(msg)
        }
        (None, Some(s)) if s.reason.as_deref() == Some("HWID_RESET") || s.reason.as_deref() == Some("LICENSE_REVOKED") || s.reason.as_deref() == Some("NOT_ACTIVE") => {
            let msg = s.message.unwrap_or_else(|| "تم إلغاء هذا الترخيص من قبل إدارة النظام.".to_string());
            RemoteValidationResult::Revoked(msg)
        }
        // One server was NOT_FOUND while the other timed out/errored, OR both timed out/offline:
        // Do NOT revoke! The other database or internet might just be temporarily desynced/unreachable.
        _ => RemoteValidationResult::OfflineOrUncertain("تعذر التأكيد النهائي من جميع الخوادم (الاستمرار في وضع عدم الاتصال المعتمد)".to_string())
    }
}

/// Realtime Heartbeat: checks local vault and validates with server.
/// Offline-first: If server explicitly revokes or unbinds (HWID reset),
/// this locks the app. Otherwise, local cryptographic validity is honored.
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

    // 2. Query remote servers for live validation
    match query_remote_validation(&local_data.serial_key, &local_data.hwid) {
        RemoteValidationResult::Valid(client_name) => {
            LicenseStatus {
                is_licensed: true,
                client_name: client_name.or(Some(local_data.client_name)),
                serial_key: Some(local_data.serial_key),
                hwid: current_hwid,
                message: "الترخيص سارٍ ومفعّل.".to_string(),
            }
        }
        RemoteValidationResult::Revoked(reason_msg) => {
            // Authoritative Server Revocation: HWID was reset or license revoked by admin
            let lic_path = get_license_file_path();
            if lic_path.exists() {
                let _ = fs::remove_file(&lic_path);
            }

            LicenseStatus {
                is_licensed: false,
                client_name: None,
                serial_key: None,
                hwid: current_hwid,
                message: reason_msg,
            }
        }
        RemoteValidationResult::OfflineOrUncertain(_) => {
            // Graceful Offline Fallback:
            // Since local cryptographic signature & hardware binding are 100% valid,
            // allow the user to continue working offline peacefully.
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
    persist_hardware_id(&current_hwid);
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

    let mut last_error_msg: Option<String> = None;

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
                        persist_hardware_id(&current_hwid);
                        return Ok(LicenseStatus {
                            is_licensed: true,
                            client_name: Some(lic_data.client_name),
                            serial_key: Some(lic_data.serial_key),
                            hwid: current_hwid,
                            message: "تم تفعيل البرنامج بنجاح مدى الحياة لهذا الجهاز!".to_string(),
                        });
                    }
                } else if let Some(msg) = rpc_res.message {
                    last_error_msg = Some(msg);
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
        .send();

    if let Ok(res) = res {
        if res.status().is_success() {
            if let Ok(rpc_res) = res.json::<SupabaseRpcResponse>() {
                if rpc_res.success {
                    let lic_data = LicenseData {
                        serial_key: rpc_res.serial_key.unwrap_or(cleaned_serial),
                        client_name: rpc_res.client_name.unwrap_or_else(|| "العميل".to_string()),
                        hwid: rpc_res.hwid.unwrap_or_else(|| current_hwid.clone()),
                        activated_at: rpc_res.activated_at.unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
                        license_type: rpc_res.license_type.unwrap_or_else(|| "LIFETIME".to_string()),
                        signature: rpc_res.signature.ok_or("لم يرسل السيرفر توقيعاً رقمياً معتمداً.")?,
                    };

                    if verify_license_signature(&lic_data) {
                        save_local_license(&lic_data)?;
                        persist_hardware_id(&current_hwid);
                        return Ok(LicenseStatus {
                            is_licensed: true,
                            client_name: Some(lic_data.client_name),
                            serial_key: Some(lic_data.serial_key),
                            hwid: current_hwid,
                            message: "تم تفعيل البرنامج بنجاح مدى الحياة لهذا الجهاز!".to_string(),
                        });
                    }
                } else if let Some(msg) = rpc_res.message {
                    return Err(msg);
                }
            }
        }
    }

    Err(last_error_msg.unwrap_or_else(|| "فشل التفعيل. يرجى التأكد من صحة السيريال واتصال الإنترنت والمحاولة مرة أخرى.".to_string()))
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

