/**
 * Real-time Monitoring Dashboard
 * Provides live monitoring interface and visual analytics
 */

import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ILogger } from "../core/logger.js";
import type { SystemMetrics, Alert, PerformanceMetrics } from "./comprehensive-monitoring-system.js";
import { getErrorMessage } from "../utils/error-handler.js";

export interface DashboardConfig {
  title: string;
  refreshInterval: number;
  autoRefresh: boolean;
  theme: "light" | "dark";
  layout: "grid" | "tabs" | "split";
  panels: DashboardPanel[];
  filters: DashboardFilter[];
  alerts: AlertConfig[];
  customizations: Record<string, any>;
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: "metric" | "chart" | "table" | "gauge" | "heatmap" | "log" | "alert";
  position: { x: number; y: number; width: number; height: number };
  config: PanelConfig;
  dataSource: DataSource;
  visualization: VisualizationConfig;
  filters?: string[];
  refreshInterval?: number;
}

export interface PanelConfig {
  showTitle: boolean;
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;
  interactive: boolean;
  exportable: boolean;
  drillDown?: boolean;
  realTime: boolean;
  maxDataPoints: number;
  timeRange: TimeRange;
}

export interface DataSource {
  type: "metrics" | "alerts" | "logs" | "performance" | "custom";
  query: string;
  aggregation?: "sum" | "avg" | "min" | "max" | "count";
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

export interface VisualizationConfig {
  chartType?: "line" | "bar" | "pie" | "scatter" | "area" | "gauge";
  colors?: string[];
  thresholds?: { value: number; color: string; label: string }[];
  axes?: { x: AxisConfig; y: AxisConfig };
  legend?: { position: string; visible: boolean };
  tooltip?: { format: string; shared: boolean };
  animation?: { enabled: boolean; duration: number };
}

export interface AxisConfig {
  label: string;
  min?: number;
  max?: number;
  scale: "linear" | "log" | "time";
  format?: string;
}

export interface TimeRange {
  from: string | Date;
  to: string | Date;
  relative?: string; // "1h", "24h", "7d", etc.
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: "dropdown" | "multiselect" | "daterange" | "text";
  options?: string[];
  defaultValue?: any;
  applies: string[]; // Panel IDs this filter applies to
}

export interface AlertConfig {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: "info" | "warning" | "error" | "critical";
  notification: {
    enabled: boolean;
    channels: string[];
    message: string;
  };
  visualization: {
    showOnDashboard: boolean;
    position: "top" | "bottom" | "sidebar";
    style: "banner" | "toast" | "modal";
  };
}

export interface DashboardData {
  timestamp: Date;
  panels: { [panelId: string]: PanelData };
  alerts: Alert[];
  filters: { [filterId: string]: any };
  metadata: {
    totalPanels: number;
    activePanels: number;
    refreshRate: number;
    dataPoints: number;
  };
}

export interface PanelData {
  id: string;
  title: string;
  type: string;
  data: any;
  status: "loading" | "ready" | "error";
  lastUpdated: Date;
  error?: string;
  metadata: {
    dataPoints: number;
    updateCount: number;
    averageUpdateTime: number;
  };
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

export interface MetricData {
  value: number;
  label: string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  change?: number;
  changePercent?: number;
  thresholds?: { warning: number; critical: number };
}

export interface TableData {
  columns: { key: string; label: string; type: string }[];
  rows: Record<string, any>[];
  pagination?: { page: number; pageSize: number; total: number };
  sorting?: { column: string; direction: "asc" | "desc" };
}

export interface LogData {
  entries: LogEntry[];
  filters: { level: string; source: string; timeRange: TimeRange };
  pagination: { page: number; pageSize: number; total: number };
}

export interface LogEntry {
  timestamp: Date;
  level: string;
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Real-time Monitoring Dashboard
 * Provides comprehensive visual monitoring interface
 */
export class RealTimeMonitoringDashboard extends EventEmitter {
  private logger: ILogger;
  private config: DashboardConfig;
  private panelData: Map<string, PanelData> = new Map();
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();
  private dataCache: Map<string, any> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  // Real-time data streams
  private metricsStream: any[] = [];
  private alertsStream: Alert[] = [];
  private logsStream: LogEntry[] = [];

