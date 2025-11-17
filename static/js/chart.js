/*
 * @Description: Copyright (c) ydfk. All rights reserved
 * @Author: ydfk
 * @Date: 2025-11-17 18:56:12
 * @LastEditors: ydfk
 * @LastEditTime: 2025-11-17 19:14:26
 */
document.addEventListener("DOMContentLoaded", function () {
  var canvas = document.getElementById("lineChart");
  if (!canvas) {
    return;
  }

  fetch("/api/chart/data")
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      var ctx = canvas.getContext("2d");

      new Chart(ctx, {
        type: "line",
        data: {
          labels: data.labels || [],
          datasets: [
            {
              label: data.seriesName || "数据",
              data: data.values || [],
              fill: false,
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 2,
              tension: 0.25,
              pointRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          scales: {
            x: {
              title: {
                display: !!data.xLabel,
                text: data.xLabel || "",
              },
            },
            y: {
              title: {
                display: !!data.yLabel,
                text: data.yLabel || "",
              },
              beginAtZero: true,
            },
          },
          plugins: {
            legend: {
              display: true,
            },
            tooltip: {
              enabled: true,
            },
          },
        },
      });
    })
    .catch(function (err) {
      console.error("加载图表数据失败:", err);
    });
});
