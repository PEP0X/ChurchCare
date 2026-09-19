#Requires -Version 5.1
<#
================================================================================
 ChurchCare Desktop - Installer / Updater  (v2)
================================================================================
 Quick run (defaults):
   irm "https://raw.githubusercontent.com/PEP0X/ChurchCare/main/install_update.ps1" | iex

 Run WITH parameters (irm | iex cannot pass params, use this form):
   & ([scriptblock]::Create((irm "https://raw.githubusercontent.com/PEP0X/ChurchCare/main/install_update.ps1"))) -Force

 Parameters:
   -Force        Reinstall even if the installed version is already the latest
   -Prerelease   Consider pre-releases as update candidates
   -Version      Install an exact release tag (e.g. -Version v1.4.2)
   -NoLaunch     Do not start the app after installing
   -SkipBackup   Do not snapshot %APPDATA%\ChurchCare before installing
   -DryRun       Do everything except running the installer
   -Ascii        Force ASCII glyphs (legacy consoles)
   -NoColor      Disable ANSI colors
   -Quiet        Minimal, log-friendly output (no animation, no color)

 Exit status is written to $global:LASTEXITCODE:
   0 ok | 1 generic failure | 2 network failure | 3 installer failure
================================================================================
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$Prerelease,
    [string]$Version,
    [switch]$NoLaunch,
    [switch]$SkipBackup,
    [switch]$DryRun,
    [switch]$Ascii,
    [switch]$NoColor,
    [switch]$Quiet
)

# ==============================================================================
# CONFIG
# ==============================================================================
$script:Cfg = [ordered]@{
    AppName       = 'ChurchCare'
    DisplayName   = 'ChurchCare Desktop Suite'
    Repo          = 'PEP0X/ChurchCare'
    RegistryMatch = '*ChurchCare*'
    ProcessNames  = @('ChurchCareCaseStudy', 'church-care-app')
    ExeNames      = @('ChurchCareCaseStudy.exe', 'church-care-app.exe')
    DataDir       = Join-Path $env:APPDATA 'ChurchCare'
    StateDir      = Join-Path $env:LOCALAPPDATA 'ChurchCare'
    KeepBackups   = 5
    AssetPattern  = @{ x64 = '*x64-setup.exe'; arm64 = '*arm64-setup.exe'; x86 = '*x86-setup.exe' }
}

$script:Ui = @{
    Ansi    = $false
    Unicode = $false
    Width   = 66
    Quiet   = [bool]$Quiet
    Frame   = 0
}

$script:Palette = @{
    fg = '230;231;240'; muted = '122;126;144'; dim = '72;76;92'
    accent = '146;124;248'; accent2 = '86;204;242'
    ok = '84;202;136'; warn = '236;182;86'; err = '238;98;112'
}

$script:Glyph = @{}
$script:TempFile = $null
$script:LogFile = $null
$script:CursorHidden = $false

# ==============================================================================
# UI PRIMITIVES
# ==============================================================================
$ESC = [char]27

