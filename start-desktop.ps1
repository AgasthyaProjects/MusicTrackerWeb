param (
    [string]$Url = "http://localhost:5173",
    [int]$MaxAttempts = 180
)

$ErrorActionPreference = "Stop"

function Show-LauncherError {
    param (
        [string]$Message
    )

    Add-Type -AssemblyName PresentationFramework -ErrorAction SilentlyContinue
    [System.Windows.MessageBox]::Show(
        $Message,
        "MusicTrackerWeb Launcher",
        [System.Windows.MessageBoxButton]::OK,
        [System.Windows.MessageBoxImage]::Error
    ) | Out-Null
}

function Get-ListeningPidsForPort {
    param (
        [int]$Port
    )

    $pids = @()
    try {
        $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        $pids = netstat -ano -p tcp |
            Select-String -Pattern "LISTENING" |
            ForEach-Object { $_.ToString().Trim() -split "\s+" } |
            Where-Object { $_.Length -ge 5 -and $_[1] -match ":(\d+)$" -and [int]$Matches[1] -eq $Port } |
            ForEach-Object { [int]$_[4] } |
            Select-Object -Unique
    }

    return @($pids | Where-Object { $_ -and $_ -ne 0 })
}

function Stop-ProcessesUsingPort {
    param (
        [int]$Port
    )

    $pids = Get-ListeningPidsForPort -Port $Port
    foreach ($procId in $pids) {
        if ($procId -eq $PID) {
            continue
        }

        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}

function Ensure-Dependencies {
    param (
        [string]$Path
    )

    if (-not (Test-Path (Join-Path $Path "node_modules"))) {
        & npm.cmd --prefix $Path install
    }
}

function Get-BrowserCandidates {
    $candidates = @(
        # Prefer Chrome first (often has active profile/process handling that works better for app mode).
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    )

    return @($candidates | Where-Object { Test-Path $_ } | Select-Object -Unique)
}

function Get-BrowserProcessesForProfile {
    param (
        [string]$ProfilePath
    )

    $needle = $ProfilePath.ToLowerInvariant()
    $candidates = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            ($_.Name -eq "msedge.exe" -or $_.Name -eq "chrome.exe") -and
            $_.CommandLine -and
            $_.CommandLine.ToLowerInvariant().Contains($needle)
        }

    $procs = @()
    foreach ($candidate in $candidates) {
        $proc = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
        if ($proc) {
            $procs += $proc
        }
    }

    return @($procs)
}

