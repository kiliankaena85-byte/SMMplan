Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object {
    $_.CommandLine -like '*next*' -or 
    $_.CommandLine -like '*playwright*' -or 
    $_.CommandLine -like '*eslint*'
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
