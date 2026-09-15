use std::process::Command;
use std::sync::OnceLock;
use sha2::{Sha256, Digest};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

static CACHED_HWID: OnceLock<String> = OnceLock::new();

/// Extracts a unique, immutable Hardware Identifier (HWID) for this machine.
/// Cached in memory so subsequent checks (like heartbeats) are instantaneous and
/// do not spawn background CLI processes.
pub fn get_hardware_id() -> String {
    CACHED_HWID.get_or_init(|| {
        compute_hardware_id()
    }).clone()
}

fn compute_hardware_id() -> String {
    let mut components = Vec::new();

    // 1. Motherboard UUID via PowerShell CIM query (Silent, Hidden window)
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
        for line in text.lines() {
            if line.contains("Serial Number is") || line.contains("الرقم التسلسلي لوحدة التخزين") {
                if let Some(sn) = line.split("is ").nth(1).or_else(|| line.split_whitespace().last()) {
                    components.push(format!("VOL:{}", sn.trim()));
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