  // Dashboard state
  private isActive = false;
  private lastUpdate = new Date();
  private updateCount = 0;
  private errorCount = 0;

  constructor(logger: ILogger, config: Partial<DashboardConfig> = {}) {
    super();
    this.logger = logger;

    this.config = {
      title: "System Monitoring Dashboard",
      refreshInterval: 5000,
      autoRefresh: true,
      theme: "dark",
      layout: "grid",
      panels: [],
      filters: [],
      alerts: [],
      customizations: {},
      ...config
    };

    this.initializeDefaultPanels();
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing real-time monitoring dashboard", {
      panels: this.config.panels.length,
      refreshInterval: this.config.refreshInterval
    });

    await this.loadDashboardConfig();
    await this.initializePanels();

    if (this.config.autoRefresh) {
      this.startAutoRefresh();
    }

    this.isActive = true;
    this.emit("dashboard:initialized");
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down real-time monitoring dashboard");

    this.isActive = false;
    this.stopAutoRefresh();

    // Clear all subscribers
    this.subscribers.clear();

    // Save dashboard state
    await this.saveDashboardState();

    this.emit("dashboard:shutdown");
  }

  // === PANEL MANAGEMENT ===

  private initializeDefaultPanels(): void {
    const defaultPanels: DashboardPanel[] = [
      {
        id: "system-overview",
        title: "System Overview",
        type: "metric",
        position: { x: 0, y: 0, width: 12, height: 2 },
        config: {
          showTitle: true,
          showLegend: false,
          showGrid: false,
          showTooltip: true,
          interactive: true,
          exportable: true,
          realTime: true,
          maxDataPoints: 100,
          timeRange: { from: "now-1h", to: "now", relative: "1h" }
        },
        dataSource: {
          type: "metrics",
          query: "system.*",
          aggregation: "avg"
        },
        visualization: {
          chartType: "line",
          colors: ["#00ff00", "#ff9900", "#ff0000"],
          thresholds: [
            { value: 70, color: "#ff9900", label: "Warning" },
            { value: 90, color: "#ff0000", label: "Critical" }
          ]
        }
      },
      {
        id: "cpu-usage",
        title: "CPU Usage",
        type: "gauge",
        position: { x: 0, y: 2, width: 3, height: 4 },
        config: {
          showTitle: true,
          showLegend: false,
          showGrid: false,
          showTooltip: true,
          interactive: true,
          exportable: true,
          realTime: true,
          maxDataPoints: 1,
          timeRange: { from: "now-5m", to: "now", relative: "5m" }
        },
        dataSource: {
          type: "metrics",
          query: "system.cpu",
          aggregation: "avg"
        },
        visualization: {
          colors: ["#00ff00", "#ff9900", "#ff0000"],
          thresholds: [
            { value: 70, color: "#ff9900", label: "Warning" },
            { value: 90, color: "#ff0000", label: "Critical" }
          ]
        }
      },
      {
        id: "memory-usage",
        title: "Memory Usage",
        type: "gauge",
        position: { x: 3, y: 2, width: 3, height: 4 },
        config: {
          showTitle: true,
          showLegend: false,
          showGrid: false,
          showTooltip: true,
          interactive: true,
          exportable: true,
          realTime: true,
          maxDataPoints: 1,
          timeRange: { from: "now-5m", to: "now", relative: "5m" }
        },
        dataSource: {
          type: "metrics",
          query: "system.memory",
          aggregation: "avg"
        },
        visualization: {
          colors: ["#00ff00", "#ff9900", "#ff0000"],
          thresholds: [
            { value: 80, color: "#ff9900", label: "Warning" },
            { value: 95, color: "#ff0000", label: "Critical" }
          ]
        }
      },
      {
        id: "response-time",
        title: "Response Time",
        type: "chart",
        position: { x: 6, y: 2, width: 6, height: 4 },
        config: {
          showTitle: true,
          showLegend: true,
          showGrid: true,
          showTooltip: true,
          interactive: true,
          exportable: true,
          realTime: true,
          maxDataPoints: 100,
          timeRange: { from: "now-1h", to: "now", relative: "1h" }
        },
        dataSource: {
          type: "metrics",
          query: "application.responseTime",
          aggregation: "avg"
        },
        visualization: {
          chartType: "line",
          colors: ["#0066cc"],
          axes: {
            x: { label: "Time", scale: "time" },
            y: { label: "Response Time (ms)", scale: "linear", min: 0 }
          }
        }
      },
      {
        id: "active-alerts",
        title: "Active Alerts",
        type: "alert",
        position: { x: 0, y: 6, width: 6, height: 3 },
        config: {
          showTitle: true,
          showLegend: false,
          showGrid: false,
          showTooltip: true,
          interactive: true,
          exportable: true,
          realTime: true,
          maxDataPoints: 50,
          timeRange: { from: "now-24h", to: "now", relative: "24h" }
        },
        dataSource: {
          type: "alerts",
          query: "level:warning OR level:error OR level:critical",
          orderBy: "timestamp",
          limit: 20
        },
        visualization: {
          colors: ["#ff9900", "#ff0000", "#8b0000"]
        }
      },
      {
        id: "throughput",
        title: "Throughput",
        type: "chart",
        position: { x: 6, y: 6, width: 6, height: 3 },
        config: {
          showTitle: true,
          showLegend: true,
          showGrid: true,
          showTooltip: true,
          interactive: true,
          exportable: true,
          realTime: true,
          maxDataPoints: 100,
          timeRange: { from: "now-1h", to: "now", relative: "1h" }
        },
        dataSource: {
          type: "metrics",
          query: "application.throughput",
          aggregation: "sum"
        },
        visualization: {
          chartType: "area",
          colors: ["#00cc66"],
          axes: {
            x: { label: "Time", scale: "time" },
            y: { label: "Requests/sec", scale: "linear", min: 0 }
          }
        }
      },
      {
        id: "error-logs",
        title: "Recent Errors",
        type: "log",
        position: { x: 0, y: 9, width: 12, height: 4 },
        config: {
          showTitle: true,
          showLegend: false,
          showGrid: true,
          showTooltip: true,
          interactive: true,
          exportable: true,
          realTime: true,
          maxDataPoints: 100,
          timeRange: { from: "now-1h", to: "now", relative: "1h" }
        },
        dataSource: {
          type: "logs",
          query: "level:error OR level:critical",
          orderBy: "timestamp",
          limit: 50
        },
        visualization: {
          colors: ["#ff0000", "#8b0000"]
        }
      }
    ];

    this.config.panels = defaultPanels;
  }