function Start-AppBrowser {
    param (
        [string]$AppUrl
    )

    $candidates = Get-BrowserCandidates
    if (-not $candidates -or $candidates.Count -eq 0) {
        throw "Could not find Edge or Chrome. Install one of them to use desktop launcher mode."
    }

    foreach ($candidate in $candidates) {
        $profilePath = Join-Path $env:TEMP ("MusicTrackerWebProfile-" + [Guid]::NewGuid().ToString("N"))
        New-Item -ItemType Directory -Path $profilePath -Force | Out-Null

        $args = @(
            "--new-window",
            "--app=$AppUrl",
            "--user-data-dir=$profilePath",
            "--no-first-run",
            "--disable-session-crashed-bubble"
        )

        try {
            $proc = Start-Process -FilePath $candidate -ArgumentList $args -PassThru
            Start-Sleep -Seconds 2
            $proc.Refresh()

            if (-not $proc.HasExited) {
                return [PSCustomObject]@{
                    BrowserPath    = $candidate
                    ProfilePath    = $profilePath
                    UseProfileScan = $false
                    Process        = $proc
                }
            }

            for ($i = 0; $i -lt 10; $i++) {
                $matched = Get-BrowserProcessesForProfile -ProfilePath $profilePath
                if ($matched.Count -gt 0) {
                    return [PSCustomObject]@{
                        BrowserPath    = $candidate
                        ProfilePath    = $profilePath
                        UseProfileScan = $true
                        Process        = $null
                    }
                }

                Start-Sleep -Seconds 1
            }
        } catch {
            # Try next browser candidate.
        }

        if (Test-Path $profilePath) {
            Remove-Item -Path $profilePath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    throw "Could not open the app window automatically."
}

function Add-LauncherSessionToUrl {
    param (
        [string]$BaseUrl,
        [string]$SessionId
    )

    $separator = if ($BaseUrl.Contains("?")) { "&" } else { "?" }
    $encodedSession = [Uri]::EscapeDataString($SessionId)
    return "$BaseUrl${separator}launcherSession=$encodedSession"
}

function Get-LauncherSessionStatus {
    param (
        [string]$SessionId
    )

    $encoded = [Uri]::EscapeDataString($SessionId)
    $statusUrl = "http://127.0.0.1:3001/api/launcher/status?sessionId=$encoded"
    return Invoke-RestMethod -Uri $statusUrl -Method Get -TimeoutSec 3
}

function Wait-ForLauncherSessionEnd {
    param (
        [string]$SessionId,
        [System.Diagnostics.Process]$BrowserProc,
        [bool]$UseProfileScan,
        [string]$ProfilePath,
        [int]$MaxWaitForFirstHeartbeatSec = 120
    )

    $startedAt = Get-Date
    $seenHeartbeat = $false

    while ($true) {
        try {
            $status = Get-LauncherSessionStatus -SessionId $SessionId
            if ($status.seenHeartbeat) {
                $seenHeartbeat = $true
            }

            if ($seenHeartbeat -and (-not $status.active)) {
                return
            }
        } catch {
            # Ignore transient status errors while waiting.
        }

        if (-not $seenHeartbeat) {
            $browserStillOpen = $true
            if (-not $UseProfileScan -and $BrowserProc) {
                $BrowserProc.Refresh()
                $browserStillOpen = -not $BrowserProc.HasExited
            } elseif ($UseProfileScan -and $ProfilePath) {
                $activeBrowserProcs = Get-BrowserProcessesForProfile -ProfilePath $ProfilePath
                $browserStillOpen = $activeBrowserProcs.Count -gt 0
            }

            if (-not $browserStillOpen) {
                throw "Browser window closed before heartbeat started."
            }
        }

        $elapsedSec = ((Get-Date) - $startedAt).TotalSeconds
        if (-not $seenHeartbeat -and $elapsedSec -ge $MaxWaitForFirstHeartbeatSec) {
            throw "Launcher heartbeat did not start within $MaxWaitForFirstHeartbeatSec seconds."
        }

        Start-Sleep -Seconds 2
    }
}

function Wait-ForReadyUrl {
    param (
        [string]$CheckUrl,
        [int]$Attempts,
        [System.Diagnostics.Process]$ServerProc,
        [System.Diagnostics.Process]$ClientProc,
        [string]$ServerOutLogPath,
        [string]$ServerErrLogPath,
        [string]$ClientOutLogPath,
        [string]$ClientErrLogPath
    )

    $uri = [Uri]$CheckUrl
    $targetHost = if ($uri.Host -eq "localhost") { "127.0.0.1" } else { $uri.Host }
    $targetPort = if ($uri.IsDefaultPort) {
        if ($uri.Scheme -eq "https") { 443 } else { 80 }
    } else {
        $uri.Port
    }

    for ($i = 0; $i -lt $Attempts; $i++) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            try {
                $async = $tcpClient.BeginConnect($targetHost, $targetPort, $null, $null)
                if ($async.AsyncWaitHandle.WaitOne(1000, $false)) {
                    $null = $tcpClient.EndConnect($async)
                    return
                }
            } finally {
                $tcpClient.Close()
            }
        } catch {
            Start-Sleep -Seconds 1
        }

        Start-Sleep -Milliseconds 250
    }

    $serverState = "unknown"
    $clientState = "unknown"
    if ($ServerProc) {
        $ServerProc.Refresh()
        $serverState = if ($ServerProc.HasExited) { "exited" } else { "running" }
    }
    if ($ClientProc) {
        $ClientProc.Refresh()
        $clientState = if ($ClientProc.HasExited) { "exited" } else { "running" }
    }

    throw "The app did not become ready at $CheckUrl.`nServer process: $serverState`nClient process: $clientState`nServer out: $ServerOutLogPath`nServer err: $ServerErrLogPath`nClient out: $ClientOutLogPath`nClient err: $ClientErrLogPath"
}