function Initialize-Ui {
    # Colors: only when we have a real console and the host speaks VT sequences.
    $ansi = $true
    if ($NoColor -or $Quiet) { $ansi = $false }
    elseif ($env:NO_COLOR) { $ansi = $false }
    elseif ($PSVersionTable.PSVersion.Major -lt 6) {
        $vt = $false
        try { $vt = [bool]$Host.UI.SupportsVirtualTerminal } catch { $vt = $false }
        if (-not $vt -and -not $env:WT_SESSION) { $ansi = $false }
    }

    $unicode = -not $Ascii
    try {
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    } catch { $unicode = $false }
    if ($env:CHURCHCARE_ASCII) { $unicode = $false }

    $width = 66
    try {
        $w = [Console]::WindowWidth
        if ($w -gt 20) { $width = [Math]::Min(66, $w - 2) }
    } catch { }

    $script:Ui.Ansi = $ansi
    $script:Ui.Unicode = $unicode
    $script:Ui.Width = $width

    if ($unicode) {
        $script:Glyph = @{
            TL='╭'; TR='╮'; BL='╰'; BR='╯'; H='─'; V='│'
            Ok='✔'; Fail='✖'; Warn='!'; Arrow='➜'; Dot='•'; Star='✦'
            Full='█'; Empty='░'
            Spin=@('⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏')
        }
    } else {
        $script:Glyph = @{
            TL='+'; TR='+'; BL='+'; BR='+'; H='-'; V='|'
            Ok='OK'; Fail='XX'; Warn='!'; Arrow='->'; Dot='*'; Star='*'
            Full='#'; Empty='.'
            Spin=@('|','/','-','\')
        }
    }
}

function Paint {
    param([string]$Text, [string]$Color = 'fg', [switch]$Bold)
    if (-not $script:Ui.Ansi) { return $Text }
    $rgb = $script:Palette[$Color]
    if (-not $rgb) { $rgb = $script:Palette['fg'] }
    $b = ''
    if ($Bold) { $b = "$ESC[1m" }
    return "$b$ESC[38;2;${rgb}m$Text$ESC[0m"
}

function Get-PlainLength {
    param([string]$Text)
    if (-not $Text) { return 0 }
    return ([regex]::Replace($Text, "$ESC\[[0-9;?]*[a-zA-Z]", '')).Length
}

function Write-Line {
    param([string]$Text = '')
    if ($script:Ui.Quiet) {
        $plain = [regex]::Replace($Text, "$ESC\[[0-9;?]*[a-zA-Z]", '')
        if ($plain.Trim()) { Write-Host $plain.TrimEnd() }
    } else {
        Write-Host $Text
    }
    Write-Log ([regex]::Replace($Text, "$ESC\[[0-9;?]*[a-zA-Z]", '')).TrimEnd()
}

function Write-Box {
    param(
        [string[]]$Lines,
        [string]$Border = 'accent'
    )
    $inner = $script:Ui.Width - 4
    $g = $script:Glyph
    Write-Line (Paint ("  " + $g.TL + ($g.H * ($script:Ui.Width - 2)) + $g.TR) $Border)
    foreach ($l in $Lines) {
        $len = Get-PlainLength $l
        if ($len -gt $inner) {
            # hard truncate on visible characters only (colored text is pre-sliced by caller)
            $l = $l.Substring(0, [Math]::Min($l.Length, $inner))
            $len = Get-PlainLength $l
        }
        $pad = ' ' * [Math]::Max(0, $inner - $len)
        Write-Line ((Paint ("  " + $g.V) $Border) + " $l$pad " + (Paint $g.V $Border))
    }
    Write-Line (Paint ("  " + $g.BL + ($g.H * ($script:Ui.Width - 2)) + $g.BR) $Border)
}

function Write-Step {
    param([int]$Index, [int]$Total, [string]$Text)
    Write-Line ''
    Write-Line ((Paint "  [$Index/$Total] " 'accent' -Bold) + (Paint $Text 'fg'))
}

function Write-Item {
    param([string]$Text, [ValidateSet('ok','fail','warn','info')][string]$Kind = 'info')
    $g = $script:Glyph
    switch ($Kind) {
        'ok'   { Write-Line ("        " + (Paint $g.Ok 'ok')     + " " + $Text) }
        'fail' { Write-Line ("        " + (Paint $g.Fail 'err')  + " " + (Paint $Text 'err')) }
        'warn' { Write-Line ("        " + (Paint $g.Warn 'warn') + " " + (Paint $Text 'warn')) }
        default{ Write-Line ("        " + (Paint $g.Dot 'muted') + " " + (Paint $Text 'muted')) }
    }
}

function Hide-Cursor {
    if ($script:Ui.Ansi -and -not $script:Ui.Quiet) {
        Write-Host -NoNewline "$ESC[?25l"; $script:CursorHidden = $true
    }
}
function Show-Cursor {
    if ($script:CursorHidden) { Write-Host -NoNewline "$ESC[?25h"; $script:CursorHidden = $false }
}

function Write-Transient {
    param([string]$Text)
    if ($script:Ui.Quiet) { return }
    $pad = ' ' * 12
    Write-Host -NoNewline "`r$Text$pad"
}

function Clear-TransientLine {
    if ($script:Ui.Quiet) { return }
    Write-Host -NoNewline ("`r" + (' ' * [Math]::Max(10, $script:Ui.Width + 12)) + "`r")
}

function Step-Spinner {
    param([string]$Text)
    $frames = $script:Glyph.Spin
    $f = $frames[$script:Ui.Frame % $frames.Count]
    $script:Ui.Frame++
    Write-Transient ("        " + (Paint $f 'accent') + " " + (Paint $Text 'muted'))
}

function Get-GradientRgb {
    param([double]$T)
    $from = @(146,124,248); $to = @(86,204,242)
    $r = [int]($from[0] + ($to[0]-$from[0]) * $T)
    $g = [int]($from[1] + ($to[1]-$from[1]) * $T)
    $b = [int]($from[2] + ($to[2]-$from[2]) * $T)
    return "$r;$g;$b"
}

function New-ProgressBar {
    param([double]$Fraction, [int]$Width = 30)
    $filled = [int][Math]::Round($Width * [Math]::Max(0.0, [Math]::Min(1.0, $Fraction)))
    if (-not $script:Ui.Ansi) {
        return ($script:Glyph.Full * $filled) + ($script:Glyph.Empty * ($Width - $filled))
    }
    $sb = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $Width; $i++) {
        if ($i -lt $filled) {
            $t = 0.0
            if ($Width -gt 1) { $t = $i / [double]($Width - 1) }
            [void]$sb.Append("$ESC[38;2;$(Get-GradientRgb $t)m" + $script:Glyph.Full)
        } else {
            [void]$sb.Append("$ESC[38;2;$($script:Palette.dim)m" + $script:Glyph.Empty)
        }
    }
    [void]$sb.Append("$ESC[0m")
    return $sb.ToString()
}

