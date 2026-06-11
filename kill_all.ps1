Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object {
    $_.CommandLine -notlike '*mcp*'
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