  private async initializePanels(): Promise<void> {
    for (const panel of this.config.panels) {
      const panelData: PanelData = {
        id: panel.id,
        title: panel.title,
        type: panel.type,
        data: null,
        status: "loading",
        lastUpdated: new Date(),
        metadata: {
          dataPoints: 0,
          updateCount: 0,
          averageUpdateTime: 0
        }
      };

      this.panelData.set(panel.id, panelData);

      // Start panel refresh timer if configured
      if (panel.refreshInterval) {
        this.startPanelRefresh(panel.id, panel.refreshInterval);
      }
    }

    // Initial data load
    await this.refreshAllPanels();
  }

  private startPanelRefresh(panelId: string, interval: number): void {
    const timer = setInterval(async () => {
      try {
        await this.refreshPanel(panelId);
      } catch (error) {
        this.logger.error("Failed to refresh panel", {
          panelId,
          error: getErrorMessage(error)
        });
      }
    }, interval);

    this.updateTimers.set(panelId, timer);
  }

  private async refreshPanel(panelId: string): Promise<void> {
    const panel = this.config.panels.find(p => p.id === panelId);
    const panelData = this.panelData.get(panelId);

    if (!panel || !panelData) {
      this.logger.warn("Panel not found for refresh", { panelId });
      return;
    }

    const startTime = Date.now();

    try {
      panelData.status = "loading";

      const data = await this.fetchPanelData(panel);

      panelData.data = data;
      panelData.status = "ready";
      panelData.lastUpdated = new Date();
      panelData.metadata.updateCount++;

      const updateTime = Date.now() - startTime;
      panelData.metadata.averageUpdateTime =
        (panelData.metadata.averageUpdateTime * (panelData.metadata.updateCount - 1) + updateTime) /
        panelData.metadata.updateCount;

      this.emit("panel:updated", { panelId, data: panelData });

      // Notify subscribers
      this.notifyPanelSubscribers(panelId, panelData);

    } catch (error) {
      panelData.status = "error";
      panelData.error = getErrorMessage(error);
      this.errorCount++;

      this.logger.error("Failed to refresh panel data", {
        panelId,
        error: getErrorMessage(error)
      });

      this.emit("panel:error", { panelId, error: getErrorMessage(error) });
    }
  }

