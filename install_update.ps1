# ChurchCare Desktop - 1-Click Silent Auto-Updater
# Usage in PowerShell:
# irm "https://raw.githubusercontent.com/PEP0X/ChurchCare/main/install_update.ps1" | iex

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ChurchCare Desktop - Updating System   " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Close any running instances of ChurchCare
Write-Host "[1/4] Closing any active ChurchCare instances..." -ForegroundColor White
Get-Process -Name "ChurchCareCaseStudy", "church-care-app" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Fetch the latest release installer URL from GitHub
Write-Host "[2/4] Checking latest release from GitHub..." -ForegroundColor White
$repo = "PEP0X/ChurchCare"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    $headers = @{ "User-Agent" = "ChurchCare-Updater" }
    $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
    $asset = $release.assets | Where-Object { $_.name -like "*x64-setup.exe" } | Select-Object -First 1
    
    if (-not $asset) {
        Write-Host "[-] Error: Installer asset not found in latest release." -ForegroundColor Red
        return
    }
    
    $downloadUrl = $asset.browser_download_url
    $version = $release.tag_name
    Write-Host "[+] Found latest release version: $version" -ForegroundColor Green
} catch {
    Write-Host "[-] Error connecting to GitHub servers: $_" -ForegroundColor Red
    return
}

# 3. Download the installer to Temp folder
$tempInstaller = "$env:TEMP\ChurchCareSetup_$version.exe"
Write-Host "[3/4] Downloading update package ($($asset.name))..." -ForegroundColor White
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempInstaller

# 4. Perform silent in-place installation
Write-Host "[4/4] Installing update silently (preserving data & license)..." -ForegroundColor White
$installProcess = Start-Process -FilePath $tempInstaller -ArgumentList "/S" -PassThru -Wait

# 5. Launch the updated application
Write-Host "[+] Update installed successfully! Launching ChurchCare..." -ForegroundColor Green
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
Write-Host "   Update completed! You may close this.  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
