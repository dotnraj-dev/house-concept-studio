$ErrorActionPreference = 'Stop'
$studioRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $studioRoot
$studioPg = 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe'
if (!(Test-Path -LiteralPath (Join-Path $studioRoot '.env'))) { throw 'Create .env from .env.example before starting.' }
if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { Write-Output 'A web server is already listening at http://127.0.0.1:5173/'; exit 0 }
if (!(Get-NetTCPConnection -LocalPort 5434 -State Listen -ErrorAction SilentlyContinue)) {
    if (!(Test-Path -LiteralPath $studioPg)) { throw 'PostgreSQL 17 was not found. Configure and start PostgreSQL before running the application.' }
    & $studioPg -D (Join-Path $studioRoot '.local_pg') -l (Join-Path $studioRoot '.local-postgres.log') -o '-p 5434 -h 127.0.0.1' -w -t 20 start
    if ($LASTEXITCODE -ne 0) { throw 'Project PostgreSQL could not start.' }
}
$studioProcess = Start-Process -FilePath $env:ComSpec -ArgumentList @('/d','/c','npm run dev') -WorkingDirectory $studioRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $studioRoot '.local-app.stdout.log') -RedirectStandardError (Join-Path $studioRoot '.local-app.stderr.log') -PassThru
@{ pid=$studioProcess.Id; started=$studioProcess.StartTime.ToUniversalTime().ToString('o'); root=$studioRoot } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $studioRoot '.local-app.pid.json')
for ($studioAttempt=0; $studioAttempt -lt 30; $studioAttempt++) {
    try { $studioHealth=Invoke-RestMethod 'http://127.0.0.1:5173/api/health' -TimeoutSec 2; if ($studioHealth.ok) { Write-Output 'House Concept Studio is running at http://127.0.0.1:5173/'; exit 0 } } catch {}
    Start-Sleep -Seconds 1
}
throw 'Startup did not finish. Inspect .local-app.stderr.log and .local-app.stdout.log.'
