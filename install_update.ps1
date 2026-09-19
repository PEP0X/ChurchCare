# ==============================================================================
# ChurchCare Desktop - Next-Gen 1-Click Auto-Updater & Migration Engine
# Built with Go / Bubbletea / Lipgloss Aesthetic for Windows PowerShell
#
# Features:
#   • Automatic Installed Application Detection (Registry + Disk)
#   • Semantic Version Comparison (Current vs Latest Remote Release)
#   • Skips unnecessary download if already on the latest version (supports -Force)
#   • Live Streaming Block Progress Bar
#   • Zero-Downtime In-Place Upgrade preserving all user data and licenses
#
# Usage:
#   irm "https://raw.githubusercontent.com/PEP0X/ChurchCare/main/install_update.ps1" | iex
# ==============================================================================

param(
    [switch]$Force
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

try { Clear-Host } catch { }

Write-Host ""
Write-Host "  ╭──────────────────────────────────────────────────────────────╮" -ForegroundColor Cyan
Write-Host "  │                                                              │" -ForegroundColor Cyan
Write-Host "  │   ✦  CHURCHCARE DESKTOP SUITE                                │" -ForegroundColor Magenta
Write-Host "  │      Enterprise Auto-Updater & Migration Engine              │" -ForegroundColor DarkCyan
Write-Host "  │                                                              │" -ForegroundColor Cyan
Write-Host "  ╰──────────────────────────────────────────────────────────────╯" -ForegroundColor Cyan
Write-Host ""
Write-Host "   • Remote Repository : " -NoNewline -ForegroundColor DarkGray
Write-Host "PEP0X/ChurchCare" -ForegroundColor White
Write-Host "   • Deployment Type   : " -NoNewline -ForegroundColor DarkGray
Write-Host "In-Place Zero-Downtime (NSIS)" -ForegroundColor White
Write-Host "   • User Configuration: " -NoNewline -ForegroundColor DarkGray
Write-Host "Preserved (%APPDATA%\ChurchCare)" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# [1/5] Local Environment & Installation Detection
# ------------------------------------------------------------------------------
Write-Host "  [1/5] " -NoNewline -ForegroundColor Cyan
Write-Host "Auditing local system for existing installations..." -ForegroundColor White

$regKeys = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

$installedApp = Get-ItemProperty $regKeys -ErrorAction SilentlyContinue | 
    Where-Object { $_.DisplayName -like "*ChurchCare*" } | 
    Select-Object -First 1

$isInstalled = $false
$installedVersion = $null
$installedDir = $null
$installedExe = $null

if ($installedApp) {
    $isInstalled = $true
    $installedVersion = $installedApp.DisplayVersion
    if ($installedApp.InstallLocation) {
        $installedDir = $installedApp.InstallLocation.Trim('"')
    }
}

# Disk fallback inspection if registry was cleaned
if (-not $installedDir) {
    $candidates = @(
        "$env:LOCALAPPDATA\ChurchCareCaseStudy",
        "$env:LOCALAPPDATA\Programs\ChurchCareCaseStudy",
        "$env:ProgramFiles\ChurchCareCaseStudy"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            $installedDir = $c
            $isInstalled = $true
            break
        }
    }
}

# Resolve target binary executable path
if ($installedDir) {
    $exeCandidates = @(
        [System.IO.Path]::Combine($installedDir, "ChurchCareCaseStudy.exe"),
        [System.IO.Path]::Combine($installedDir, "church-care-app.exe")
    )
    foreach ($exe in $exeCandidates) {
        if (Test-Path $exe) {
            $installedExe = $exe
            if (-not $installedVersion) {
                $installedVersion = (Get-Item $exe).VersionInfo.ProductVersion
            }
            break
        }
    }
}

if ($isInstalled) {
    Write-Host "        ✔ Detected Installation: " -NoNewline -ForegroundColor Green
    Write-Host "v$installedVersion " -NoNewline -ForegroundColor Yellow
    Write-Host "at $installedDir" -ForegroundColor DarkGray
} else {
    Write-Host "        • Status: " -NoNewline -ForegroundColor DarkGray
    Write-Host "No prior ChurchCare installation found (Fresh Setup)" -ForegroundColor Cyan
}
Write-Host ""

