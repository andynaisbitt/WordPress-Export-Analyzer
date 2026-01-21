Write-Host "=== WORDPRESS EXPORT ANALYZER - DIAGNOSTIC SCRIPT (PS SAFE) ===" -ForegroundColor Cyan
Write-Host ""

Set-Location "C:\Dev\Wordpress Extraction"

# Helper to capture output to file + console
function Run-AndLog {
    param(
        [Parameter(Mandatory=$true)][string]$Title,
        [Parameter(Mandatory=$true)][string]$Command,
        [Parameter(Mandatory=$true)][string]$LogFile
    )
    Write-Host "`n[$Title]" -ForegroundColor Yellow
    Write-Host ">>> $Command" -ForegroundColor DarkGray
    cmd /c "$Command" 2>&1 | Tee-Object -FilePath $LogFile -Append
}

# Clean old logs
"build_log.txt","runtime_log.txt","sqlite_log.txt","env_log.txt","python_log.txt" | ForEach-Object {
    if (Test-Path $_) { Remove-Item $_ -Force }
}

# 1) Inventory
Write-Host "`n[1] Listing .csproj files..." -ForegroundColor Yellow
Get-ChildItem -Recurse -Filter *.csproj | Select-Object FullName | Tee-Object -FilePath env_log.txt -Append

Write-Host "`n[2] Tooling versions..." -ForegroundColor Yellow
Run-AndLog -Title "dotnet --info" -Command "dotnet --info" -LogFile "env_log.txt"

# 3) Build (MSBuild)
if (Test-Path ".\Wordpress Extraction.sln") {
    Run-AndLog -Title "3) MSBuild Clean+Rebuild (Debug)" `
        -Command "msbuild `"Wordpress Extraction.sln`" /t:Clean,Rebuild /p:Configuration=Debug /v:m" `
        -LogFile "build_log.txt"
} else {
    Write-Host "❌ Solution file not found at root. Skipping msbuild step." -ForegroundColor Red
}

# 4) Find exe(s)
Write-Host "`n[4] Searching for built executables..." -ForegroundColor Yellow
$exeCandidates = Get-ChildItem -Recurse -Filter *.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match "\\bin\\(Debug|Release)\\" }

if ($exeCandidates) {
    Write-Host "Found EXEs:" -ForegroundColor Green
    $exeCandidates.FullName | Tee-Object -FilePath runtime_log.txt -Append
} else {
    Write-Host "❌ No EXE found in bin\\Debug or bin\\Release (build may have failed)." -ForegroundColor Red
}

# 5) Try run the first EXE found
Write-Host "`n[5] Attempting to launch the app (first EXE found)..." -ForegroundColor Yellow
if ($exeCandidates -and $exeCandidates.Count -gt 0) {
    $exePath = $exeCandidates[0].FullName
    Write-Host "Launching: $exePath" -ForegroundColor DarkGray
    try {
        # Start-Process keeps the script alive; we just log the start.
        Start-Process -FilePath $exePath
        "Launched: $exePath" | Tee-Object -FilePath runtime_log.txt -Append
    } catch {
        "EXE launch error: $($_.Exception.Message)" | Tee-Object -FilePath runtime_log.txt -Append
        Write-Host "❌ Failed to launch EXE." -ForegroundColor Red
    }
} else {
    Write-Host "Skipping launch (no EXE)." -ForegroundColor DarkYellow
}

# 6) XML presence
Write-Host "`n[6] Checking XML file presence..." -ForegroundColor Yellow
$xmlPath = ".\theitapprentice.WordPress.2024-08-17.xml"
if (Test-Path $xmlPath) {
    Write-Host "✅ XML found: $xmlPath" -ForegroundColor Green
} else {
    Write-Host "❌ XML missing: $xmlPath" -ForegroundColor Red
}

# 7) SQLite presence + table list (requires sqlite3 on PATH)
Write-Host "`n[7] Checking SQLite DB + listing tables (if sqlite3 exists)..." -ForegroundColor Yellow
$dbPath = ".\wordpress_extracted_data.db"
if (Test-Path $dbPath) {
    Write-Host "✅ DB found: $dbPath" -ForegroundColor Green

    $sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
    if ($sqlite) {
        Run-AndLog -Title "SQLite table list" `
            -Command "sqlite3 `"wordpress_extracted_data.db`" `"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`"" `
            -LogFile "sqlite_log.txt"
    } else {
        Write-Host "⚠ sqlite3 not found on PATH. Install sqlite tools or skip." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "❌ DB missing: $dbPath" -ForegroundColor Red
}

# 8) Python check + XML parse smoke test (PowerShell-safe)
Write-Host "`n[8] Python environment + XML parse smoke test..." -ForegroundColor Yellow

Run-AndLog -Title "Python version" -Command "python --version" -LogFile "python_log.txt"
Run-AndLog -Title "Pip quick deps check" -Command "pip list | findstr /i `"flask bs4 beautifulsoup4 lxml requests`"" -LogFile "python_log.txt"

# Create a small python file instead of using heredoc
$py = @"
import xml.etree.ElementTree as ET
xml_path = r"theitapprentice.WordPress.2024-08-17.xml"
try:
    tree = ET.parse(xml_path)
    root = tree.getroot()
    print("XML loaded successfully.")
    print("Root tag:", root.tag)
except Exception as e:
    print("XML error:", e)
"@

$pyFile = ".\_xml_smoketest.py"
Set-Content -Path $pyFile -Value $py -Encoding UTF8
Run-AndLog -Title "Run XML smoketest" -Command "python `_xml_smoketest.py" -LogFile "python_log.txt"
Remove-Item $pyFile -Force -ErrorAction SilentlyContinue

Write-Host "`n=== DONE ===" -ForegroundColor Cyan
Write-Host "Send me these files (copy/paste contents or upload):" -ForegroundColor Cyan
Write-Host " - build_log.txt"
Write-Host " - env_log.txt"
Write-Host " - python_log.txt"
Write-Host " - sqlite_log.txt (if created)"
Write-Host " - runtime_log.txt"