$projectRoot = $PSScriptRoot
$serverProc = $null
$clientProc = $null
$browserProc = $null
$browserUseProfileScan = $false
$profileDir = $null
$launcherSessionId = [Guid]::NewGuid().ToString("N")
$serverOutLog = Join-Path $env:TEMP "MusicTrackerWeb-server.out.log"
$serverErrLog = Join-Path $env:TEMP "MusicTrackerWeb-server.err.log"
$clientOutLog = Join-Path $env:TEMP "MusicTrackerWeb-client.out.log"
$clientErrLog = Join-Path $env:TEMP "MusicTrackerWeb-client.err.log"

try {
    Ensure-Dependencies -Path $projectRoot
    Ensure-Dependencies -Path (Join-Path $projectRoot "client")
    Ensure-Dependencies -Path (Join-Path $projectRoot "server")

    Stop-ProcessesUsingPort -Port 3001
    Stop-ProcessesUsingPort -Port 5173

    Remove-Item -Path $serverOutLog -ErrorAction SilentlyContinue
    Remove-Item -Path $serverErrLog -ErrorAction SilentlyContinue
    Remove-Item -Path $clientOutLog -ErrorAction SilentlyContinue
    Remove-Item -Path $clientErrLog -ErrorAction SilentlyContinue

    $serverProc = Start-Process -FilePath "npm.cmd" -ArgumentList @("--prefix", (Join-Path $projectRoot "server"), "run", "dev") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $serverOutLog -RedirectStandardError $serverErrLog -PassThru
    $clientProc = Start-Process -FilePath "npm.cmd" -ArgumentList @("--prefix", (Join-Path $projectRoot "client"), "run", "dev:noopen") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $clientOutLog -RedirectStandardError $clientErrLog -PassThru

    Wait-ForReadyUrl -CheckUrl $Url -Attempts $MaxAttempts -ServerProc $serverProc -ClientProc $clientProc -ServerOutLogPath $serverOutLog -ServerErrLogPath $serverErrLog -ClientOutLogPath $clientOutLog -ClientErrLogPath $clientErrLog

    $launchUrl = Add-LauncherSessionToUrl -BaseUrl $Url -SessionId $launcherSessionId
    $browserLaunch = Start-AppBrowser -AppUrl $launchUrl
    $profileDir = $browserLaunch.ProfilePath
    $browserUseProfileScan = $browserLaunch.UseProfileScan
    $browserProc = $browserLaunch.Process

    Wait-ForLauncherSessionEnd -SessionId $launcherSessionId -BrowserProc $browserProc -UseProfileScan $browserUseProfileScan -ProfilePath $profileDir
} catch {
    Show-LauncherError -Message $_.Exception.Message
} finally {
    if ($serverProc -and -not $serverProc.HasExited) {
        Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", "$($serverProc.Id)", "/T", "/F") -WindowStyle Hidden -Wait | Out-Null
    }

    if ($clientProc -and -not $clientProc.HasExited) {
        Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", "$($clientProc.Id)", "/T", "/F") -WindowStyle Hidden -Wait | Out-Null
    }

    Stop-ProcessesUsingPort -Port 3001
    Stop-ProcessesUsingPort -Port 5173

    if ($profileDir -and (Test-Path $profileDir)) {
        Remove-Item -Path $profileDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