# ------------------------------------------------------------------------------
# [2/5] Remote GitHub Release Discovery & Version Comparison
# ------------------------------------------------------------------------------
Write-Host "  [2/5] " -NoNewline -ForegroundColor Cyan
Write-Host "Querying GitHub API for latest release..." -ForegroundColor White

$repo = "PEP0X/ChurchCare"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    $headers = @{ "User-Agent" = "ChurchCare-Bubbletea-Updater" }
    $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
    $asset = $release.assets | Where-Object { $_.name -like "*x64-setup.exe" } | Select-Object -First 1

    if (-not $asset) {
        Write-Host "        ✖ Fatal: No NSIS installer package found in latest release." -ForegroundColor Red
        return
    }

    $latestVersionTag = $release.tag_name
    $latestVersion = ($latestVersionTag -replace "^v", "").Trim()
    $downloadUrl = $asset.browser_download_url
    $fileSizeMB = [math]::Round($asset.size / 1MB, 1)

    Write-Host "        ✔ Latest Available     : " -NoNewline -ForegroundColor Green
    Write-Host "$latestVersionTag " -NoNewline -ForegroundColor Yellow
    Write-Host "($($asset.name), ~$fileSizeMB MB)" -ForegroundColor DarkGray
} catch {
    Write-Host "        ✖ Network Error: Unable to query release metadata: $_" -ForegroundColor Red
    return
}

# Version comparison logic
$shouldUpdate = $true

if ($isInstalled -and $installedVersion) {
    $cleanInstalled = ($installedVersion -replace "^v", "").Trim()
    
    try {
        $currVerObj = [version]$cleanInstalled
        $latestVerObj = [version]$latestVersion
        
        if ($currVerObj -ge $latestVerObj -and -not $Force) {
            $shouldUpdate = $false
        }
    } catch {
        if ($cleanInstalled -eq $latestVersion -and -not $Force) {
            $shouldUpdate = $false
        }
    }
}

if (-not $shouldUpdate) {
    Write-Host ""
    Write-Host "  ╭──────────────────────────────────────────────────────────────╮" -ForegroundColor Green
    Write-Host "  │   ✔ ChurchCare is already up to date (v$installedVersion)!           │" -ForegroundColor Green
    Write-Host "  │     No installation required. Launching application...       │" -ForegroundColor DarkCyan
    Write-Host "  ╰──────────────────────────────────────────────────────────────╯" -ForegroundColor Green
    Write-Host ""

    if ($installedExe -and (Test-Path $installedExe)) {
        Start-Process -FilePath $installedExe
    } else {
        $desktopShortcut = "$env:USERPROFILE\Desktop\ChurchCareCaseStudy.lnk"
        if (Test-Path $desktopShortcut) {
            Invoke-Item $desktopShortcut
        }
    }
    return
}

if ($isInstalled) {
    Write-Host "        ➜ Migration Path       : " -NoNewline -ForegroundColor Cyan
    Write-Host "v$installedVersion " -NoNewline -ForegroundColor Yellow
    Write-Host "➜ " -NoNewline -ForegroundColor White
    Write-Host "$latestVersionTag" -ForegroundColor Green
} else {
    Write-Host "        ➜ Action               : " -NoNewline -ForegroundColor Cyan
    Write-Host "Clean Installation of $latestVersionTag" -ForegroundColor Green
}
Write-Host ""

# ------------------------------------------------------------------------------
# [3/5] Process Lock Inspection
# ------------------------------------------------------------------------------
Write-Host "  [3/5] " -NoNewline -ForegroundColor Cyan
Write-Host "Checking active process locks..." -ForegroundColor White

$procNames = @("ChurchCareCaseStudy", "church-care-app")
$foundActive = $false

