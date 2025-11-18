(() => {
  const PAGE_SIZE = 20;
  const state = {
    entries: [],
    chartEntries: [],
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 1,
      total: 0,
    },
    weightUnit: "jin",
    chartOrientation: {
      weight: "vertical",
      waist: "vertical",
    },
  };

  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(max-width: 768px)").matches
      : false;

  if (isMobileViewport) {
    state.chartOrientation.weight = "horizontal";
    state.chartOrientation.waist = "horizontal";
  }

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
    orientationButtons: document.querySelectorAll("[data-chart-target][data-orientation]"),
    chartContainers: document.querySelectorAll("[data-chart-container]"),
    paginationSummary: document.getElementById("paginationSummary"),
    paginationPrev: document.getElementById("paginationPrev"),
    paginationNext: document.getElementById("paginationNext"),
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
      selectors.refreshEntries.addEventListener("click", () => {
        loadTableEntries(state.pagination.page, true);
        loadChartEntries();
      });
    }

    selectors.chartRefreshButtons.forEach((btn) => {
      btn.addEventListener("click", () => loadChartEntries());
    });

    selectors.weightUnitButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const unit = btn.getAttribute("data-weight-unit");
        if (!unit || state.weightUnit === unit) {
          return;
        }
        state.weightUnit = unit;
        updateWeightUnitButtons();
        renderCharts();
      });
    });

    selectors.orientationButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-chart-target");
        const orientation = btn.getAttribute("data-orientation");
        if (!target || !orientation) {
          return;
        }
        if (state.chartOrientation[target] === orientation) {
          return;
        }
        state.chartOrientation[target] = orientation;
        updateOrientationButtons();
        updateChartContainerLayout();
        renderCharts();
      });
    });

    if (selectors.tableBody) {
      selectors.tableBody.addEventListener("click", handleTableClick);
    }

    updateWeightUnitButtons();
    updateOrientationButtons();
    updateChartContainerLayout();
    attachPaginationEvents();
    loadTableEntries(1, false);
    loadChartEntries();
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

  async function loadTableEntries(page = state.pagination.page, showFeedback = false) {
    if (showFeedback) {
      setFormStatus("正在刷新列表...");
    } else {
      setFormStatus("");
    }
    try {
      const response = await fetch(`/api/entries?page=${page}&limit=${PAGE_SIZE}`);
      if (!response.ok) {
        throw new Error("加载失败");
      }
      const payload = await response.json();
      state.entries = Array.isArray(payload.entries) ? payload.entries : [];
      const meta = payload.meta || {};
      const totalRaw = Number(meta.total);
      const total = Number.isFinite(totalRaw) && totalRaw >= 0 ? totalRaw : state.entries.length;
      const pageSizeRaw = Number(meta.pageSize);
      const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : PAGE_SIZE;
      const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
      const pageRaw = Number(meta.page);
      const resolvedPage =
        total > 0 ? Math.min(Math.max(1, Number.isFinite(pageRaw) ? pageRaw : page), totalPages) : 1;

      state.pagination = {
        page: resolvedPage,
        pageSize,
        total,
        totalPages: totalPages || 1,
      };

      renderTable();
      updatePaginationControls();
      if (showFeedback) {
        setFormStatus("列表已更新", "success");
      } else {
        setFormStatus("");
      }
    } catch (error) {
      console.error("加载列表失败", error);
      setFormStatus("加载列表数据失败，请稍后再试", "error");
    }
  }

  async function loadChartEntries() {
    try {
      const response = await fetch("/api/entries?limit=0");
      if (!response.ok) {
        throw new Error("加载失败");
      }
      const payload = await response.json();
      state.chartEntries = Array.isArray(payload.entries) ? payload.entries : [];
      renderCharts();
    } catch (error) {
      console.error("加载图表数据失败", error);
    }
  }

  function renderTable() {
    const entries = state.entries;
    if (!selectors.tableBody) {
      return;
    }
    selectors.tableBody.innerHTML = "";

    if (!entries.length) {
      const row = selectors.tableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.className = "text-center text-muted py-4";
      cell.textContent = "暂无记录";
      return;
    }

    entries.forEach((entry, index) => {
      const row = selectors.tableBody.insertRow();
      row.dataset.entryIndex = String(index);
      row.insertCell().textContent = entry.date || "--";
      row.insertCell().textContent = formatNumber(entry.weightKg, 2);
      row.insertCell().textContent = formatNumber(entry.weightJin, 1);
      row.insertCell().textContent = entry.waistCm != null ? formatNumber(entry.waistCm, 1) : "--";
      row.insertCell().textContent = entry.note || "--";
    });
  }

  function handleTableClick(event) {
    const targetRow = event.target.closest("tr[data-entry-index]");
    if (!targetRow) {
      return;
    }
    const entryIndex = Number(targetRow.dataset.entryIndex);
    if (!Number.isInteger(entryIndex) || entryIndex < 0 || entryIndex >= state.entries.length) {
      return;
    }
    populateFormForEntry(state.entries[entryIndex]);
  }

  function populateFormForEntry(entry) {
    if (!entry || !selectors.form) {
      return;
    }
    selectors.date.value = entry.date || selectors.date.value;
    selectors.weightJin.value = formatInputNumber(entry.weightJin);
    selectors.waistCm.value = entry.waistCm != null ? formatInputNumber(entry.waistCm) : "";
    selectors.note.value = entry.note || "";
    updateWeightPreview();
    setFormStatus(`已载入 ${entry.date} 的记录，可直接修改后保存`, "success");
  }

  function attachPaginationEvents() {
    if (selectors.paginationPrev) {
      selectors.paginationPrev.addEventListener("click", () => {
        if (state.pagination.page <= 1) {
          return;
        }
        loadTableEntries(state.pagination.page - 1, true);
      });
    }
    if (selectors.paginationNext) {
      selectors.paginationNext.addEventListener("click", () => {
        if (state.pagination.page >= state.pagination.totalPages || !state.pagination.total) {
          return;
        }
        loadTableEntries(state.pagination.page + 1, true);
      });
    }
  }

  function updatePaginationControls() {
    if (selectors.paginationPrev) {
      selectors.paginationPrev.disabled = state.pagination.page <= 1 || !state.pagination.total;
    }
    if (selectors.paginationNext) {
      const disableNext = !state.pagination.total || state.pagination.page >= state.pagination.totalPages;
      selectors.paginationNext.disabled = disableNext;
    }
    if (selectors.paginationSummary) {
      if (!state.pagination.total) {
        selectors.paginationSummary.textContent = "暂无记录";
      } else {
        selectors.paginationSummary.textContent = `第 ${state.pagination.page} / ${state.pagination.totalPages} 页，共 ${state.pagination.total} 条记录`;
      }
    }
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
      await loadTableEntries(1, false);
      await loadChartEntries();
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

  function renderCharts(entriesSource = state.chartEntries) {
    if (typeof Chart === "undefined") {
      return;
    }

    const source = Array.isArray(entriesSource) ? entriesSource : [];
    const chronological = [...source].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
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

    const weightOrientation = state.chartOrientation.weight === "horizontal" ? "y" : "x";
    const waistOrientation = state.chartOrientation.waist === "horizontal" ? "y" : "x";

    weightChart = mountChart(
      "weightChart",
      weightChart,
      labels,
      weights,
      isKgUnit ? "\u4f53\u91cd\uff08\u516c\u65a4\uff09" : "\u4f53\u91cd\uff08\u65a4\uff09",
      "rgba(78, 115, 223, 1)",
      isKgUnit ? 2 : 1,
      weightOrientation
    );

    waistChart = mountChart(
      "waistChart",
      waistChart,
      waistLabels,
      waists,
      "\u8170\u56f4\uff08\u5398\u7c73\uff09",
      "rgba(54, 185, 204, 1)",
      1,
      waistOrientation
    );
  }

  function mountChart(canvasId, instance, labels, values, labelText, color, valueDigits, indexAxis) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return instance;
    }
    if (instance) {
      instance.destroy();
    }

    const axisKey = indexAxis === "y" ? "x" : "y";
    const labelAxis = indexAxis === "y" ? "y" : "x";
    const valueAxis = labelAxis === "x" ? "y" : "x";
    const isHorizontal = indexAxis === "y";
    const maxTicks = window.matchMedia("(min-width: 992px)").matches ? 12 : 6;

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
        indexAxis: indexAxis || "x",
        interaction: {
          intersect: false,
          mode: "nearest",
        },
        scales: {
          x: {
            position: "bottom",
            grid: {
              display: labelAxis !== "x" ? true : false,
              color: "rgba(0,0,0,0.05)",
            },
            ticks: {
              maxTicksLimit: labelAxis === "x" ? maxTicks : undefined,
              minRotation: 0,
              maxRotation: 0,
            },
          },
          y: {
            position: "left",
            beginAtZero: false,
            grid: {
              color: "rgba(0,0,0,0.05)",
            },
            ticks: {
              maxTicksLimit: labelAxis === "y" ? maxTicks : undefined,
              minRotation: 0,
              maxRotation: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatNumber(ctx.parsed[valueAxis], valueDigits)}`,
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

  function updateOrientationButtons() {
    selectors.orientationButtons.forEach((btn) => {
      const target = btn.getAttribute("data-chart-target");
      const orientation = btn.getAttribute("data-orientation");
      const isActive = (state.chartOrientation[target] || "vertical") === orientation;
      btn.classList.toggle("active", isActive);
    });
  }

  function updateChartContainerLayout() {
    selectors.chartContainers.forEach((container) => {
      const target = container.getAttribute("data-chart-container");
      const orientation = state.chartOrientation[target] || "vertical";
      container.classList.toggle("chart-horizontal", orientation === "horizontal");
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

  function formatInputNumber(value) {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return "";
    }
    return num.toString();
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

