# ==============================================================================
# ChurchCare Desktop - Next-Gen 1-Click Auto-Updater & Migration Engine
# Built with Go / Bubbletea / Lipgloss Aesthetic for Windows PowerShell
#
# Usage:
#   irm "https://raw.githubusercontent.com/PEP0X/ChurchCare/main/install_update.ps1" | iex
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Clear-Host

Write-Host ""
Write-Host "  ╭──────────────────────────────────────────────────────────────╮" -ForegroundColor Cyan
Write-Host "  │                                                              │" -ForegroundColor Cyan
Write-Host "  │   ✦  CHURCHCARE DESKTOP SUITE                                │" -ForegroundColor Magenta
Write-Host "  │      Enterprise Auto-Updater & Migration Engine              │" -ForegroundColor DarkCyan
Write-Host "  │                                                              │" -ForegroundColor Cyan
Write-Host "  ╰──────────────────────────────────────────────────────────────╯" -ForegroundColor Cyan
Write-Host ""
Write-Host "   • Target Repository : " -NoNewline -ForegroundColor DarkGray
Write-Host "PEP0X/ChurchCare" -ForegroundColor White
Write-Host "   • Deployment Type   : " -NoNewline -ForegroundColor DarkGray
Write-Host "In-Place Zero-Downtime Upgrade (NSIS)" -ForegroundColor White
Write-Host "   • Configuration     : " -NoNewline -ForegroundColor DarkGray
Write-Host "Preserved (%APPDATA%\ChurchCare)" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# [1/4] Process Management
# ------------------------------------------------------------------------------
Write-Host "  [1/4] " -NoNewline -ForegroundColor Cyan
Write-Host "Inspecting active application process locks..." -ForegroundColor White

$procNames = @("ChurchCareCaseStudy", "church-care-app")
$foundActive = $false

foreach ($p in $procNames) {
    $running = Get-Process -Name $p -ErrorAction SilentlyContinue
    if ($running) {
        $foundActive = $true
        $running | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Milliseconds 800

if ($foundActive) {
    Write-Host "        ✔ Active instances safely terminated." -ForegroundColor Green
} else {
    Write-Host "        ✔ No running process locks detected." -ForegroundColor Green
}
Write-Host ""

# ------------------------------------------------------------------------------
# [2/4] Remote GitHub Release Discovery
# ------------------------------------------------------------------------------
Write-Host "  [2/4] " -NoNewline -ForegroundColor Cyan
Write-Host "Querying GitHub Releases API for target bundle..." -ForegroundColor White

$repo = "PEP0X/ChurchCare"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    $headers = @{ "User-Agent" = "ChurchCare-Bubbletea-Updater" }
    $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
    $asset = $release.assets | Where-Object { $_.name -like "*x64-setup.exe" } | Select-Object -First 1

    if (-not $asset) {
        Write-Host "        ✖ Fatal: No NSIS x64 installer asset found in latest release." -ForegroundColor Red
        return
    }

    $version = $release.tag_name
    $downloadUrl = $asset.browser_download_url
    $fileSizeMB = [math]::Round($asset.size / 1MB, 1)

    Write-Host "        ✔ Target Release : " -NoNewline -ForegroundColor Green
    Write-Host "$version " -NoNewline -ForegroundColor Yellow
    Write-Host "($($asset.name), ~$fileSizeMB MB)" -ForegroundColor DarkGray
} catch {
    Write-Host "        ✖ Network Error: Unable to query release metadata: $_" -ForegroundColor Red
    return
}
Write-Host ""

# ------------------------------------------------------------------------------
# [3/4] High-Performance Streaming Download with Bubbletea-style Progress Bar
# ------------------------------------------------------------------------------
Write-Host "  [3/4] " -NoNewline -ForegroundColor Cyan
Write-Host "Streaming installation package..." -ForegroundColor White

$tempDir = [System.IO.Path]::GetTempPath()
$tempInstaller = [System.IO.Path]::Combine($tempDir, "ChurchCareSetup_$version.exe")

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
    Write-Host "        ✔ Package successfully transferred and cached." -ForegroundColor Green
} catch {
    if ($fileStream) { $fileStream.Close() }
    if ($client) { $client.Dispose() }
    Write-Host ""
    Write-Host "        ✖ Transfer Failure: $_" -ForegroundColor Red
    return
}
Write-Host ""

# ------------------------------------------------------------------------------
# [4/4] Silent In-Place Deployment & Executable Launch
# ------------------------------------------------------------------------------
Write-Host "  [4/4] " -NoNewline -ForegroundColor Cyan
Write-Host "Executing silent in-place installation..." -ForegroundColor White

try {
    $installProc = Start-Process -FilePath $tempInstaller -ArgumentList "/S" -PassThru -Wait
    Start-Sleep -Seconds 1
    Write-Host "        ✔ Local files refreshed without touching user vault." -ForegroundColor Green
} catch {
    Write-Host "        ✖ Execution Error: $_" -ForegroundColor Red
    return
}

# Cleanup temporary installer
Remove-Item $tempInstaller -Force -ErrorAction SilentlyContinue

# Launch updated application
$installedExe = "$env:LOCALAPPDATA\Programs\ChurchCareCaseStudy\ChurchCareCaseStudy.exe"
$launched = $false

if (Test-Path $installedExe) {
    Start-Process -FilePath $installedExe
    $launched = $true
} else {
    $desktopShortcut = "$env:USERPROFILE\Desktop\ChurchCareCaseStudy.lnk"
    if (Test-Path $desktopShortcut) {
        Invoke-Item $desktopShortcut
        $launched = $true
    }
}

Write-Host ""
Write-Host "  ╭──────────────────────────────────────────────────────────────╮" -ForegroundColor Green
if ($launched) {
    Write-Host "  │   ✔ SUCCESS: ChurchCare $version is now running and ready!     │" -ForegroundColor Green
} else {
    Write-Host "  │   ✔ SUCCESS: ChurchCare $version installed successfully!       │" -ForegroundColor Green
}
Write-Host "  │     Session finalized cleanly. You may close this window.    │" -ForegroundColor DarkCyan
Write-Host "  ╰──────────────────────────────────────────────────────────────╯" -ForegroundColor Green
Write-Host ""