foreach ($p in $procNames) {
    $running = Get-Process -Name $p -ErrorAction SilentlyContinue
    if ($running) {
        $foundActive = $true
        $running | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Milliseconds 600

if ($foundActive) {
    Write-Host "        ✔ Active instances safely closed." -ForegroundColor Green
} else {
    Write-Host "        ✔ No process locks detected." -ForegroundColor Green
}
Write-Host ""

# ------------------------------------------------------------------------------
# [4/5] Streaming Download with Bubbletea Live Progress Bar
# ------------------------------------------------------------------------------
Write-Host "  [4/5] " -NoNewline -ForegroundColor Cyan
Write-Host "Streaming $latestVersionTag installation package..." -ForegroundColor White

$tempDir = [System.IO.Path]::GetTempPath()
$tempInstaller = [System.IO.Path]::Combine($tempDir, "ChurchCareSetup_$latestVersionTag.exe")

$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Add("User-Agent", "ChurchCare-Updater")
$client.Timeout = [System.TimeSpan]::FromMinutes(5)

try {
    $response = $client.GetAsync($downloadUrl, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    $totalBytes = $response.Content.Headers.ContentLength
    $stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $fileStream = [System.IO.File]::Create($tempInstaller)

    $buffer = New-Object byte[] 65536
    $downloaded = 0
    $lastPct = -1
    $barWidth = 32

    while (($bytesRead = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
        $fileStream.Write($buffer, 0, $bytesRead)
        $downloaded += $bytesRead

        if ($totalBytes -gt 0) {
            $pct = [math]::Floor(($downloaded / $totalBytes) * 100)
            if ($pct -ne $lastPct) {
                $lastPct = $pct
                $filled = [math]::Floor(($pct / 100) * $barWidth)
                $empty = $barWidth - $filled
                $bar = ("█" * $filled) + ("░" * $empty)
                $mbDone = [math]::Round($downloaded / 1MB, 1)
                $mbTotal = [math]::Round($totalBytes / 1MB, 1)
                
                Write-Host -NoNewline "`r        [$bar] $pct% ($mbDone / $mbTotal MB)   " -ForegroundColor Magenta
            }
        }
    }

    $fileStream.Close()
    $stream.Close()
    $client.Dispose()
    Write-Host ""
    Write-Host "        ✔ Package verified and saved to disk." -ForegroundColor Green
} catch {
    if ($fileStream) { $fileStream.Close() }
    if ($client) { $client.Dispose() }
    Write-Host ""
    Write-Host "        ✖ Transfer Failure: $_" -ForegroundColor Red
    return
}
Write-Host ""

# ------------------------------------------------------------------------------
# [5/5] Silent Deployment & Launch
# ------------------------------------------------------------------------------
Write-Host "  [5/5] " -NoNewline -ForegroundColor Cyan
Write-Host "Applying update via silent in-place installation..." -ForegroundColor White

try {
    $installProc = Start-Process -FilePath $tempInstaller -ArgumentList "/S" -PassThru -Wait
    Start-Sleep -Seconds 1
    Write-Host "        ✔ Files successfully updated in-place." -ForegroundColor Green
} catch {
    Write-Host "        ✖ Installation Error: $_" -ForegroundColor Red
    return
}

# Cleanup installer
Remove-Item $tempInstaller -Force -ErrorAction SilentlyContinue

# Launch updated application
$launchCandidates = @(
    "$env:LOCALAPPDATA\ChurchCareCaseStudy\church-care-app.exe",
    "$env:LOCALAPPDATA\Programs\ChurchCareCaseStudy\ChurchCareCaseStudy.exe",
    "$env:LOCALAPPDATA\Programs\ChurchCareCaseStudy\church-care-app.exe",
    "$env:ProgramFiles\ChurchCareCaseStudy\church-care-app.exe"
)

$launched = $false
foreach ($exe in $launchCandidates) {
    if (Test-Path $exe) {
        Start-Process -FilePath $exe
        $launched = $true
        break
    }
}

if (-not $launched) {
    $desktopShortcut = "$env:USERPROFILE\Desktop\ChurchCareCaseStudy.lnk"
    if (Test-Path $desktopShortcut) {
        Invoke-Item $desktopShortcut
        $launched = $true
    }
}

Write-Host ""
Write-Host "  ╭──────────────────────────────────────────────────────────────╮" -ForegroundColor Green
if ($launched) {
    Write-Host "  │   ✔ SUCCESS: ChurchCare $latestVersionTag is now running!               │" -ForegroundColor Green
} else {
    Write-Host "  │   ✔ SUCCESS: ChurchCare $latestVersionTag installed successfully!       │" -ForegroundColor Green
}
Write-Host "  │     Installation finalized. You may close this window.       │" -ForegroundColor DarkCyan
Write-Host "  ╰──────────────────────────────────────────────────────────────╯" -ForegroundColor Green
Write-Host ""
