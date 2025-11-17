/*
 * @Description: Copyright (c) ydfk. All rights reserved
 * @Author: ydfk
 * @Date: 2025-11-17 18:53:11
 * @LastEditors: ydfk
 * @LastEditTime: 2025-11-17 19:07:28
 */
package main

import (
	"log"

	"slim-track/internal/router"
)

func main() {
	r := router.SetupRouter()

	log.Println("server listening on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
