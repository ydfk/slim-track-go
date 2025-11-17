package router

import (
	"github.com/gin-gonic/gin"

	"slim-track/internal/handler"
)

// SetupRouter 初始化 Gin 引擎和路由
func SetupRouter() *gin.Engine {
	r := gin.Default()

	// 静态资源
	r.Static("/static", "./static")

	// 模板
	r.LoadHTMLGlob("templates/*.html")

	// 注册路由
	handler.RegisterChartRoutes(r)

	return r
}
