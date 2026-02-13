param (
    [string]$Url = "http://localhost:5173",
    [int]$MaxAttempts = 90
)

$ErrorActionPreference = "SilentlyContinue"

for ($i = 0; $i -lt $MaxAttempts; $i++) {
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

# Use cmd/start to reliably invoke the default browser on Windows.
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "start", "", $Url | Out-Null
