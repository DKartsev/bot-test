# Script for automatic commit of changes
# Usage: .\auto-commit.ps1 [commit_message]

param(
    [string]$CommitMessage = "Auto commit: updates"
)

Write-Host "Checking Git status..." -ForegroundColor Yellow

# Check if there are changes
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to commit" -ForegroundColor Green
    exit 0
}

Write-Host "Found changes:" -ForegroundColor Cyan
git status --short

# Add all files
Write-Host "Adding all files..." -ForegroundColor Yellow
git add .

# Make commit
Write-Host "Creating commit..." -ForegroundColor Yellow
try {
    git commit --no-verify -m $CommitMessage
    Write-Host "Commit created successfully: $CommitMessage" -ForegroundColor Green
    
    # Show commit info
    $lastCommit = git log -1 --oneline
    Write-Host "Last commit: $lastCommit" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error creating commit: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Auto commit completed!" -ForegroundColor Green
