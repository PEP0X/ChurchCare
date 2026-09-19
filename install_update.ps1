# ChurchCare Desktop - 1-Click Silent Auto-Updater
# Usage in PowerShell:
# irm "https://raw.githubusercontent.com/PEP0X/ChurchCare/main/install_update.ps1" | iex

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ChurchCare Desktop - جاري تحديث البرنامج" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Close any running instances of ChurchCare
Write-Host "[1/4] إغلاق أي نسخ مفتوحة من البرنامج..." -ForegroundColor White
Get-Process -Name "ChurchCareCaseStudy", "church-care-app" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Fetch the latest release installer URL from GitHub
Write-Host "[2/4] جلب رابط أحدث إصدار من سيرفرات GitHub..." -ForegroundColor White
$repo = "PEP0X/ChurchCare"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    $release = Invoke-RestMethod -Uri $apiUrl -Method Get
    $asset = $release.assets | Where-Object { $_.name -like "*x64-setup.exe" } | Select-Object -First 1
    
    if (-not $asset) {
        Write-Host "[-] لم يتم العثور على ملف التثبيت في أحدث Release." -ForegroundColor Red
        return
    }
    
    $downloadUrl = $asset.browser_download_url
    $version = $release.tag_name
    Write-Host "[+] تم العثور على الإصدار: $version" -ForegroundColor Green
} catch {
    Write-Host "[-] فشل الاتصال بسيرفرات GitHub: $_" -ForegroundColor Red
    return
}

# 3. Download the installer to Temp folder
$tempInstaller = "$env:TEMP\ChurchCareSetup_$version.exe"
Write-Host "[3/4] جاري تحميل التحديث ($($asset.name))..." -ForegroundColor White
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempInstaller

# 4. Perform silent in-place installation
Write-Host "[4/4] جاري تثبيت التحديث بهدوء (دون مساس بالبيانات أو الترخيص)..." -ForegroundColor White
$installProcess = Start-Process -FilePath $tempInstaller -ArgumentList "/S" -PassThru -Wait

# 5. Launch the updated application
Write-Host "[✓] تم التحديث بنجاح! جاري فتح البرنامج الآن..." -ForegroundColor Green
$installedExe = "$env:LOCALAPPDATA\Programs\ChurchCareCaseStudy\ChurchCareCaseStudy.exe"

if (Test-Path $installedExe) {
    Start-Process -FilePath $installedExe
} else {
    # Check Desktop shortcut
    $desktopShortcut = "$env:USERPROFILE\Desktop\ChurchCareCaseStudy.lnk"
    if (Test-Path $desktopShortcut) {
        Invoke-Item $desktopShortcut
    }
}

# Cleanup installer
Remove-Item $tempInstaller -Force -ErrorAction SilentlyContinue
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   اكتمل التحديث بنجاح! يمكنك إغلاق النافذة." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
