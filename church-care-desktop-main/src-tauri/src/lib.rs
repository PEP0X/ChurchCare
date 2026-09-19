mod security;

#[tauri::command]
fn get_device_hwid() -> String {
    security::hwid::get_hardware_id()
}

#[tauri::command]
fn check_license_status() -> security::licensing::LicenseStatus {
    security::licensing::check_local_license()
}

#[tauri::command]
async fn check_license_heartbeat() -> security::licensing::LicenseStatus {
    tauri::async_runtime::spawn_blocking(security::licensing::check_license_heartbeat)
        .await
        .unwrap_or_else(|_| security::licensing::check_local_license())
}

#[tauri::command]
async fn activate_license_online(serial: String) -> Result<security::licensing::LicenseStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        security::licensing::activate_license_online(&serial)
    })
    .await
    .map_err(|e| format!("خطأ في معالجة الاتصال: {}", e))?
}

#[tauri::command]
fn save_layout_file(json_content: String) -> Result<String, String> {
    let lic_status = security::licensing::check_local_license();
    if !lic_status.is_licensed {
        return Err("تنبيه أمني: البرنامج غير مرخص. يرجى تفعيل البرنامج أولاً.".to_string());
    }

    use std::fs;
    use std::path::Path;

    let target_paths = [
        "src/config/document_layout.json",
        "engine/document_layout.json",
        "../src/config/document_layout.json",
        "../engine/document_layout.json",
    ];

    for path_str in target_paths {
        let p = Path::new(path_str);
        if let Some(parent) = p.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(p, &json_content);
    }

    Ok("تم حفظ ملف الإحداثيات بنجاح في جميع مسارات المشروع!".to_string())
}

#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<String, String> {
    let lic_status = security::licensing::check_local_license();
    if !lic_status.is_licensed {
        return Err("تنبيه أمني: البرنامج غير مرخص. يرجى تفعيل البرنامج أولاً.".to_string());
    }

    use std::fs;
    fs::write(&path, content).map_err(|e| format!("فشل حفظ الملف: {}", e))?;
    Ok(path)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let lic_status = security::licensing::check_local_license();
    if !lic_status.is_licensed {
        return Err("تنبيه أمني: البرنامج غير مرخص. يرجى تفعيل البرنامج أولاً.".to_string());
    }

    use std::fs;
    fs::read_to_string(&path).map_err(|e| format!("فشل قراءة الملف: {}", e))
}

