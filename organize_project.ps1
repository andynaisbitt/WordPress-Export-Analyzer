# PowerShell script to organize the WordPress Export Analyzer project

# --- Create new directories ---
Write-Host "Creating new directories..."
New-Item -ItemType Directory -Path "src" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "legacy" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "legacy/csharp" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "legacy/python" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "legacy/flask" -ErrorAction SilentlyContinue

# --- Handle existing 'archive' directory ---
$archiveDir = "archive"
if (Test-Path $archiveDir) {
    # If 'archive' exists, rename it to avoid conflicts
    $renamedArchiveDir = "archive_old"
    Write-Host "Existing 'archive' directory found. Renaming to '$renamedArchiveDir'."
    Rename-Item -Path $archiveDir -NewName $renamedArchiveDir -ErrorAction SilentlyContinue
}
# Create a new, clean 'archive' directory
New-Item -ItemType Directory -Path $archiveDir -ErrorAction SilentlyContinue
# Move content of the old archive to the new one
if (Test-Path $renamedArchiveDir) {
    Get-ChildItem -Path $renamedArchiveDir | ForEach-Object {
        Move-Item -Path $_.FullName -Destination $archiveDir
    }
    # Remove the old renamed archive directory
    Remove-Item -Recurse -Force -Path $renamedArchiveDir
}


# --- Move C# application files ---
Write-Host "Moving C# application files to legacy/csharp..."
if (Test-Path "WordpressExtractorModularApp") { Move-Item -Path "WordpressExtractorModularApp" -Destination "legacy/csharp/" -Force }
if (Test-Path "WordpressExtractorWinFormsApp") { Move-Item -Path "WordpressExtractorWinFormsApp" -Destination "legacy/csharp/" -Force }
if (Test-Path "Wordpress Extraction.sln") { Move-Item -Path "Wordpress Extraction.sln" -Destination "legacy/csharp/" -Force }

# --- Move Python scripts ---
Write-Host "Moving Python scripts to legacy/python..."
Get-ChildItem -Path "." -Filter "*.py" | ForEach-Object {
    if ($_.Name -ne "flask_app.py") {
        Move-Item -Path $_.FullName -Destination "legacy/python/" -Force
    }
}

# --- Move Flask application files ---
Write-Host "Moving Flask application files to legacy/flask..."
if (Test-Path "flask_app.py") { Move-Item -Path "flask_app.py" -Destination "legacy/flask/" -Force }
if (Test-Path "templates") { Move-Item -Path "templates" -Destination "legacy/flask/" -Force }
if (Test-Path "static") { Move-Item -Path "static" -Destination "legacy/flask/" -Force }

# --- Move CSV and log files to archive ---
Write-Host "Moving CSV and log files to archive..."
Get-ChildItem -Path "." -Filter "*.csv" | ForEach-Object {
    Move-Item -Path $_.FullName -Destination "archive/" -Force
}
Get-ChildItem -Path "." -Filter "*.txt" | Where-Object { $_.Name -like "*_log.txt" } | ForEach-Object {
    Move-Item -Path $_.FullName -Destination "archive/" -Force
}
if (Test-Path "build_log.txt") { Move-Item -Path "build_log.txt" -Destination "archive/" -Force }

# --- Update .gitignore ---
Write-Host "Updating .gitignore..."
$gitignoreContent = @"
# Dependencies
/node_modules
/venv
/.venv
/env
/.env

# Database
*.db
*.sqlite3

# Exported data
*.csv
*.json

# Uploads
uploads/
*.xml

# HTML content
all_blog_posts/
all_pages/

# C# build artifacts
[Bb]in/
[Oo]bj/

# Python cache
__pycache__/
*.pyc

# IDE files
.idea/
.vscode/

# Build artifacts (general)
dist/
build/
*.egg-info/

# OS-specific & Tooling
.DS_Store
Thumbs.db
gemini.md
.gemini-clipboard/
.gemini-clipboard

# Logs
*.log
"@
Set-Content -Path ".gitignore" -Value $gitignoreContent

Write-Host "Project organization script updated. Please review and run it manually."