  private async fetchPanelData(panel: DashboardPanel): Promise<any> {
    const { dataSource, visualization } = panel;

    switch (dataSource.type) {
      case "metrics":
        return await this.fetchMetricsData(dataSource, visualization);
      case "alerts":
        return await this.fetchAlertsData(dataSource, visualization);
      case "logs":
        return await this.fetchLogsData(dataSource, visualization);
      case "performance":
        return await this.fetchPerformanceData(dataSource, visualization);
      default:
        throw new Error(`Unknown data source type: ${dataSource.type}`);
    }
  }

  private async fetchMetricsData(dataSource: DataSource, visualization: VisualizationConfig): Promise<any> {
    const query = dataSource.query;
    const aggregation = dataSource.aggregation || "avg";

    // Get metrics from cache or fresh data
    const metrics = this.getMetricsFromCache(query);

    if (visualization.chartType === "line" || visualization.chartType === "area") {
      return this.formatTimeSeriesData(metrics, visualization);
    } else if (visualization.chartType && visualization.chartType === "gauge") {
      return this.formatGaugeData(metrics, visualization);
    } else {
      return this.formatMetricData(metrics, visualization);
    }
  }

  private async fetchAlertsData(dataSource: DataSource, visualization: VisualizationConfig): Promise<Alert[]> {
    const query = dataSource.query;
    const limit = dataSource.limit || 50;

    // Filter alerts based on query
    let filteredAlerts = this.alertsStream.slice();

    if (query.includes("level:warning")) {
      filteredAlerts = filteredAlerts.filter(a => a.level === "warning");
    }
    if (query.includes("level:error")) {
      filteredAlerts = filteredAlerts.filter(a => a.level === "error");
    }
    if (query.includes("level:critical")) {
      filteredAlerts = filteredAlerts.filter(a => a.level === "critical");
    }

    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filteredAlerts.slice(0, limit);
  }

  private async fetchLogsData(dataSource: DataSource, visualization: VisualizationConfig): Promise<LogData> {
    const query = dataSource.query;
    const limit = dataSource.limit || 100;

    // Filter logs based on query
    let filteredLogs = this.logsStream.slice();

    if (query.includes("level:error")) {
      filteredLogs = filteredLogs.filter(l => l.level === "error");
    }
    if (query.includes("level:critical")) {
      filteredLogs = filteredLogs.filter(l => l.level === "critical");
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      entries: filteredLogs.slice(0, limit),
      filters: {
        level: "error",
        source: "all",
        timeRange: { from: "now-1h", to: "now", relative: "1h" }
      },
      pagination: {
        page: 1,
        pageSize: limit,
        total: filteredLogs.length
      }
    };
  }

  private async fetchPerformanceData(dataSource: DataSource, visualization: VisualizationConfig): Promise<any> {
    const query = dataSource.query;

    // Get performance metrics from cache
    const performanceData = this.performanceMetrics.get(query) || [];

    return {
      current: performanceData[performanceData.length - 1] || 0,
      history: performanceData.slice(-100), // Last 100 data points
      trend: this.calculateTrend(performanceData),
      statistics: this.calculateStatistics(performanceData)
    };
  }

