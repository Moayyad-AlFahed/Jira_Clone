# Run in PowerShell **as Administrator** (right-click → Run as administrator)
# Fixes: index.lock, "unable to write new index file", rename index.lock → index failed
#
# Cause: .git was created under another Windows user; index files are owned by that SID.

param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
$gitDir = Join-Path $RepoRoot '.git'

Write-Host "Repo: $RepoRoot"
Write-Host "Fixing ownership under: $gitDir"

Get-Process -Name git -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $gitDir 'index.lock')

takeown /F $gitDir /R /D Y
icacls $gitDir /reset /T /C
icacls $gitDir /grant "${env:USERDOMAIN}\${env:USERNAME}:(OI)(CI)F" /T

Set-Location $RepoRoot
git status
Write-Host ""
Write-Host "If git status succeeded, run: git add -A && git commit ... && git push"
