$ErrorActionPreference = "SilentlyContinue"
$report = @{}

# 1. TypeScript Strictness
$anyCount = (Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern ":\s*any" -AllMatches).Count
if ($null -eq $anyCount) { $anyCount = 0 }
$ignoreCount = (Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "@ts-ignore|@ts-expect-error" -AllMatches).Count
if ($null -eq $ignoreCount) { $ignoreCount = 0 }
$report["TS_any"] = $anyCount
$report["TS_ignore"] = $ignoreCount

# 4. Complexity
$allSrcFiles = Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse
$filesOver300 = 0
$componentsOver150 = 0
$totalLines = 0
$emptyFilesCount = 0

foreach ($file in $allSrcFiles) {
    $lines = (Get-Content $file.FullName | Measure-Object -Line).Lines
    if ($null -eq $lines) { $lines = 0 }
    $totalLines += $lines
    if ($lines -gt 300) { $filesOver300++ }
    if ($file.FullName -match "src\\components" -and $file.Name -match "\.tsx$" -and $lines -gt 150) {
        $componentsOver150++
    }
    if ($lines -lt 5) {
        $emptyFilesCount++
    }
}
$report["filesOver300"] = $filesOver300
$report["componentsOver150"] = $componentsOver150
$report["totalSourceFiles"] = $allSrcFiles.Count
$report["totalLines"] = $totalLines
$report["emptyFilesCount"] = $emptyFilesCount

# 5. Forbidden patterns
$forbidden1 = (Select-String -Path "src\**\*.tsx" -Pattern "text-white|text-black|bg-white|bg-black" -AllMatches).Count
$forbidden2 = (Select-String -Path "src\**\*.tsx" -Pattern "text-blue-|text-red-|text-green-|bg-blue-|bg-red-|bg-green-" -AllMatches).Count
$forbidden3 = (Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "forwardRef|useFormState" -AllMatches).Count
$forbidden4 = (Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "console\.log" -AllMatches).Count
$forbidden5 = (Select-String -Path "src\app\**\page.tsx" -Pattern "`"use server`"" -AllMatches).Count

if ($null -eq $forbidden1) { $forbidden1 = 0 }
if ($null -eq $forbidden2) { $forbidden2 = 0 }
if ($null -eq $forbidden3) { $forbidden3 = 0 }
if ($null -eq $forbidden4) { $forbidden4 = 0 }
if ($null -eq $forbidden5) { $forbidden5 = 0 }

$report["forbidden1"] = $forbidden1
$report["forbidden2"] = $forbidden2
$report["forbidden3"] = $forbidden3
$report["forbidden4"] = $forbidden4
$report["forbidden5"] = $forbidden5

# 6. Test Coverage Estimate
$testFiles = Get-ChildItem -Path src -Include *.test.ts,*.test.tsx,*.spec.ts -Recurse
$report["testFilesCount"] = @($testFiles).Count

# 7. Churn Rate
$churn = git log --since="30 days ago" --name-only --pretty=format: | Where-Object { $_ -match '\S' } | Group-Object | Sort-Object Count -Descending | Select-Object Name, Count -First 20
$report["churn"] = $churn

# 10. Orphan scripts
$orphanScripts = Get-ChildItem -Path scripts -Include *.ts -Recurse | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Select-Object Name
$report["orphanScripts"] = $orphanScripts

$report | ConvertTo-Json -Depth 5 | Out-File "debt_metrics.json" -Encoding utf8