#[tauri::command]
fn read_image_data_url(path: String) -> Result<String, String> {
    let lic_status = security::licensing::check_local_license();
    if !lic_status.is_licensed {
        return Err("تنبيه أمني: البرنامج غير مرخص. يرجى تفعيل البرنامج أولاً.".to_string());
    }

    use std::fs;
    use base64::Engine;
    let bytes = fs::read(&path).map_err(|e| format!("فشل قراءة ملف الصورة: {}", e))?;
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("jpeg")
        .to_lowercase();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        _ => "image/jpeg",
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
fn generate_pdf_engine(payload: String) -> Result<String, String> {
    // 🛡️ SECURITY GUARD: Block PDF generation if license is invalid
    let lic_status = security::licensing::check_local_license();
    if !lic_status.is_licensed {
        return Err("تنبيه أمني: البرنامج غير مرخص أو تم التلاعب ببيانات الترخيص. يرجى تفعيل البرنامج أولاً.".to_string());
    }

    use std::io::Write;
    use std::process::{Command, Stdio};
    use std::path::PathBuf;

    // Candidate paths for the engine binary or script
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    let candidates = [
        // Adjacent to executable (packaged app)
        exe_dir.join("engine.exe"),
        exe_dir.join("engine"),
        exe_dir.join("engine-x86_64-pc-windows-msvc.exe"),
        exe_dir.join("engine-aarch64-apple-darwin"),
        exe_dir.join("../Resources/binaries/engine-aarch64-apple-darwin"),
        // Relative to project root / dev mode
        PathBuf::from("src-tauri/binaries/engine-x86_64-pc-windows-msvc.exe"),
        PathBuf::from("src-tauri/binaries/engine-aarch64-apple-darwin"),
        PathBuf::from("binaries/engine-x86_64-pc-windows-msvc.exe"),
        PathBuf::from("binaries/engine-aarch64-apple-darwin"),
        PathBuf::from("../src-tauri/binaries/engine-x86_64-pc-windows-msvc.exe"),
        PathBuf::from("../src-tauri/binaries/engine-aarch64-apple-darwin"),
    ];

    let mut binary_path: Option<PathBuf> = None;
    for c in &candidates {
        if c.exists() {
            binary_path = Some(c.clone());
            break;
        }
    }

    // Resolve template PDF path candidates
    let template_filename = "بحث أخوة الرب 2026 V3.pdf";
    let template_candidates = [
        PathBuf::from(template_filename),
        PathBuf::from(format!("../{}", template_filename)),
        exe_dir.join(template_filename),
        exe_dir.join("resources").join(template_filename),
        exe_dir.join("../resources").join(template_filename),
        exe_dir.join("../Resources").join(template_filename),
    ];
    let found_template = template_candidates.iter().find(|p| p.exists()).cloned();

    #[cfg(windows)]
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    // Helper closure to inject standard environment variables and silent flags into Command
    let configure_cmd = |mut cmd: Command| -> Command {
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.env("PYTHONIOENCODING", "utf-8")
           .env("PYTHONUTF8", "1");
        if let Some(ref t_path) = found_template {
            if let Ok(abs_path) = std::fs::canonicalize(t_path) {
                cmd.env("TEMPLATE_PDF_PATH", abs_path);
            } else {
                cmd.env("TEMPLATE_PDF_PATH", t_path);
            }
        }
        cmd
    };

    // Candidate paths for the engine Python script
    let python_candidates = [
        PathBuf::from("engine/engine.py"),
        PathBuf::from("../engine/engine.py"),
    ];
    let py_script = python_candidates.iter().find(|p| p.exists()).cloned();

    // Detect python executable (python / py / python3)
    let python_cmds = if cfg!(target_os = "windows") {
        vec!["python", "py", "python3"]
    } else {
        vec!["python3", "python"]
    };
    let python_cmd = python_cmds.into_iter().find(|cmd| {
        let mut c = Command::new(cmd);
        #[cfg(windows)]
        c.creation_flags(CREATE_NO_WINDOW);
        c.arg("--version").output().is_ok()
    }).unwrap_or(if cfg!(target_os = "windows") { "python" } else { "python3" });

    // Check for uv to enable lightning-fast live execution of engine.py in dev mode
    let uv_candidates = [
        "uv",
        "/opt/homebrew/bin/uv",
        "/usr/local/bin/uv",
    ];
    let uv_path = uv_candidates.iter().find(|p| {
        let mut c = Command::new(p);
        #[cfg(windows)]
        c.creation_flags(CREATE_NO_WINDOW);
        c.arg("--version").output().is_ok()
    }).cloned();

    let mut child = if let (Some(uv), Some(script)) = (uv_path, &py_script) {
        let mut cmd = Command::new(uv);
        cmd.args(["run", "--with", "pymupdf,arabic-reshaper,python-bidi,pillow", python_cmd, script.to_str().unwrap()]);
        configure_cmd(cmd)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .or_else(|_| {
                if let Some(bin) = &binary_path {
                    let cmd_bin = Command::new(bin);
                    configure_cmd(cmd_bin)
                        .stdin(Stdio::piped())
                        .stdout(Stdio::piped())
                        .stderr(Stdio::piped())
                        .spawn()
                } else {
                    let mut cmd_py = Command::new(python_cmd);
                    cmd_py.arg(script.to_str().unwrap());
                    configure_cmd(cmd_py)
                        .stdin(Stdio::piped())
                        .stdout(Stdio::piped())
                        .stderr(Stdio::piped())
                        .spawn()
                }
            })
            .map_err(|e| format!("فشل تشغيل محرك PDF: {}", e))?
    } else if let Some(bin) = binary_path {
        let cmd_bin = Command::new(bin);
        configure_cmd(cmd_bin)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("فشل تشغيل محرك PDF المدمج: {}", e))?
    } else if let Some(script) = py_script {
        let mut cmd_py = Command::new(python_cmd);
        cmd_py.arg(script.to_str().unwrap());
        configure_cmd(cmd_py)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("فشل تشغيل سكريبت Python: {}", e))?
    } else {
        return Err("لم يتم العثور على محرك PDF أو السكريبت الخاص به".to_string());
    };

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(payload.as_bytes()).map_err(|e| e.to_string())?;
        stdin.write_all(b"\n").map_err(|e| e.to_string())?;
        let _ = stdin.flush();
        drop(stdin);
    }

    let output = child.wait_with_output().map_err(|e| format!("خطأ في انتظار محرك PDF: {}", e))?;

    let stdout_str = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() && stdout_str.trim().is_empty() {
        return Err(format!("خطأ في محرك PDF: {}", stderr_str));
    }

    // Look for JSON-RPC response in stdout lines
    for line in stdout_str.lines().rev() {
        let trimmed = line.trim();
        if trimmed.starts_with('{') && trimmed.ends_with('}') {
            return Ok(trimmed.to_string());
        }
    }

    if !stdout_str.trim().is_empty() {
        Ok(stdout_str)
    } else {
        Err(format!("لم يتم استلام رد من محرك PDF. سجل الأخطاء: {}", stderr_str))
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_layout_file,
            generate_pdf_engine,
            save_text_file,
            read_text_file,
            read_image_data_url,
            get_device_hwid,
            check_license_status,
            check_license_heartbeat,
            activate_license_online
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
