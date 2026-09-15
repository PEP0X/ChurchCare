#!/usr/bin/env python3
"""
Sidecar Compiler for Tauri v2
Freezes `engine.py` using PyInstaller into `src-tauri/binaries/engine-<target-triple>`
Automatically finds `uv` or the active Python environment.
"""

import os
import sys
import shutil
import subprocess
import platform

def get_target_triple() -> str:
    """Returns the Tauri-compatible target triple for the current system."""
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "darwin":
        arch = "aarch64" if machine in ["arm64", "aarch64"] else "x86_64"
        return f"{arch}-apple-darwin"
    elif system == "windows":
        return "x86_64-pc-windows-msvc"
    elif system == "linux":
        arch = "aarch64" if machine in ["arm64", "aarch64"] else "x86_64"
        return f"{arch}-unknown-linux-gnu"
    else:
        raise OSError(f"Unsupported OS: {system}")

def find_uv() -> str:
    for path in [
        shutil.which("uv"),
        os.path.expanduser("~/.local/bin/uv"),
        "/usr/local/bin/uv",
        "/opt/homebrew/bin/uv"
    ]:
        if path and os.path.exists(path):
            return path
    return ""

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(base_dir, ".."))
    engine_script = os.path.join(base_dir, "engine.py")
    fonts_dir = os.path.join(base_dir, "fonts")
    
    triple = get_target_triple()
    bin_name = f"engine-{triple}"
    output_dir = os.path.join(project_root, "src-tauri", "binaries")
    os.makedirs(output_dir, exist_ok=True)

    is_windows = platform.system().lower() == "windows"
    expected_bin = os.path.join(output_dir, f"{bin_name}.exe" if is_windows else bin_name)

    print(f"[*] Building Tauri v2 sidecar for target: {triple}")
    print(f"[*] Output binary destination: {expected_bin}")

    sep = os.pathsep  # ';' on Windows, ':' on Unix
    layout_file = os.path.join(base_dir, "document_layout.json")
    template_pdf = os.path.join(project_root, "بحث أخوة الرب 2026 V3.pdf")

    add_data_args = [
        f"--add-data={fonts_dir}{sep}fonts",
    ]
    if os.path.exists(layout_file):
        add_data_args.append(f"--add-data={layout_file}{sep}.")
    if os.path.exists(template_pdf):
        add_data_args.append(f"--add-data={template_pdf}{sep}.")

    uv_path = find_uv()

    if uv_path:
        print(f"[*] Using ultra-fast uv packager at: {uv_path}")
        cmd = [
            uv_path, "run",
            "--with", "pyinstaller,pymupdf,arabic-reshaper,python-bidi,pillow",
            "pyinstaller",
            "--clean",
            "--noconfirm",
            "--onefile",
            "--noconsole",
            f"--name={bin_name}",
            f"--distpath={output_dir}",
            *add_data_args,
            "--hidden-import=pymupdf",
            "--hidden-import=arabic_reshaper",
            "--hidden-import=bidi",
            "--hidden-import=PIL",
            engine_script
        ]
    else:
        # Fallback to current python
        print(f"[*] Using Python: {sys.executable}")
        cmd = [
            sys.executable, "-m", "PyInstaller",
            "--clean",
            "--noconfirm",
            "--onefile",
            "--noconsole",
            f"--name={bin_name}",
            f"--distpath={output_dir}",
            *add_data_args,
            "--hidden-import=pymupdf",
            "--hidden-import=arabic_reshaper",
            "--hidden-import=bidi",
            "--hidden-import=PIL",
            engine_script
        ]

    print("[*] Executing build command...")
    res = subprocess.run(cmd, cwd=project_root)
    if res.returncode == 0:
        print(f"[+] Successfully compiled sidecar: {expected_bin}")
    else:
        print(f"[-] Compilation failed with exit code {res.returncode}")
        sys.exit(res.returncode)

if __name__ == "__main__":
    main()
