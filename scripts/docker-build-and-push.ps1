# Docker 一键构建并推送到 Docker Hub
# 使用方法: .\scripts\build-and-push.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "slim-track 一键构建并推送到 Docker Hub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取项目根目录
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR

Set-Location $PROJECT_ROOT

# 步骤 1: 构建镜像
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "步骤 1/2: 构建 Docker 镜像" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

& "$SCRIPT_DIR\docker-build.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "构建失败，停止推送!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ 镜像构建成功" -ForegroundColor Green
Write-Host ""

# 等待一下
Start-Sleep -Seconds 2

# 步骤 2: 推送到镜像仓库
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "步骤 2/2: 推送到镜像仓库" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

& "$SCRIPT_DIR\docker-push.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "推送失败!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ 全部完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "镜像已推送到 Docker Hub:" -ForegroundColor Cyan
Write-Host "  ydfk/slim-track:latest" -ForegroundColor White
Write-Host ""