function Format-Size {
    param([double]$Bytes)
    if ($Bytes -ge 1GB) { return ('{0:N2} GB' -f ($Bytes / 1GB)) }
    if ($Bytes -ge 1MB) { return ('{0:N1} MB' -f ($Bytes / 1MB)) }
    if ($Bytes -ge 1KB) { return ('{0:N0} KB' -f ($Bytes / 1KB)) }
    return "$([int]$Bytes) B"
}

function Format-Duration {
    param([double]$Seconds)
    if ($Seconds -lt 0 -or [double]::IsInfinity($Seconds) -or [double]::IsNaN($Seconds)) { return '--:--' }
    $ts = [TimeSpan]::FromSeconds([Math]::Min($Seconds, 359999))
    return ('{0:00}:{1:00}' -f [int]$ts.TotalMinutes, $ts.Seconds)
}

# ==============================================================================
# LOGGING
# ==============================================================================
function Initialize-Log {
    try {
        $dir = Join-Path $script:Cfg.StateDir 'logs'
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $script:LogFile = Join-Path $dir ('updater-{0:yyyyMMdd}.log' -f (Get-Date))
        # keep the log folder small
        Get-ChildItem $dir -Filter 'updater-*.log' -EA SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 |
            Remove-Item -Force -EA SilentlyContinue
    } catch { $script:LogFile = $null }
}

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    if (-not $script:LogFile -or -not $Message) { return }
    try {
        Add-Content -Path $script:LogFile -Encoding UTF8 -Value ('[{0:HH:mm:ss}] [{1}] {2}' -f (Get-Date), $Level, $Message)
    } catch { }
}

# ==============================================================================
# SEMVER
# ==============================================================================
function ConvertTo-SemVer {
    param([string]$Text)
    if (-not $Text) { return $null }
    $t = $Text.Trim().TrimStart('v', 'V')
    $m = [regex]::Match($t, '^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z\.\-]+))?(?:\+[0-9A-Za-z\.\-]+)?$')
    if (-not $m.Success) { return $null }
    $num = @(0, 0, 0, 0)
    for ($i = 1; $i -le 4; $i++) {
        if ($m.Groups[$i].Success) { $num[$i - 1] = [int]$m.Groups[$i].Value }
    }
    $pre = @()
    if ($m.Groups[5].Success) { $pre = $m.Groups[5].Value.Split('.') }
    return [pscustomobject]@{ Numbers = $num; Pre = $pre; Raw = $Text }
}

function Compare-SemVer {
    param($A, $B)   # -1 : A<B | 0 : equal | 1 : A>B
    if (-not $A -and -not $B) { return 0 }
    if (-not $A) { return -1 }
    if (-not $B) { return 1 }
    for ($i = 0; $i -lt 4; $i++) {
        if ($A.Numbers[$i] -lt $B.Numbers[$i]) { return -1 }
        if ($A.Numbers[$i] -gt $B.Numbers[$i]) { return 1 }
    }
    # a version WITH a prerelease tag ranks below the same version without one
    if ($A.Pre.Count -eq 0 -and $B.Pre.Count -gt 0) { return 1 }
    if ($A.Pre.Count -gt 0 -and $B.Pre.Count -eq 0) { return -1 }
    $n = [Math]::Max($A.Pre.Count, $B.Pre.Count)
    for ($i = 0; $i -lt $n; $i++) {
        if ($i -ge $A.Pre.Count) { return -1 }
        if ($i -ge $B.Pre.Count) { return 1 }
        $x = $A.Pre[$i]; $y = $B.Pre[$i]
        $xn = 0; $yn = 0
        $xIsNum = [int]::TryParse($x, [ref]$xn)
        $yIsNum = [int]::TryParse($y, [ref]$yn)
        if ($xIsNum -and $yIsNum) {
            if ($xn -ne $yn) { if ($xn -lt $yn) { return -1 } else { return 1 } }
        } elseif ($xIsNum) { return -1 }
        elseif ($yIsNum) { return 1 }
        else {
            $c = [string]::CompareOrdinal($x, $y)
            if ($c -ne 0) { if ($c -lt 0) { return -1 } else { return 1 } }
        }
    }
    return 0
}

