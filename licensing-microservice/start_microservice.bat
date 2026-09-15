@echo off
title ChurchCare Licensing Microservice & Svelte Dashboard
color 0b

echo ============================================================
echo   ChurchCare Licensing Microservice & Svelte Dashboard
echo ============================================================
echo.

:: 1. تشغيل خادم الـ Rust Microservice في نافذة مستقلة
echo [*] Starting Rust Backend Microservice on port 4040...
start "ChurchCare Rust Microservice (Port 4040)" cmd /k "cd /d %~dp0server && cargo run"

:: انتظر 2 ثانية لضمان إقلاع الخادم
timeout /t 2 /nobreak > nul

:: 2. تشغيل لوحة تحكم Svelte وفتح المتصفح تلقائياً
echo [*] Starting Svelte 5 Dashboard on port 5173...
cd /d %~dp0dashboard
npm run dev -- --open
