/**
 * Analytics Dashboard Component
 * Real-time analytics visualization
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import '../styles/analytics-dashboard.css';

interface AnalyticsMetric {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

const AnalyticsDashboard: React.FC = () => {
  const { getMetrics, getSessionId } = useAnalytics();
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedMetric, setSelectedMetric] = useState<string>('sessions');

  useEffect(() => {
    const analyticsMetrics = getMetrics();

    const metricsArray: AnalyticsMetric[] = [
      {
        label: 'Total Sessions',
        value: analyticsMetrics.total_sessions,
        trend: 'up',
      },
      {
        label: 'Total Users',
        value: analyticsMetrics.total_users,
        trend: 'up',
      },
      {
        label: 'Avg Session Duration',
        value: `${Math.round(analyticsMetrics.avg_session_duration)}s`,
        unit: 'seconds',
        trend: 'up',
      },
      {
        label: 'Bounce Rate',
        value: `${analyticsMetrics.bounce_rate.toFixed(1)}%`,
        unit: 'percent',
        trend: analyticsMetrics.bounce_rate < 40 ? 'down' : 'up',
      },
      {
        label: 'Pages per Session',
        value: analyticsMetrics.pages_per_session.toFixed(2),
        trend: 'up',
      },
      {
        label: 'Conversion Rate',
        value: `${analyticsMetrics.conversion_rate.toFixed(2)}%`,
        unit: 'percent',
        trend: 'up',
      },
    ];

    setMetrics(metricsArray);

    // Generate chart data
    const topPagesData = analyticsMetrics.top_pages.slice(0, 5).map(page => ({
      name: page.page.substring(page.page.lastIndexOf('/') + 1) || 'home',
      value: page.views,
    }));

    const topEventsData = analyticsMetrics.top_events.slice(0, 5).map(event => ({
      name: event.event,
      value: event.count,
    }));

    setChartData(selectedMetric === 'sessions' ? topPagesData : topEventsData);
  }, [getMetrics, selectedMetric]);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const MetricCard = ({ metric }: { metric: AnalyticsMetric }) => (
    <div className="analytics-metric-card">
      <div className="metric-header">
        <h4>{metric.label}</h4>
        {metric.trend && (
          <span className={`trend trend-${metric.trend}`}>
            {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      <div className="metric-value">{metric.value}</div>
      {metric.unit && <div className="metric-unit">{metric.unit}</div>}
    </div>
  );

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <div className="analytics-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d' | '30d')}
            className="time-range-selector"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <span className="session-id">Session ID: {getSessionId().substring(0, 16)}...</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="analytics-metrics-grid">
        {metrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="analytics-charts">
        <div className="chart-container">
          <div className="chart-header">
            <h3>Top Pages</h3>
            <button
              onClick={() => setSelectedMetric('sessions')}
              className={selectedMetric === 'sessions' ? 'active' : ''}
            >
              View
            </button>
          </div>
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3>Top Events</h3>
            <button
              onClick={() => setSelectedMetric('events')}
              className={selectedMetric === 'events' ? 'active' : ''}
            >
              View
            </button>
          </div>
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Real-time Updates */}
      <div className="analytics-realtime">
        <h3>Real-time Activity</h3>
        <div className="activity-feed">
          <div className="activity-item">
            <span className="activity-time">Just now</span>
            <span className="activity-text">Page view tracked</span>
          </div>
          <div className="activity-item">
            <span className="activity-time">2 min ago</span>
            <span className="activity-text">User event: click</span>
          </div>
          <div className="activity-item">
            <span className="activity-time">5 min ago</span>
            <span className="activity-text">Conversion tracked</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;