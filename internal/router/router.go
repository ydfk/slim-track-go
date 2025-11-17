package router

import (
	"github.com/gin-gonic/gin"

	"slim-track/internal/handler"
	"slim-track/internal/storage"
)

// SetupRouter ��ʼ�� Gin �����·��
func SetupRouter(repo *storage.Repository) *gin.Engine {
	r := gin.Default()

	// ��̬��Դ
	r.Static("/static", "./static")

	// ģ��
	r.LoadHTMLGlob("templates/*.html")

	// ע��·��
	handler.RegisterTrackerRoutes(r, repo)

	return r
}
