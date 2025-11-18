# Docker 镜像推送脚本 - Docker Hub
# 使用方法: .\scripts\push-lxy-registry.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "推送到 Docker Hub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取项目根目录
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR

# Docker Hub 配置
$DOCKER_USERNAME = "ydfk"
$PROJECT_NAME = "slim-track"
$LOCAL_IMAGE = "${PROJECT_NAME}:latest"
$REMOTE_IMAGE = "${DOCKER_USERNAME}/${PROJECT_NAME}:latest"

Write-Host "本地镜像: $LOCAL_IMAGE" -ForegroundColor Green
Write-Host "Docker Hub 用户: $DOCKER_USERNAME" -ForegroundColor Green
Write-Host "目标镜像: $REMOTE_IMAGE" -ForegroundColor Green
Write-Host ""

# 检查本地镜像是否存在
Write-Host "[1/4] 检查本地镜像..." -ForegroundColor Yellow
$imageExists = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String -Pattern "^${PROJECT_NAME}:latest" -Quiet

if (-not $imageExists) {
    Write-Host "  错误: 本地镜像 $LOCAL_IMAGE 不存在" -ForegroundColor Red
    Write-Host "  请先运行构建脚本: .\scripts\build-docker.ps1" -ForegroundColor Yellow
    exit 1
}
Write-Host "  本地镜像存在" -ForegroundColor Green
Write-Host ""

# 检查是否已登录 Docker Hub
Write-Host "[2/4] 检查 Docker Hub 登录状态..." -ForegroundColor Yellow
$loginCheck = docker info 2>&1 | Select-String -Pattern "Username: $DOCKER_USERNAME" -Quiet

if (-not $loginCheck) {
    Write-Host "  未检测到登录状态，尝试登录到 Docker Hub" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请输入 Docker Hub 凭据:" -ForegroundColor Cyan
    docker login

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  登录失败!" -ForegroundColor Red
        Write-Host "  提示: 请确保用户名和密码正确" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "  已登录到 Docker Hub" -ForegroundColor Green
}
Write-Host ""

# 标记镜像
Write-Host "[3/4] 标记镜像..." -ForegroundColor Yellow
Write-Host "  标记: ${LOCAL_IMAGE} -> ${REMOTE_IMAGE}" -ForegroundColor Gray
docker tag $LOCAL_IMAGE $REMOTE_IMAGE

if ($LASTEXITCODE -eq 0) {
    Write-Host "  标记成功" -ForegroundColor Green
} else {
    Write-Host "  标记失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 推送镜像
Write-Host "[4/4] 推送镜像到仓库..." -ForegroundColor Yellow
Write-Host "  推送镜像: $REMOTE_IMAGE" -ForegroundColor Cyan

docker push $REMOTE_IMAGE

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ 镜像推送成功" -ForegroundColor Green
} else {
    Write-Host "  推送失败!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 完成
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ 推送完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "推送成功信息:" -ForegroundColor Cyan
Write-Host "  Docker Hub 用户: $DOCKER_USERNAME" -ForegroundColor White
Write-Host "  镜像地址: $REMOTE_IMAGE" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "在其他机器上拉取并使用" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "docker pull $REMOTE_IMAGE" -ForegroundColor White
Write-Host "docker run -d -p 8080:8080 $REMOTE_IMAGE" -ForegroundColor White
Write-Host ""

# 显示推送的镜像信息
Write-Host "镜像详情:" -ForegroundColor Cyan
docker images | Select-String -Pattern $PROJECT_NAME | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
Write-Host ""