  // === DATA FORMATTING ===

  private formatTimeSeriesData(metrics: any[], visualization: VisualizationConfig): ChartData {
    const labels = metrics.map(m => new Date(m.timestamp).toISOString());
    const data = metrics.map(m => m.value);

    return {
      labels,
      datasets: [{
        label: "Value",
        data,
        borderColor: visualization.colors?.[0] || "#0066cc",
        backgroundColor: visualization.chartType === "area" ?
          (visualization.colors?.[0] || "#0066cc") + "33" : "transparent",
        fill: visualization.chartType === "area"
      }]
    };
  }

  private formatGaugeData(metrics: any[], visualization: VisualizationConfig): MetricData {
    const latestMetric = metrics[metrics.length - 1];
    const previousMetric = metrics[metrics.length - 2];

    const value = latestMetric?.value || 0;
    const previousValue = previousMetric?.value || 0;
    const change = value - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

    return {
      value,
      label: "Current Value",
      unit: "%",
      trend: change > 0 ? "up" : change < 0 ? "down" : "stable",
      change,
      changePercent,
      thresholds: {
        warning: visualization.thresholds?.find(t => t.label === "Warning")?.value || 70,
        critical: visualization.thresholds?.find(t => t.label === "Critical")?.value || 90
      }
    };
  }

  private formatMetricData(metrics: any[], visualization: VisualizationConfig): MetricData {
    const latestMetric = metrics[metrics.length - 1];
    const value = latestMetric?.value || 0;

    return {
      value,
      label: "Current Value",
      trend: "stable"
    };
  }

  // === REAL-TIME UPDATES ===

  private startAutoRefresh(): void {
    const timer = setInterval(async () => {
      try {
        await this.refreshAllPanels();
        this.updateCount++;
        this.lastUpdate = new Date();
      } catch (error) {
        this.logger.error("Failed to auto-refresh dashboard", {
          error: getErrorMessage(error)
        });
      }
    }, this.config.refreshInterval);

    this.updateTimers.set("auto-refresh", timer);
    this.logger.info("Auto-refresh started", { interval: this.config.refreshInterval });
  }

  private stopAutoRefresh(): void {
    for (const [name, timer] of this.updateTimers) {
      clearInterval(timer);
    }
    this.updateTimers.clear();
    this.logger.info("Auto-refresh stopped");
  }

  private async refreshAllPanels(): Promise<void> {
    const refreshPromises = this.config.panels.map(panel =>
      this.refreshPanel(panel.id)
    );

    await Promise.allSettled(refreshPromises);
  }

  // === SUBSCRIPTION MANAGEMENT ===

  subscribeToPanelUpdates(panelId: string, callback: (data: PanelData) => void): () => void {
    if (!this.subscribers.has(panelId)) {
      this.subscribers.set(panelId, new Set());
    }

    this.subscribers.get(panelId)!.add(callback);

    // Send current data immediately
    const currentData = this.panelData.get(panelId);
    if (currentData) {
      callback(currentData);
    }

    return () => {
      this.subscribers.get(panelId)?.delete(callback);
    };
  }

  subscribeToAllUpdates(callback: (data: DashboardData) => void): () => void {
    const unsubscribeFunctions: (() => void)[] = [];

    // Subscribe to all panel updates
    for (const panel of this.config.panels) {
      const unsubscribe = this.subscribeToPanelUpdates(panel.id, () => {
        callback(this.getDashboardData());
      });
      unsubscribeFunctions.push(unsubscribe);
    }

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }

