/*
 * @Description: Copyright (c) ydfk. All rights reserved
 * @Author: ydfk
 * @Date: 2025-11-17 18:54:32
 * @LastEditors: ydfk
 * @LastEditTime: 2025-11-17 19:12:15
 */
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterChartRoutes 注册折线图相关路由
func RegisterChartRoutes(r *gin.Engine) {
	// 首页和 /chart 指向同一页面
	r.GET("/", ChartPage)
	r.GET("/chart", ChartPage)

	api := r.Group("/api")
	{
		api.GET("/chart/data", ChartData)
	}
}

// ChartPage 页面：渲染折线图 HTML
func ChartPage(c *gin.Context) {
	c.HTML(http.StatusOK, "chart", gin.H{
		"Title": "折线图示例",
	})
}

// ChartData API：返回折线图数据
func ChartData(c *gin.Context) {
	labels := []string{"周一", "周二", "周三", "周四", "周五", "周六", "周日"}
	values := []int{120, 132, 101, 134, 90, 230, 210}

	c.JSON(http.StatusOK, gin.H{
		"labels":     labels,
		"values":     values,
		"seriesName": "访问量",
		"xLabel":     "日期",
		"yLabel":     "访问量",
	})
}
