import React from 'react';
import { DashboardBase } from '../Dashboard/DashboardBase';
import { KPICard } from '../Dashboard/KPICard';
import { AlertBanner } from '../Dashboard/AlertBanner';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { useDashboardData, useDashboardAccess } from '../../hooks/useDashboardData';

// Data Interfaces
interface PurchaseOrder {
  order_id: string;
  seller_party: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  status: string;
  eta_days: number;
}

interface PurchaseMetrics {
  total_volume_bbl: number;
  total_spent: number;
  by_order: PurchaseOrder[];
}

interface BudgetImpact {
  total_budget: number;
  spent_to_date: number;
  budget_remaining: number;
  budget_utilization_percent: number;
}

interface SupplierPerformance {
  supplier_name: string;
  total_orders: number;
  on_time_rate: number;
  quality_rating: number;
  avg_lead_time_days: number;
}

interface PendingApproval {
  approval_id: string;
  order_id: string;
  seller_name: string;
  quantity: number;
  status: string;
  awaiting_since_hours: number;
}

interface BuyerDashboard {
  purchases: PurchaseMetrics;
  budget: BudgetImpact;
  suppliers: SupplierPerformance[];
  pending_approvals: PendingApproval[];
}

export const DashboardBuyer: React.FC = () => {
  const { hasAccess } = useDashboardAccess('buyer');
  const { data: dashboard, loading, error } = useDashboardData<BuyerDashboard>(
    '/dashboard/buyer/overview',
    {
      enabled: hasAccess,
      refetchInterval: 30000, // Auto-refetch every 30 seconds
    }
  );



  // Check access
  if (!hasAccess) {
    return (
      <DashboardBase title="Access Denied" icon="🚫">
        <Alert
          variant="error"
          title="Unauthorized"
          message="You don't have permission to access this dashboard. Only buyers can view this page."
        />
      </DashboardBase>
    );
  }

  // Show loading
  if (loading) {
    return (
      <DashboardBase title="Buyer Portal" icon="🛒" subtitle="Purchase Orders & Budget Management">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading your purchase data..." />
        </div>
      </DashboardBase>
    );
  }

  // Handle error
  if (error || !dashboard) {
    return (
      <DashboardBase title="Buyer Portal" icon="🛒" subtitle="Purchase Orders & Budget Management">
        <Alert
          variant="error"
          title="Error Loading Dashboard"
          message={error || 'Failed to load dashboard data'}
        />
      </DashboardBase>
    );
  }

  // Safe destructuring with defaults
  const {
    purchases = { total_volume_bbl: 0, total_spent: 0, by_order: [] },
    budget = { total_budget: 0, spent_to_date: 0, budget_remaining: 0, budget_utilization_percent: 0 },
    suppliers = [],
    pending_approvals = [],
  } = dashboard;

  // Helper function to get status color
  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'delivered': return '#27ae60';
      case 'in_transit': return '#3498db';
      case 'delayed': return '#e74c3c';
      case 'pending': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  // Helper function to get budget status
  const getBudgetStatus = (utilization: number): 'success' | 'warning' | 'critical' => {
    if (utilization <= 70) return 'success';
    if (utilization <= 90) return 'warning';
    return 'critical';
  };

  // Filter visible alerts
  const visibleAlerts: Array<{ id: string; type: 'critical' | 'warning' | 'info'; title: string; message: string }> = [];

  if (budget.budget_utilization_percent > 90) {
    visibleAlerts.push({
      id: 'budget-critical',
      type: 'critical',
      title: 'Budget Alert',
      message: `Budget utilization at ${budget.budget_utilization_percent.toFixed(0)}%. Only $${(budget.budget_remaining / 1000).toFixed(1)}K remaining.`,
    });
  }

  if (pending_approvals.filter(a => a.awaiting_since_hours > 48).length > 0) {
    visibleAlerts.push({
      id: 'delayed-approvals',
      type: 'warning',
      title: 'Delayed Approvals',
      message: `${pending_approvals.filter(a => a.awaiting_since_hours > 48).length} purchase order(s) awaiting approval for >48 hours.`,
    });
  }

  if (purchases.by_order.filter(o => o.status === 'delayed').length > 0) {
    visibleAlerts.push({
      id: 'delayed-orders',
      type: 'warning',
      title: 'Delayed Orders',
      message: `${purchases.by_order.filter(o => o.status === 'delayed').length} order(s) delayed. Check with suppliers.`,
    });
  }

  const displayedAlerts = visibleAlerts;

  return (
    <DashboardBase title="Buyer Portal" icon="🛒" subtitle="Purchase Orders & Budget Management">
      <div style={{ padding: '20px 30px 30px 30px' }}>
        {/* Alerts */}
        {displayedAlerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {displayedAlerts.map(alert => (
              <AlertBanner
                key={alert.id}
                type={alert.type}
                title={alert.title}
                message={alert.message}
              />
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '30px' }}>
          <KPICard
            title="Total Purchase Volume"
            value={`${(purchases.total_volume_bbl / 1000).toFixed(1)}K BBL`}
            subtitle="Barrels"
            status="info"
            icon="📦"
            trend="up"
            trendValue={15}
          />

          <KPICard
            title="Budget Remaining"
            value={`$${(budget.budget_remaining / 1000000).toFixed(2)}M`}
            subtitle={`of $${(budget.total_budget / 1000000).toFixed(1)}M`}
            status={getBudgetStatus(budget.budget_utilization_percent)}
            icon="💵"
            trend={budget.budget_utilization_percent > 50 ? 'down' : 'up'}
            trendValue={Math.round(budget.budget_utilization_percent)}
          />

          <KPICard
            title="Average Purchase Value"
            value={`$${(purchases.total_spent / Math.max(purchases.by_order.length, 1) / 1000).toFixed(1)}K`}
            subtitle="Per Order"
            status="info"
            icon="💰"
            trend="neutral"
            trendValue={purchases.by_order.length}
          />

          <KPICard
            title="Pending Approvals"
            value={pending_approvals.length.toString()}
            subtitle="Awaiting Action"
            status={pending_approvals.length > 5 ? 'warning' : 'info'}
            icon="⏳"
            trend="neutral"
            trendValue={pending_approvals.filter(a => a.awaiting_since_hours > 24).length}
          />
        </div>

        {/* Purchase Orders Section */}
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', margin: '0 0 5px 0' }}>📋 Purchase Orders</h3>
            <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>Active and completed orders</p>
          </div>

          {purchases.by_order.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>
              <p>No purchase orders</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {purchases.by_order.slice(0, 6).map((order) => (
                <div key={order.order_id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${getStatusColor(order.status)}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                      {order.seller_party}
                    </p>
                    <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#7f8c8d' }}>
                      {order.quantity.toLocaleString()} BBL @ ${order.unit_price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#95a5a6' }}>
                      ETA: {order.eta_days} days
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
                      ${(order.total_cost / 1000).toFixed(1)}K
                    </p>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: '500',
                      borderRadius: '4px',
                      background: getStatusColor(order.status) + '20',
                      color: getStatusColor(order.status),
                    }}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {purchases.by_order.length > 6 && (
                <div style={{ textAlign: 'center', padding: '10px', color: '#3498db', fontSize: '13px', fontWeight: '500' }}>
                  +{purchases.by_order.length - 6} more orders
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Approvals Section */}
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', margin: '0 0 5px 0' }}>⏳ Pending Approvals</h3>
            <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>Orders awaiting your review and approval</p>
          </div>

          {pending_approvals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>
              <p>All orders approved ✓</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {pending_approvals.slice(0, 6).map((approval) => (
                <div key={approval.approval_id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${approval.awaiting_since_hours > 48 ? '#e74c3c' : approval.awaiting_since_hours > 24 ? '#f39c12' : '#3498db'}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                      {approval.seller_name}
                    </p>
                    <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#7f8c8d' }}>
                      {approval.quantity.toLocaleString()} BBL
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#95a5a6' }}>
                      Pending for {approval.awaiting_since_hours}h
                    </p>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    background: approval.awaiting_since_hours > 48 ? '#fadbd8' : approval.awaiting_since_hours > 24 ? '#fdeaa8' : '#d6eaf8',
                    color: approval.awaiting_since_hours > 48 ? '#c0392b' : approval.awaiting_since_hours > 24 ? '#d68910' : '#1f618d',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}>
                    {approval.status}
                  </div>
                </div>
              ))}
              {pending_approvals.length > 6 && (
                <div style={{ textAlign: 'center', padding: '10px', color: '#3498db', fontSize: '13px', fontWeight: '500' }}>
                  +{pending_approvals.length - 6} more awaiting
                </div>
              )}
            </div>
          )}
        </div>

        {/* Supplier Performance Section */}
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', margin: '0 0 5px 0' }}>⭐ Supplier Performance</h3>
            <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>Evaluate supplier reliability and quality</p>
          </div>

          {suppliers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>
              <p>No supplier performance data</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {suppliers.slice(0, 8).map((supplier, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${supplier.on_time_rate >= 90 ? '#27ae60' : supplier.on_time_rate >= 75 ? '#f39c12' : '#e74c3c'}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                      {supplier.supplier_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d' }}>
                      {supplier.total_orders} orders • Avg {supplier.avg_lead_time_days}d lead time
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>
                      {supplier.quality_rating.toFixed(1)} ⭐
                    </p>
                    <p style={{
                      margin: 0,
                      padding: '3px 8px',
                      background: supplier.on_time_rate >= 90 ? '#d5f4e6' : supplier.on_time_rate >= 75 ? '#fdeaa8' : '#fadbd8',
                      color: supplier.on_time_rate >= 90 ? '#27ae60' : supplier.on_time_rate >= 75 ? '#d68910' : '#c0392b',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'inline-block',
                    }}>
                      {supplier.on_time_rate}% on-time
                    </p>
                  </div>
                </div>
              ))}
              {suppliers.length > 8 && (
                <div style={{ textAlign: 'center', padding: '10px', color: '#3498db', fontSize: '13px', fontWeight: '500' }}>
                  +{suppliers.length - 8} more suppliers
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardBase>
  );
};