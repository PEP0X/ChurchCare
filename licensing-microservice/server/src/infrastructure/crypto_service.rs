use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub const MASTER_SECRET: &str = "zkVv79AOxNrjyFVm/VtKToJJfrY1SnwXCYfjvgYb7jU=";

pub struct CryptoService;

impl CryptoService {
    /// Signs a license payload using HMAC-SHA256 and the server master secret
    pub fn sign_license(serial: &str, hwid: &str, client_name: &str) -> Result<String, String> {
        let mut mac = <HmacSha256 as Mac>::new_from_slice(MASTER_SECRET.as_bytes())
            .map_err(|e| format!("Crypto initialization error: {}", e))?;
        
        let payload = format!(
            "{}|{}|{}",
            serial.trim(),
            hwid.trim(),
            client_name.trim()
        );
        mac.update(payload.as_bytes());
        Ok(hex::encode(mac.finalize().into_bytes()))
    }

    /// Verifies if a given signature matches the license data
    #[allow(dead_code)]
    pub fn verify_signature(serial: &str, hwid: &str, client_name: &str, expected_sig: &str) -> bool {
        match Self::sign_license(serial, hwid, client_name) {
            Ok(sig) => sig.eq_ignore_ascii_case(expected_sig),
            Err(_) => false,
        }
    }
}
