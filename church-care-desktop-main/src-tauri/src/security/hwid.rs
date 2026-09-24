use std::process::Command;
use std::sync::OnceLock;
use std::path::PathBuf;
use std::fs;
use sha2::{Sha256, Digest};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

static CACHED_HWID: OnceLock<String> = OnceLock::new();

/// Returns the path to the machine-bound HWID vault cache
fn get_hwid_vault_path() -> PathBuf {
    if let Ok(app_data) = std::env::var("APPDATA") {
        let p = PathBuf::from(app_data).join("ChurchCare");
        let _ = fs::create_dir_all(&p);
        p.join(".hwid_vault")
    } else {
        PathBuf::from(".hwid_vault")
    }
}

/// Explicitly freezes and persists the HWID to disk for this machine
pub fn persist_hardware_id(hwid: &str) {
    let trimmed = hwid.trim();
    if trimmed.starts_with("HWID-") && trimmed.len() == 24 {
        let vault_path = get_hwid_vault_path();
        let _ = fs::write(&vault_path, trimmed);
    }
}

/// Extracts a unique, immutable Hardware Identifier (HWID) for this machine.
/// 1. Cached in-memory via OnceLock for 0ms subsequent checks.
/// 2. Persisted to disk (.hwid_vault) so it NEVER changes between reboots or slow WMI startups.
pub fn get_hardware_id() -> String {
    CACHED_HWID.get_or_init(|| {
        // 1. Try reading existing persisted HWID vault file
        let vault_path = get_hwid_vault_path();
        if let Ok(cached) = fs::read_to_string(&vault_path) {
            let trimmed = cached.trim();
            if trimmed.starts_with("HWID-") && trimmed.len() == 24 {
                return trimmed.to_string();
            }
        }

        // 2. Compute freshly using hardware probes
        let computed = compute_hardware_id();

        // 3. Persist to disk so it stays 100% deterministic and immutable across reboots
        let _ = fs::write(&vault_path, &computed);

        computed
    }).clone()
}

fn compute_hardware_id() -> String {
    let mut components = Vec::new();

    // 1. Motherboard UUID via PowerShell CIM query (Silent, Hidden window)
    // Retry once if WMI is starting up slowly during Windows boot
    for _ in 0..2 {
        let mut ps_cmd = Command::new("powershell");
        #[cfg(windows)]
        ps_cmd.creation_flags(CREATE_NO_WINDOW);
        if let Ok(output) = ps_cmd
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "(Get-CimInstance Win32_ComputerSystemProduct).UUID"])
            .output()
        {
            let uuid = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !uuid.is_empty() && uuid != "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF" {
                components.push(format!("UUID:{}", uuid));
                break;
            }
        }
    }

    // 2. Windows Cryptography MachineGuid via reg query (Silent, No window)
    let mut reg_cmd = Command::new("reg");
    #[cfg(windows)]
    reg_cmd.creation_flags(CREATE_NO_WINDOW);
    if let Ok(output) = reg_cmd
        .args(["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
        .output()
    {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            if line.contains("MachineGuid") {
                if let Some(guid) = line.split_whitespace().last() {
                    components.push(format!("GUID:{}", guid.trim()));
                    break;
                }
            }
        }
    }

    // 3. Volume Serial Number for Drive C: (Silent, No window)
    let mut cmd_proc = Command::new("cmd");
    #[cfg(windows)]
    cmd_proc.creation_flags(CREATE_NO_WINDOW);
    if let Ok(output) = cmd_proc
        .args(["/c", "vol", "C:"])
        .output()
    {
        let text = String::from_utf8_lossy(&output.stdout);
        let mut found = false;
        for line in text.lines() {
            if line.contains("Serial Number is") || line.contains("الرقم التسلسلي لوحدة التخزين") {
                if let Some(sn) = line.split("is ").nth(1).or_else(|| line.split_whitespace().last()) {
                    components.push(format!("VOL:{}", sn.trim()));
                    found = true;
                    break;
                }
            }
        }
        // Universal fallback for any OS language: match 4hex-4hex pattern (e.g. 1A2B-3C4D)
        if !found {
            for word in text.split_whitespace() {
                let trimmed = word.trim();
                if trimmed.len() == 9 
                    && trimmed.chars().nth(4) == Some('-')
                    && trimmed.chars().all(|c| c.is_ascii_hexdigit() || c == '-') 
                {
                    components.push(format!("VOL:{}", trimmed));
                    break;
                }
            }
        }
    }

    // 4. Processor Identifier environment variable
    if let Ok(cpu_id) = std::env::var("PROCESSOR_IDENTIFIER") {
        components.push(format!("CPU:{}", cpu_id.trim()));
    }

    // Fallback if everything failed (unlikely on Windows)
    if components.is_empty() {
        if let Ok(computer_name) = std::env::var("COMPUTERNAME") {
            components.push(format!("PC:{}", computer_name));
        } else {
            components.push("FALLBACK_GENERIC_MACHINE".to_string());
        }
    }

    // Hash all components together using SHA-256
    let combined_data = components.join("|");
    let mut hasher = Sha256::new();
    hasher.update(combined_data.as_bytes());
    let result = hasher.finalize();
    let hex_hash = hex::encode(result).to_uppercase();

    // Format as HWID-XXXX-XXXX-XXXX-XXXX (16 chars entropy)
    format!(
        "HWID-{}-{}-{}-{}",
        &hex_hash[0..4],
        &hex_hash[4..8],
        &hex_hash[8..12],
        &hex_hash[12..16]
    )
}
