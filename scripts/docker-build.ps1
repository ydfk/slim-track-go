# Docker 镜像构建脚本 (Windows PowerShell)
# 使用方法: .\scripts\build-docker.ps1

# 设置错误时停止
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Docker 镜像构建脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取项目根目录
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR

# 切换到项目根目录
Set-Location $PROJECT_ROOT

# 项目信息
$PROJECT_NAME = "slim-track"
$IMAGE_NAME = "${PROJECT_NAME}:latest"

Write-Host "项目根目录: $PROJECT_ROOT" -ForegroundColor Cyan
Write-Host "镜像名称: $IMAGE_NAME" -ForegroundColor Cyan
Write-Host ""

# 切换到项目根目录
Set-Location $PROJECT_ROOT

# 构建 Docker 镜像
Write-Host "[2/4] 开始构建 Docker 镜像..." -ForegroundColor Yellow
Write-Host "  执行命令: docker build -t $IMAGE_NAME ." -ForegroundColor Gray

try {
    docker build -t $IMAGE_NAME .

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  镜像构建成功!" -ForegroundColor Green
    } else {
        throw "Docker 构建失败，退出码: $LASTEXITCODE"
    }
} catch {
    Write-Host "  错误: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 查看镜像信息
Write-Host "[3/4] 镜像信息:" -ForegroundColor Yellow
docker images | Select-String -Pattern $PROJECT_NAME
Write-Host ""

# 输出镜像大小
$IMAGE_SIZE = docker images --format "{{.Size}}" $IMAGE_NAME
Write-Host "[4/4] 构建完成!" -ForegroundColor Green
Write-Host "  镜像名称: $IMAGE_NAME" -ForegroundColor Cyan
Write-Host "  镜像大小: $IMAGE_SIZE" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "镜像历史:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
docker images | Select-String -Pattern $PROJECT_NAME | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
Write-Host ""