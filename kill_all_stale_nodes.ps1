Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object {
    $_.CommandLine -notlike '*mcp-remote*' -and
    $_.CommandLine -notlike '*antigravity*' -and
    $_.CommandLine -notlike '*stitch*'
} | ForEach-Object {
    Write-Host "Killing process: $_.ProcessId - $_.CommandLine"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
