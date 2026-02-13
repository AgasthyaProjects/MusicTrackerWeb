$ErrorActionPreference = "Stop"

Write-Host "Starting MusicTrackerWeb on Windows..." -ForegroundColor Green

function Get-ListeningPidsForPort {
    param (
        [int]$Port
    )

    $pids = @()

    try {
        $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        # Fallback for environments where Get-NetTCPConnection is unavailable.
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
    if (-not $pids -or $pids.Count -eq 0) {
        return
    }

    foreach ($procId in $pids) {
        if ($procId -eq $PID) {
            continue
        }

        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if (-not $proc) {
            continue
        }

        Write-Host "Port $Port is in use by $($proc.ProcessName) (PID $procId). Stopping it..." -ForegroundColor Yellow
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
        } catch {
            Write-Host "Unable to stop PID $procId on port $Port. Close that process manually and retry." -ForegroundColor Red
            throw
        }
    }
}

function Ensure-Dependencies {
    param (
        [string]$Path,
        [string]$Name
    )

    if (-not (Test-Path (Join-Path $Path "node_modules"))) {
        Write-Host "$Name dependencies not found. Installing..." -ForegroundColor Yellow
        & npm.cmd --prefix $Path install
    }
}

Ensure-Dependencies -Path "." -Name "Root"
Ensure-Dependencies -Path "client" -Name "Client"
Ensure-Dependencies -Path "server" -Name "Server"
Stop-ProcessesUsingPort -Port 3001
Stop-ProcessesUsingPort -Port 5173

Write-Host "Launching development servers (browser will open automatically)..." -ForegroundColor Green
& npm.cmd run dev