# ==============================================================================
# DETECTION
# ==============================================================================
function Get-InstalledApp {
    $roots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKCU:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
    )
    $found = @()
    foreach ($root in $roots) {
        if (-not (Test-Path $root)) { continue }
        foreach ($key in (Get-ChildItem -Path $root -EA SilentlyContinue)) {
            $p = Get-ItemProperty -Path $key.PSPath -EA SilentlyContinue
            if ($p -and $p.DisplayName -like $script:Cfg.RegistryMatch) { $found += $p }
        }
    }

    $result = [pscustomobject]@{
        Installed = $false; Version = $null; SemVer = $null
        Directory = $null; Exe = $null; UninstallString = $null; Source = 'none'
    }

    if ($found.Count -gt 0) {
        $best = $found | Sort-Object @{ Expression = { $v = ConvertTo-SemVer $_.DisplayVersion; if ($v) { $v.Numbers[0]*1e9 + $v.Numbers[1]*1e6 + $v.Numbers[2]*1e3 + $v.Numbers[3] } else { 0 } } } -Descending | Select-Object -First 1
        $result.Installed = $true
        $result.Version = $best.DisplayVersion
        $result.UninstallString = $best.UninstallString
        $result.Source = 'registry'
        if ($best.InstallLocation) { $result.Directory = $best.InstallLocation.Trim('"').TrimEnd('\') }
    }

    if (-not $result.Directory) {
        $candidates = @(
            (Join-Path $env:LOCALAPPDATA 'ChurchCareCaseStudy'),
            (Join-Path $env:LOCALAPPDATA 'Programs\ChurchCareCaseStudy'),
            (Join-Path $env:ProgramFiles 'ChurchCareCaseStudy'),
            (Join-Path ${env:ProgramFiles(x86)} 'ChurchCareCaseStudy')
        ) | Where-Object { $_ }
        foreach ($c in $candidates) {
            if (Test-Path $c) {
                $result.Directory = $c.TrimEnd('\')
                $result.Installed = $true
                if ($result.Source -eq 'none') { $result.Source = 'disk' }
                break
            }
        }
    }

    if ($result.Directory) {
        foreach ($name in $script:Cfg.ExeNames) {
            $exe = Join-Path $result.Directory $name
            if (Test-Path $exe) {
                $result.Exe = $exe
                if (-not $result.Version) {
                    try { $result.Version = (Get-Item $exe).VersionInfo.ProductVersion } catch { }
                }
                break
            }
        }
    }

    $result.SemVer = ConvertTo-SemVer $result.Version
    return $result
}

function Get-TargetArchitecture {
    $arch = $env:PROCESSOR_ARCHITECTURE
    if ($env:PROCESSOR_ARCHITEW6432) { $arch = $env:PROCESSOR_ARCHITEW6432 }
    switch ($arch) {
        'ARM64' { return 'arm64' }
        'x86'   { return 'x86' }
        default { return 'x64' }
    }
}

function Test-IsAdmin {
    try {
        $id = [Security.Principal.WindowsIdentity]::GetCurrent()
        return ([Security.Principal.WindowsPrincipal]$id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch { return $false }
}

# ==============================================================================
# HTTP
# ==============================================================================
function New-HttpClient {
    if (-not ('System.Net.Http.HttpClient' -as [type])) {
        Add-Type -AssemblyName System.Net.Http -EA SilentlyContinue
    }
    try {
        [Net.ServicePointManager]::SecurityProtocol =
            [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    } catch { }

    $handler = New-Object System.Net.Http.HttpClientHandler
    $handler.AllowAutoRedirect = $true
    try {
        $handler.AutomaticDecompression =
            [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
    } catch { }

    $client = New-Object System.Net.Http.HttpClient($handler)
    $client.Timeout = [TimeSpan]::FromMinutes(15)
    $client.DefaultRequestHeaders.Add('User-Agent', 'ChurchCare-Updater/2.0')

    $token = $env:GH_TOKEN
    if (-not $token) { $token = $env:GITHUB_TOKEN }
    if ($token) { $client.DefaultRequestHeaders.Add('Authorization', "Bearer $token") }

    return $client
}

function Invoke-GitHubApi {
    param([string]$Url, [string]$Label = 'Contacting GitHub')
    $client = New-HttpClient
    try {
        $task = $client.GetAsync($Url)
        while (-not $task.IsCompleted) {
            Step-Spinner $Label
            Start-Sleep -Milliseconds 90
        }
        Clear-TransientLine
        $resp = $task.GetAwaiter().GetResult()
        $body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()

        if (-not $resp.IsSuccessStatusCode) {
            $code = [int]$resp.StatusCode
            if ($code -eq 404) { throw "Release not found (HTTP 404). Check the tag name or whether a release was published." }
            if ($code -eq 403 -or $code -eq 429) {
                $remaining = $null
                try { $remaining = ($resp.Headers.GetValues('X-RateLimit-Remaining') | Select-Object -First 1) } catch { }
                if ($remaining -eq '0') {
                    throw "GitHub API rate limit reached. Set `$env:GH_TOKEN to a personal access token and retry."
                }
                throw "GitHub refused the request (HTTP $code)."
            }
            throw "GitHub API returned HTTP $code."
        }
        return ($body | ConvertFrom-Json)
    } finally {
        $client.Dispose()
    }
}

function Resolve-Release {
    if ($Version) {
        $tag = $Version.Trim()
        return Invoke-GitHubApi "https://api.github.com/repos/$($script:Cfg.Repo)/releases/tags/$tag" "Fetching release $tag"
    }
    if ($Prerelease) {
        $all = Invoke-GitHubApi "https://api.github.com/repos/$($script:Cfg.Repo)/releases?per_page=20" 'Fetching release list'
        $rel = $all | Where-Object { -not $_.draft } | Select-Object -First 1
        if (-not $rel) { throw 'No published releases found in this repository.' }
        return $rel
    }
    return Invoke-GitHubApi "https://api.github.com/repos/$($script:Cfg.Repo)/releases/latest" 'Querying latest release'
}

function Select-Asset {
    param($Release, [string]$Arch)
    $pattern = $script:Cfg.AssetPattern[$Arch]
    $asset = $Release.assets | Where-Object { $_.name -like $pattern } | Select-Object -First 1
    if (-not $asset -and $Arch -ne 'x64') {
        $asset = $Release.assets | Where-Object { $_.name -like $script:Cfg.AssetPattern['x64'] } | Select-Object -First 1
        if ($asset) { Write-Item "No native $Arch package; falling back to the x64 build." 'warn' }
    }
    if (-not $asset) {
        $asset = $Release.assets | Where-Object { $_.name -like '*setup.exe' -or $_.name -like '*.msi' } | Select-Object -First 1
    }
    return $asset
}

function Get-ChecksumFromRelease {
    param($Release, [string]$AssetName)
    $cs = $Release.assets | Where-Object { $_.name -eq "$AssetName.sha256" -or $_.name -like '*checksums*' } | Select-Object -First 1
    if (-not $cs) { return $null }
    $client = New-HttpClient
    try {
        $text = $client.GetStringAsync($cs.browser_download_url).GetAwaiter().GetResult()
        foreach ($line in ($text -split "`n")) {
            $l = $line.Trim()
            if (-not $l) { continue }
            if ($l -match '^([0-9a-fA-F]{64})\s+\*?(.+)$') {
                if ($Matches[2].Trim() -eq $AssetName) { return $Matches[1].ToLower() }
            } elseif ($l -match '^[0-9a-fA-F]{64}$' -and $cs.name -eq "$AssetName.sha256") {
                return $l.ToLower()
            }
        }
    } catch { return $null } finally { $client.Dispose() }
    return $null
}

function Invoke-Download {
    param([string]$Url, [string]$Destination, [long]$ExpectedSize)

    $attempt = 0
    $maxAttempts = 3
    while ($true) {
        $attempt++
        $client = $null; $fs = $null; $stream = $null
        try {
            $client = New-HttpClient
            $resp = $client.GetAsync($Url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
            if (-not $resp.IsSuccessStatusCode) { throw "Download failed with HTTP $([int]$resp.StatusCode)." }

            $total = $ExpectedSize
            if ($resp.Content.Headers.ContentLength) { $total = [long]$resp.Content.Headers.ContentLength }

            $stream = $resp.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
            $fs = [System.IO.File]::Create($Destination)

            $buffer = New-Object byte[] 131072
            $downloaded = 0L
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            $lastDraw = 0

            Hide-Cursor
            while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $fs.Write($buffer, 0, $read)
                $downloaded += $read
                if ($sw.ElapsedMilliseconds - $lastDraw -ge 80 -or $downloaded -eq $total) {
                    $lastDraw = $sw.ElapsedMilliseconds
                    $secs = [Math]::Max(0.001, $sw.Elapsed.TotalSeconds)
                    $speed = $downloaded / $secs
                    if ($total -gt 0) {
                        $frac = $downloaded / [double]$total
                        $eta = ($total - $downloaded) / [Math]::Max(1, $speed)
                        $bar = New-ProgressBar -Fraction $frac -Width 30
                        $txt = "        $bar " +
                               (Paint ('{0,3:N0}%' -f ($frac * 100)) 'fg') + '  ' +
                               (Paint ("$(Format-Size $downloaded) / $(Format-Size $total)") 'muted') + '  ' +
                               (Paint ("$(Format-Size $speed)/s") 'accent2') + '  ' +
                               (Paint ("ETA $(Format-Duration $eta)") 'dim')
                        Write-Transient $txt
                    } else {
                        Step-Spinner "Downloading $(Format-Size $downloaded)"
                    }
                }
            }
            $fs.Close(); $fs = $null
            $stream.Close(); $stream = $null
            Clear-TransientLine
            Show-Cursor
            return $downloaded
        } catch {
            Show-Cursor
            Clear-TransientLine
            if ($fs) { try { $fs.Close() } catch { } }
            if ($stream) { try { $stream.Close() } catch { } }
            if (Test-Path $Destination) { Remove-Item $Destination -Force -EA SilentlyContinue }
            if ($attempt -ge $maxAttempts) { throw }
            $wait = [Math]::Pow(2, $attempt)
            Write-Item "Transfer failed ($($_.Exception.Message.Trim())). Retrying in $wait s [$attempt/$maxAttempts]..." 'warn'
            Start-Sleep -Seconds $wait
        } finally {
            if ($client) { $client.Dispose() }
        }
    }
}

function Test-Package {
    param([string]$Path, [long]$ExpectedSize, [string]$ExpectedSha256)

    $actualSize = (Get-Item $Path).Length
    if ($ExpectedSize -gt 0 -and $actualSize -ne $ExpectedSize) {
        throw "Size mismatch: expected $ExpectedSize bytes, got $actualSize. The package is incomplete."
    }
    Write-Item "Size verified ($(Format-Size $actualSize))." 'ok'

    if ($ExpectedSha256) {
        $hash = (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLower()
        if ($hash -ne $ExpectedSha256) { throw "SHA256 mismatch. Expected $ExpectedSha256, got $hash." }
        Write-Item 'SHA256 checksum matches the published release.' 'ok'
    } else {
        Write-Item 'No published checksum for this asset; skipping hash verification.' 'info'
    }

    try {
        $sig = Get-AuthenticodeSignature -FilePath $Path
        if ($sig.Status -eq 'Valid') {
            Write-Item "Signed by $($sig.SignerCertificate.Subject.Split(',')[0])." 'ok'
        } elseif ($sig.Status -eq 'NotSigned') {
            Write-Item 'Package is not code-signed (expected for unsigned builds).' 'info'
        } else {
            Write-Item "Authenticode status: $($sig.Status)." 'warn'
        }
    } catch { }
}

# ==============================================================================
# PROCESS / BACKUP / INSTALL
# ==============================================================================
function Stop-AppProcesses {
    $closed = 0; $killed = 0
    foreach ($name in $script:Cfg.ProcessNames) {
        $procs = Get-Process -Name $name -EA SilentlyContinue
        foreach ($p in $procs) {
            try { [void]$p.CloseMainWindow() } catch { }
            $closed++
        }
    }
    if ($closed -eq 0) { return [pscustomobject]@{ Closed = 0; Killed = 0 } }

    # give the app up to 10s to flush its data before pulling the plug
    $deadline = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $deadline) {
        $still = @()
        foreach ($name in $script:Cfg.ProcessNames) {
            $still += Get-Process -Name $name -EA SilentlyContinue
        }
        if ($still.Count -eq 0) { break }
        Step-Spinner 'Waiting for the app to close gracefully...'
        Start-Sleep -Milliseconds 250
    }
    Clear-TransientLine

    foreach ($name in $script:Cfg.ProcessNames) {
        $left = Get-Process -Name $name -EA SilentlyContinue
        foreach ($p in $left) {
            try { Stop-Process -Id $p.Id -Force -EA SilentlyContinue; $killed++ } catch { }
        }
    }
    return [pscustomobject]@{ Closed = $closed; Killed = $killed }
}

function Backup-UserData {
    if (-not (Test-Path $script:Cfg.DataDir)) {
        Write-Item 'No user data directory yet; nothing to back up.' 'info'
        return $null
    }
    try {
        $dir = Join-Path $script:Cfg.StateDir 'backups'
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $zip = Join-Path $dir ('data-{0:yyyyMMdd-HHmmss}.zip' -f (Get-Date))
        Compress-Archive -Path (Join-Path $script:Cfg.DataDir '*') -DestinationPath $zip -CompressionLevel Optimal -EA Stop
        Get-ChildItem $dir -Filter 'data-*.zip' | Sort-Object LastWriteTime -Descending |
            Select-Object -Skip $script:Cfg.KeepBackups | Remove-Item -Force -EA SilentlyContinue
        Write-Item "Snapshot saved: $(Split-Path $zip -Leaf) ($(Format-Size (Get-Item $zip).Length))." 'ok'
        return $zip
    } catch {
        Write-Item "Backup skipped: $($_.Exception.Message.Trim())" 'warn'
        return $null
    }
}

function Install-Package {
    param([string]$Path, [string]$TargetDir)

    # NSIS: /S = silent, /D= must be LAST and unquoted, so build one raw argument string.
    $argLine = '/S'
    if ($TargetDir) { $argLine = "/S /D=$TargetDir" }
    Write-Log "Running installer: $Path $argLine"

    $proc = Start-Process -FilePath $Path -ArgumentList $argLine -PassThru -Wait
    $code = $proc.ExitCode

    switch ($code) {
        0     { return [pscustomobject]@{ Ok = $true;  Code = 0;  Reboot = $false } }
        3010  { return [pscustomobject]@{ Ok = $true;  Code = 3010; Reboot = $true } }
        1223  { throw 'Installation cancelled at the UAC prompt (exit 1223).' }
        default { throw "Installer exited with code $code." }
    }
}

function Start-App {
    param($Installed)
    $candidates = @()
    if ($Installed.Exe) { $candidates += $Installed.Exe }
    if ($Installed.Directory) {
        foreach ($n in $script:Cfg.ExeNames) { $candidates += (Join-Path $Installed.Directory $n) }
    }
    $roots = @(
        (Join-Path $env:LOCALAPPDATA 'ChurchCareCaseStudy'),
        (Join-Path $env:LOCALAPPDATA 'Programs\ChurchCareCaseStudy'),
        (Join-Path $env:ProgramFiles 'ChurchCareCaseStudy')
    )
    foreach ($r in $roots) {
        foreach ($n in $script:Cfg.ExeNames) { $candidates += (Join-Path $r $n) }
    }
    foreach ($exe in ($candidates | Select-Object -Unique)) {
        if (Test-Path $exe) { Start-Process -FilePath $exe; return $true }
    }
    foreach ($lnk in @(
        (Join-Path $env:USERPROFILE 'Desktop\ChurchCareCaseStudy.lnk'),
        (Join-Path $env:PUBLIC 'Desktop\ChurchCareCaseStudy.lnk'),
        (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\ChurchCareCaseStudy.lnk')
    )) {
        if (Test-Path $lnk) { Invoke-Item $lnk; return $true }
    }
    return $false
}

# ==============================================================================
# MAIN
# ==============================================================================
function Invoke-ChurchCareUpdate {
    $total = 6

    Write-Line ''
    Write-Box -Border 'accent' -Lines @(
        '',
        (Paint "$($script:Glyph.Star)  $($script:Cfg.DisplayName.ToUpper())" 'accent' -Bold),
        (Paint '   Installer / Updater' 'accent2'),
        ''
    )
    Write-Line ''
    Write-Line ((Paint "   $($script:Glyph.Dot) Repository   : " 'dim') + (Paint $script:Cfg.Repo 'fg'))
    Write-Line ((Paint "   $($script:Glyph.Dot) Channel      : " 'dim') + (Paint $(if ($Version) { $Version } elseif ($Prerelease) { 'pre-release' } else { 'stable' }) 'fg'))
    Write-Line ((Paint "   $($script:Glyph.Dot) User data    : " 'dim') + (Paint "$($script:Cfg.DataDir) (preserved)" 'ok'))
    if ($script:LogFile) {
        Write-Line ((Paint "   $($script:Glyph.Dot) Log file     : " 'dim') + (Paint $script:LogFile 'muted'))
    }

    # ---- 1. local audit ------------------------------------------------------
    Write-Step 1 $total 'Auditing the local system...'
    $arch = Get-TargetArchitecture
    $installed = Get-InstalledApp
    if ($installed.Installed) {
        $vtext = $installed.Version
        if (-not $vtext) { $vtext = 'unknown version' } else { $vtext = "v$vtext" }
        Write-Item "Found $vtext at $($installed.Directory) [$($installed.Source)]" 'ok'
    } else {
        Write-Item 'No existing installation detected - this will be a fresh setup.' 'info'
    }
    Write-Item "Target architecture: $arch" 'info'

    # ---- 2. remote release ---------------------------------------------------
    Write-Step 2 $total 'Resolving the release on GitHub...'
    try {
        $release = Resolve-Release
    } catch {
        Write-Item $_.Exception.Message 'fail'
        $global:LASTEXITCODE = 2
        return
    }

    $asset = Select-Asset -Release $release -Arch $arch
    if (-not $asset) {
        Write-Item "Release $($release.tag_name) has no installer package attached." 'fail'
        $global:LASTEXITCODE = 2
        return
    }

    $latestSem = ConvertTo-SemVer $release.tag_name
    Write-Item "Latest: $($release.tag_name)  ($($asset.name), $(Format-Size $asset.size))" 'ok'

    # ---- decide --------------------------------------------------------------
    $shouldUpdate = $true
    if ($installed.Installed -and $installed.SemVer -and $latestSem) {
        if ((Compare-SemVer $installed.SemVer $latestSem) -ge 0 -and -not $Force) { $shouldUpdate = $false }
    } elseif ($installed.Installed -and $installed.Version -and -not $latestSem) {
        if (($installed.Version.TrimStart('v')) -eq ($release.tag_name.TrimStart('v')) -and -not $Force) { $shouldUpdate = $false }
    }

    if (-not $shouldUpdate) {
        Write-Line ''
        Write-Box -Border 'ok' -Lines @(
            (Paint "$($script:Glyph.Ok) ChurchCare is already up to date (v$($installed.Version))." 'ok' -Bold),
            (Paint 'Nothing to install. Use -Force to reinstall anyway.' 'muted')
        )
        Write-Line ''
        if (-not $NoLaunch) {
            if (Start-App $installed) { Write-Item 'Application launched.' 'ok' }
        }
        $global:LASTEXITCODE = 0
        return
    }

    if ($installed.Installed) {
        Write-Line ((Paint "        $($script:Glyph.Arrow) Upgrade path : " 'accent') +
                    (Paint "v$($installed.Version)" 'warn') + ' ' +
                    (Paint $script:Glyph.Arrow 'fg') + ' ' +
                    (Paint $release.tag_name 'ok'))
    } else {
        Write-Line ((Paint "        $($script:Glyph.Arrow) Action       : " 'accent') +
                    (Paint "clean install of $($release.tag_name)" 'ok'))
    }

    if ($installed.Directory -and $installed.Directory -like "$env:ProgramFiles*" -and -not (Test-IsAdmin)) {
        Write-Item 'Installed under Program Files - Windows will ask for elevation (UAC).' 'warn'
    }

    # ---- 3. close running instances -----------------------------------------
    Write-Step 3 $total 'Releasing process locks...'
    $stopped = Stop-AppProcesses
    if ($stopped.Closed -eq 0) {
        Write-Item 'No running instance.' 'ok'
    } elseif ($stopped.Killed -gt 0) {
        Write-Item "$($stopped.Closed) instance(s) closed, $($stopped.Killed) force-terminated after timeout." 'warn'
    } else {
        Write-Item "$($stopped.Closed) instance(s) closed gracefully." 'ok'
    }

    # ---- 4. backup -----------------------------------------------------------
    Write-Step 4 $total 'Snapshotting user data...'
    if ($SkipBackup) {
        Write-Item 'Backup skipped (-SkipBackup).' 'info'
    } else {
        Backup-UserData | Out-Null
    }

    # ---- 5. download + verify -----------------------------------------------
    Write-Step 5 $total "Downloading $($release.tag_name)..."
    $script:TempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("ChurchCare-$($release.tag_name)-$([guid]::NewGuid().ToString('N').Substring(0,8)).exe")
    try {
        Invoke-Download -Url $asset.browser_download_url -Destination $script:TempFile -ExpectedSize $asset.size | Out-Null
    } catch {
        Write-Item "Transfer failed: $($_.Exception.Message.Trim())" 'fail'
        $global:LASTEXITCODE = 2
        return
    }
    try {
        $sha = Get-ChecksumFromRelease -Release $release -AssetName $asset.name
        Test-Package -Path $script:TempFile -ExpectedSize $asset.size -ExpectedSha256 $sha
    } catch {
        Write-Item $_.Exception.Message 'fail'
        $global:LASTEXITCODE = 2
        return
    }

    # ---- 6. install ----------------------------------------------------------
    Write-Step 6 $total 'Applying the in-place update...'
    if ($DryRun) {
        Write-Item "Dry run - installer left at $($script:TempFile)" 'warn'
        $global:LASTEXITCODE = 0
        return
    }

    try {
        $res = Install-Package -Path $script:TempFile -TargetDir $installed.Directory
        Write-Item 'Files updated in place; user data untouched.' 'ok'
        if ($res.Reboot) { Write-Item 'Windows reports a restart is required to finish.' 'warn' }
    } catch {
        Write-Item $_.Exception.Message 'fail'
        Write-Item 'Your previous installation and data were left as they were.' 'info'
        $global:LASTEXITCODE = 3
        return
    }

    # ---- verify + launch -----------------------------------------------------
    $after = Get-InstalledApp
    if ($after.Version) {
        $cmp = Compare-SemVer (ConvertTo-SemVer $after.Version) $latestSem
        if ($cmp -eq 0) {
            Write-Item "Verified installed version: v$($after.Version)" 'ok'
        } else {
            Write-Item "Registry still reports v$($after.Version) (expected $($release.tag_name))." 'warn'
        }
    }

    $launched = $false
    if (-not $NoLaunch) { $launched = Start-App $after }

    Write-Line ''
    $headline = "$($script:Glyph.Ok) ChurchCare $($release.tag_name) installed successfully."
    if ($launched) { $headline = "$($script:Glyph.Ok) ChurchCare $($release.tag_name) is now running." }
    Write-Box -Border 'ok' -Lines @(
        (Paint $headline 'ok' -Bold),
        (Paint 'You can close this window.' 'muted')
    )
    Write-Line ''
    $global:LASTEXITCODE = 0
}

# ==============================================================================
# ENTRY POINT
# ==============================================================================
Initialize-Ui
Initialize-Log

if ($env:OS -ne 'Windows_NT') {
    Write-Host 'This installer only runs on Windows.' -ForegroundColor Red
    $global:LASTEXITCODE = 1
    return
}

try { Clear-Host } catch { }

try {
    Invoke-ChurchCareUpdate
} catch {
    Show-Cursor
    Clear-TransientLine
    Write-Line ''
    Write-Box -Border 'err' -Lines @(
        (Paint "$($script:Glyph.Fail) Unexpected failure" 'err' -Bold),
        (Paint ($_.Exception.Message.Trim()) 'muted')
    )
    Write-Log ($_ | Out-String) 'ERROR'
    if ($script:LogFile) { Write-Line (Paint "   Details: $($script:LogFile)" 'dim') }
    Write-Line ''
    $global:LASTEXITCODE = 1
} finally {
    Show-Cursor
    if ($script:TempFile -and (Test-Path $script:TempFile) -and -not $DryRun) {
        Remove-Item $script:TempFile -Force -EA SilentlyContinue
    }
}