# Slim Track

Slim Track 是一个由 Go 构建的「体重 / 腰围」记录与可视化小工具，提供简洁的录入界面、历史查询以及 Chart.js 驱动的图表分析，帮助你在本地或私有环境中安全地追踪身体数据。

## ✨ 主要特性
- **一键录入**：按日期保存体重（斤 / 千克自动换算）、腰围与备注，重复日期自动覆盖，避免重复数据。
- **富交互前端**：Bootstrap 5 + 原生 JS，支持分页、表格内一键填充当天数据、单位切换（斤 ↔ 千克）、横/竖向图表切换、移动端自适应。
- **图表分析**：基于 Chart.js 的体重、腰围趋势图，可按需刷新并选择不同展示方式。
- **纯本地数据**：SQLite 文件默认保存在项目目录（可通过 `DATABASE_PATH` 改到任意路径），便于备份与同步。
- **开箱即用**：`go run .` 直接启动，也可使用提供的多阶段 Dockerfile / `docker compose up` 迅速部署。

## 🧰 技术栈
- **后端**：Go 1.25、Gin、modernc.org/sqlite（纯 Go SQLite 驱动）
- **前端**：Bootstrap 5、Chart.js、原生 JavaScript
- **构建与部署**：多阶段 Dockerfile、Docker Compose（持久化 Volume）

## 🚀 快速开始
### 1. 准备环境
- Go 1.25+
- （可选）Docker 24+

### 2. 本地运行
```bash
git clone https://github.com/<your-account>/slim-track-go.git
cd slim-track-go
go mod download

# 如需自定义数据库位置，提前导出环境变量
# set DATABASE_PATH=./data/slimtrack.db   # Windows PowerShell
# export DATABASE_PATH=./data/slimtrack.db # macOS / Linux

go run .
```
访问 `http://localhost:8080` 即可看到页面。首次启动会自动创建数据库文件及 `WeightEntries` 表。

### 3. Docker / Compose
```bash
# 直接使用 Dockerfile
docker build -t slim-track:latest .
docker run -d --name slim-track \
  -p 8080:8080 \
  -e DATABASE_PATH=/data/slim-track.db \
  -v slim-track-data:/data \
  slim-track:latest

# 或者使用 docker-compose.yml
docker compose up -d
```
容器会把 SQLite 文件保存到名为 `slim-track-data` 的 volume 中，方便备份。

## 📁 目录结构
```
.
├── main.go               # 入口，初始化 SQLite 与路由
├── internal/
│   ├── handler/          # HTTP Handler（录入、查询 API）
│   ├── router/           # Gin 路由初始化
│   └── storage/          # SQLite Repository
├── templates/            # Gin 模板（Bootstrap + Chart.js 页面）
├── static/               # 前端静态资源（CSS / JS）
├── scripts/              # 辅助脚本
├── Dockerfile            # 多阶段镜像
└── docker-compose.yml    # 一键本地/私有部署
```

## 🧩 API 速览
| 方法 | 路径 | 描述 |
| ---- | ---- | ---- |
| `GET /` | — | 渲染 Web 页面 |
| `GET /api/entries?limit=&page=` | 分页获取历史记录；`limit<=0` 时返回全部 |
| `POST /api/entries` | 新建/更新某日期的记录 |

`POST /api/entries` 请求体示例：
```json
{
  "date": "2025-11-18",
  "weightJin": 110.5,
  "waistCm": 83.2,
  "note": "低碳日 + 20 分钟力量训练"
}
```
返回字段包括 `weightKg`（千克）、`weightJin`（斤）、`waistCm`、`note`、`createdAt`、`updatedAt` 等，方便前端直接展示。

## 🗄️ 数据存储
- 默认数据库位置：`./slimtrack.db`
- 可通过环境变量 `DATABASE_PATH` 指向任意路径或挂载卷
- 数据表：`WeightEntries`
  - `Date`（唯一索引，用于 upsert）
  - `WeightGongJin`（千克）、`WeightJin`（斤）、`WaistCircumference`、`Note`
  - `CreatedAt` / `UpdatedAt`

## 📜 许可证
本项目使用 `MIT License`（见 `LICENSE` 文件）。

欢迎提交 Issue / PR，或把你的使用体验分享给我们 🙌
