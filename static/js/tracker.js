(() => {
  const state = {
    entries: [],
    weightUnit: "jin",
  };

  let weightChart;
  let waistChart;

  const selectors = {
    form: document.getElementById("entryForm"),
    date: document.getElementById("entryDate"),
    weightJin: document.getElementById("weightJin"),
    weightKgPreview: document.getElementById("weightKgPreview"),
    waistCm: document.getElementById("waistCm"),
    note: document.getElementById("note"),
    tableBody: document.getElementById("entryTableBody"),
    formStatus: document.getElementById("formStatus"),
    refreshEntries: document.getElementById("refreshEntries"),
    chartRefreshButtons: document.querySelectorAll("[data-chart-refresh]"),
    weightUnitButtons: document.querySelectorAll("[data-weight-unit]"),
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!selectors.form) {
      return;
    }

    setDefaultDate();
    updateWeightPreview();

    selectors.form.addEventListener("submit", handleSubmit);
    selectors.weightJin.addEventListener("input", updateWeightPreview);

    if (selectors.refreshEntries) {
      selectors.refreshEntries.addEventListener("click", () => loadEntries(true));
    }

    selectors.chartRefreshButtons.forEach((btn) => {
      btn.addEventListener("click", () => loadEntries(true));
    });

    selectors.weightUnitButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const unit = btn.getAttribute("data-weight-unit");
        if (!unit || state.weightUnit === unit) {
          return;
        }
        state.weightUnit = unit;
        updateWeightUnitButtons();
        renderCharts(state.entries);
      });
    });

    updateWeightUnitButtons();
    loadEntries(false);
  });

  function setDefaultDate() {
    if (selectors.date.value) {
      return;
    }
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    selectors.date.value = `${today.getFullYear()}-${month}-${day}`;
  }

  function updateWeightPreview() {
    if (!selectors.weightJin || !selectors.weightKgPreview) {
      return;
    }
    const jin = parseFloat(selectors.weightJin.value);
    if (!isFinite(jin) || jin <= 0) {
      selectors.weightKgPreview.value = "";
      return;
    }
    const kg = jin / 2;
    selectors.weightKgPreview.value = `${formatNumber(kg, 2)} 公斤`;
  }

  async function loadEntries(showFeedback) {
    setFormStatus(showFeedback ? "正在刷新数据..." : "");
    try {
      const response = await fetch("/api/entries");
      if (!response.ok) {
        throw new Error("加载失败");
      }
      const payload = await response.json();
      state.entries = Array.isArray(payload.entries) ? payload.entries : [];
      renderTable(state.entries);
      renderCharts(state.entries);
      if (showFeedback) {
        setFormStatus("数据已更新", "success");
      } else {
        setFormStatus("");
      }
    } catch (error) {
      console.error("加载数据失败", error);
      setFormStatus("加载数据失败，请稍后再试", "error");
    }
  }

  function renderTable(entries) {
    if (!selectors.tableBody) {
      return;
    }
    selectors.tableBody.innerHTML = "";

    if (!entries.length) {
      const row = selectors.tableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 6;
      cell.className = "text-center text-muted py-4";
      cell.textContent = "暂无记录";
      return;
    }

    entries.forEach((entry) => {
      const row = selectors.tableBody.insertRow();
      row.insertCell().textContent = entry.date || "--";
      row.insertCell().textContent = formatNumber(entry.weightKg, 2);
      row.insertCell().textContent = formatNumber(entry.weightJin, 1);
      row.insertCell().textContent = entry.waistCm != null ? formatNumber(entry.waistCm, 1) : "--";
      row.insertCell().textContent = entry.note || "--";
      // row.insertCell().textContent = formatDateTime(entry.updatedAt);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const submitButton = selectors.form.querySelector("button[type=submit]");
    submitButton.disabled = true;
    setFormStatus("正在保存...");

    const payload = buildPayload();
    if (!payload) {
      setFormStatus("请检查输入内容", "error");
      submitButton.disabled = false;
      return;
    }

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const msg = await response.json().catch(() => ({}));
        throw new Error(msg.error || "保存失败");
      }

      setFormStatus("保存成功", "success");
      selectors.form.reset();
      updateWeightPreview();
      setDefaultDate();
      await loadEntries(false);
    } catch (error) {
      console.error("保存失败", error);
      setFormStatus(error.message || "保存失败，请稍后再试", "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  function buildPayload() {
    const date = selectors.date.value;
    const weightJin = parseFloat(selectors.weightJin.value);
    const waistValue = parseFloat(selectors.waistCm.value);

    if (!date || !isFinite(weightJin) || weightJin <= 0) {
      return null;
    }

    return {
      date,
      weightJin,
      waistCm: isFinite(waistValue) && waistValue > 0 ? waistValue : null,
      note: selectors.note.value.trim(),
    };
  }

  function renderCharts(entries) {
    if (typeof Chart === "undefined") {
      return;
    }

    const chronological = [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const labels = chronological.map((entry) => formatChartLabel(entry.date));
    const isKgUnit = state.weightUnit === "kg";
    const weights = chronological.map((entry) => {
      if (isKgUnit) {
        return entry.weightKg || 0;
      }
      return entry.weightJin || 0;
    });

    const waistEntries = chronological.filter((entry) => entry.waistCm != null);
    const waistLabels = waistEntries.map((entry) => formatChartLabel(entry.date));
    const waists = waistEntries.map((entry) => entry.waistCm || 0);

    weightChart = mountChart(
      "weightChart",
      weightChart,
      labels,
      weights,
      isKgUnit ? "\u4f53\u91cd\uff08\u516c\u65a4\uff09" : "\u4f53\u91cd\uff08\u65a4\uff09",
      "rgba(78, 115, 223, 1)",
      isKgUnit ? 2 : 1
    );

    waistChart = mountChart("waistChart", waistChart, waistLabels, waists, "\u8170\u56f4\uff08\u5398\u7c73\uff09", "rgba(54, 185, 204, 1)", 1);
  }

  function mountChart(canvasId, instance, labels, values, labelText, color, valueDigits) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return instance;
    }
    if (instance) {
      instance.destroy();
    }

    return new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: labelText,
            data: values,
            borderColor: color,
            backgroundColor: color,
            tension: 0.35,
            fill: false,
            borderWidth: 3,
            pointRadius: window.matchMedia("(min-width: 768px)").matches ? 4 : 3,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "nearest",
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxTicksLimit: window.matchMedia("(min-width: 992px)").matches ? 12 : 6,
            },
          },
          y: {
            beginAtZero: false,
            grid: {
              color: "rgba(0,0,0,0.05)",
            },
          },
        },
        plugins: {
          legend: {
            display: true,
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y, valueDigits)}`,
            },
          },
        },
      },
    });
  }

  function updateWeightUnitButtons() {
    selectors.weightUnitButtons.forEach((btn) => {
      const unit = btn.getAttribute("data-weight-unit");
      btn.classList.toggle("active", unit === state.weightUnit);
    });
  }

  function setFormStatus(message, tone) {
    if (!selectors.formStatus) {
      return;
    }
    selectors.formStatus.textContent = message || "";

    selectors.formStatus.className = "small";
    if (!message) {
      selectors.formStatus.classList.add("text-muted");
      return;
    }

    if (tone === "error") {
      selectors.formStatus.classList.add("text-danger");
    } else if (tone === "success") {
      selectors.formStatus.classList.add("text-success");
    } else {
      selectors.formStatus.classList.add("text-muted");
    }
  }

  function formatNumber(value, digits) {
    if (!isFinite(value)) {
      return "--";
    }
    const formatter = new Intl.NumberFormat("zh-CN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return formatter.format(value);
  }

  function formatDateTime(value) {
    if (!value) {
      return "--";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  }

  function formatChartLabel(value) {
    if (!value) {
      return "";
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
})();
