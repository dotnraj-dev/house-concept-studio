$ErrorActionPreference = 'Stop'
$studioRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$studioPidFile = Join-Path $studioRoot '.local-app.pid.json'
if (!(Test-Path -LiteralPath $studioPidFile) -and (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)) { throw 'The web server was started from another terminal. Stop it there with Ctrl+C before stopping the project database.' }
if (Test-Path -LiteralPath $studioPidFile) {
    $studioState = Get-Content -LiteralPath $studioPidFile -Raw | ConvertFrom-Json
    if ([IO.Path]::GetFullPath($studioState.root) -ne $studioRoot) { throw 'The recorded process belongs to another workspace.' }
    $studioProcess = Get-Process -Id $studioState.pid -ErrorAction SilentlyContinue
    if ($studioProcess) {
        $studioRecorded = [DateTime]::Parse($studioState.started).ToUniversalTime()
        if ([Math]::Abs(($studioProcess.StartTime.ToUniversalTime()-$studioRecorded).TotalSeconds) -gt 2) { throw 'The process ID was reused. Stop the original application from its terminal.' }
        & taskkill.exe /PID $studioProcess.Id /T /F | Out-Null
    }
    Remove-Item -LiteralPath $studioPidFile
}
$studioPg = 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe'
if (Test-Path -LiteralPath $studioPg) { & $studioPg -D (Join-Path $studioRoot '.local_pg') -m fast -w -t 20 stop }
Write-Output 'Stopped the managed application and its project database.'