  private notifyPanelSubscribers(panelId: string, data: PanelData): void {
    const subscribers = this.subscribers.get(panelId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logger.error("Failed to notify panel subscriber", {
            panelId,
            error: getErrorMessage(error)
          });
        }
      });
    }
  }

  // === DATA STREAMING ===

  updateMetricsStream(metrics: SystemMetrics): void {
    this.metricsStream.push(metrics);

    // Keep only recent data
    if (this.metricsStream.length > 1000) {
      this.metricsStream.shift();
    }

    // Update cache
    this.updateMetricsCache(metrics);
  }

  updateAlertsStream(alerts: Alert[]): void {
    this.alertsStream = alerts;

    // Keep only recent alerts
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.alertsStream = this.alertsStream.filter(a => a.timestamp > cutoff);
  }

  updateLogsStream(logs: LogEntry[]): void {
    this.logsStream.push(...logs);

    // Keep only recent logs
    if (this.logsStream.length > 1000) {
      this.logsStream.splice(0, this.logsStream.length - 1000);
    }
  }

  // === PUBLIC API ===

  getDashboardData(): DashboardData {
    const panelDataMap: { [panelId: string]: PanelData } = {};

    for (const [panelId, data] of this.panelData) {
      panelDataMap[panelId] = data;
    }

    return {
      timestamp: new Date(),
      panels: panelDataMap,
      alerts: this.alertsStream.slice(-20), // Last 20 alerts
      filters: {},
      metadata: {
        totalPanels: this.config.panels.length,
        activePanels: Array.from(this.panelData.values()).filter(p => p.status === "ready").length,
        refreshRate: this.config.refreshInterval,
        dataPoints: this.metricsStream.length
      }
    };
  }

  getPanelData(panelId: string): PanelData | undefined {
    return this.panelData.get(panelId);
  }

  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit("config:updated", this.config);
  }

  exportDashboard(): string {
    return JSON.stringify({
      config: this.config,
      data: this.getDashboardData(),
      metadata: {
        exported: new Date(),
        version: "1.0.0"
      }
    }, null, 2);
  }

  // === UTILITY METHODS ===

  private setupEventHandlers(): void {
    this.on("panel:updated", (data) => {
      this.logger.debug("Panel updated", { panelId: data.panelId });
    });

    this.on("panel:error", (data) => {
      this.logger.error("Panel error", { panelId: data.panelId, error: data.error });
    });
  }

  private getMetricsFromCache(query: string): any[] {
    const cachedData = this.dataCache.get(query);
    if (cachedData) {
      return cachedData;
    }

    // Filter metrics based on query
    const filteredMetrics = this.metricsStream.filter(m => {
      if (query === "system.*") return true;
      if (query === "system.cpu") return m.system?.cpu !== undefined;
      if (query === "system.memory") return m.system?.memory !== undefined;
      if (query === "application.responseTime") return m.application?.responseTime !== undefined;
      if (query === "application.throughput") return m.application?.throughput !== undefined;
      return false;
    });

    // Cache the result
    this.dataCache.set(query, filteredMetrics);

    return filteredMetrics;
  }

  private updateMetricsCache(metrics: SystemMetrics): void {
    // Clear cache to force refresh
    this.dataCache.clear();
  }

  private calculateTrend(data: number[]): "up" | "down" | "stable" {
    if (data.length < 2) return "stable";

    const recent = data.slice(-10);
    const older = data.slice(-20, -10);

    if (recent.length === 0 || older.length === 0) return "stable";

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return "up";
    if (change < -0.1) return "down";
    return "stable";
  }

  private calculateStatistics(data: number[]): any {
    if (data.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, stdDev: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    const variance = data.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return { min, max, avg, median, stdDev };
  }

  private async loadDashboardConfig(): Promise<void> {
    try {
      const configPath = path.join("./config", "dashboard.json");
      const configData = await fs.readFile(configPath, "utf8");
      const savedConfig = JSON.parse(configData);

      this.config = { ...this.config, ...savedConfig };
      this.logger.info("Dashboard configuration loaded", { configPath });
    } catch (error) {
      this.logger.debug("No saved dashboard configuration found, using defaults");
    }
  }

  private async saveDashboardState(): Promise<void> {
    try {
      const statePath = path.join("./logs", "dashboard-state.json");
      const state = {
        config: this.config,
        lastUpdate: this.lastUpdate,
        updateCount: this.updateCount,
        errorCount: this.errorCount
      };

      await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
      this.logger.info("Dashboard state saved", { statePath });
    } catch (error) {
      this.logger.error("Failed to save dashboard state", { error: getErrorMessage(error) });
    }
  }
}
