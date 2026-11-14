param(
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-zA-Z0-9.-]+$')][string]$HostName,
    [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$UserName = 'root',
    [ValidateRange(1,65535)][int]$Port = 22,
    [string]$IdentityFile = ''
)
$ErrorActionPreference = 'Stop'
if (Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 8787 is already in use. Close the previous tunnel or worker first.' }
$studioSshArgs = @('-N','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-L','127.0.0.1:8787:127.0.0.1:8787','-p',"$Port")
if ($IdentityFile) {
    if (!(Test-Path -LiteralPath $IdentityFile -PathType Leaf)) { throw 'SSH identity file was not found.' }
    $studioSshArgs += @('-i',[IO.Path]::GetFullPath($IdentityFile))
}
$studioSshArgs += "$UserName@$HostName"
Write-Output 'Opening the GPU tunnel at http://127.0.0.1:8787. Leave this terminal open; Ctrl+C closes only the tunnel, not the GPU rental.'
& ssh @studioSshArgs
exit $LASTEXITCODE
