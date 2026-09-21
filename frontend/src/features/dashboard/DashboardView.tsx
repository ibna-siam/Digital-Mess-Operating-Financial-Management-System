import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Utensils,
  ArrowLeftRight,
  Calendar,
  PlusCircle,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Card } from '../../components/ui/Card.js';
import { apiClient } from '../../lib/apiClient.js';
import { useDataSync } from '../../hooks/useDataSync.js';
import { DashboardStats } from '../../types/index.js';
import { Skeleton } from '../../components/ui/StateComponents.js';

export const DashboardView: React.FC = () => {
  const { user, activeMess } = useAuth();
  const navigate = useNavigate();
  const messId = activeMess?.id || '';
  const userName = user?.name ? user.name.split(' ')[0] : 'Member';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadDashboard = React.useCallback(async () => {
    try {
      const data = await apiClient<DashboardStats>(`/dashboard/${messId}`);
      setStats(data);
    } catch (err) {
      console.error('Failed to load live dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useDataSync(['dashboard', 'expenses', 'meals', 'bazar', 'members', 'bills', 'settlements'], loadDashboard);

  const kpis = [
    {
      title: 'Total Members',
      value: stats ? `${stats.kpis.totalMembers.value}` : null,
      subtext: stats ? stats.kpis.totalMembers.change : null,
      trend: 'positive',
      icon: <Users size={18} color="#10B981" />,
      bg: '#ECFDF5',
      onClick: () => navigate('/members'),
    },
    {
      title: 'Total Expenses',
      value: stats ? `৳ ${stats.kpis.totalExpenses.value}` : null,
      subtext: stats ? stats.kpis.totalExpenses.change : null,
      trend: 'negative',
      icon: <CreditCard size={18} color="#F43F5E" />,
      bg: '#FFF1F2',
      onClick: () => navigate('/expenses'),
    },
    {
      title: 'Today Meals',
      value: stats?.todayMeals ? `${stats.todayMeals.total}` : (stats ? '0' : null),
      subtext: stats?.todayMeals
        ? `B: ${stats.todayMeals.breakfast} | L: ${stats.todayMeals.lunch} | D: ${stats.todayMeals.dinner}`
        : 'Daily active count',
      trend: 'neutral',
      icon: <Utensils size={18} color="#0EA5E9" />,
      bg: '#F0F9FF',
      onClick: () => navigate('/meals'),
    },
    {
      title: 'Estimated Meal Rate',
      value: stats ? `৳ ${stats.kpis.mealRate.value}` : null,
      subtext: stats ? stats.kpis.mealRate.label : null,
      trend: 'warning',
      icon: <ArrowLeftRight size={18} color="#8B5CF6" />,
      bg: '#F5F3FF',
      onClick: () => navigate('/bazar'),
    },
  ];

  const recentActivities = stats?.recentActivities || [];
  const topSpenders = stats?.topSpenders || [];
  const expenseByCategory = stats?.expenseByCategory || [];
  const monthlyOverview = stats?.monthlyOverview || [];

  // Dynamic calculation for donut SVG slices
  let accumulatedOffset = 0;
  const donutSlices = expenseByCategory
    .filter((cat) => cat.percentage > 0)
    .map((cat) => {
      const slice = {
        ...cat,
        strokeDasharray: `${cat.percentage} ${100 - cat.percentage}`,
        strokeDashoffset: -accumulatedOffset,
      };
      accumulatedOffset += cat.percentage;
      return slice;
    });

  return (
    <div>
      {/* Greeting Banner */}
      <div className="dashboard-greeting-row">
        <div>
          <h2 className="greeting-title">Good Day, {userName}! 👋</h2>
          <p className="greeting-subtext">
            Operating dashboard for {activeMess?.name || stats?.messName || 'My Mess'}
          </p>
        </div>
        <div className="date-pill-badge">
          <Calendar size={16} color="var(--color-primary)" />
          <span>
            {new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              weekday: 'long',
            })}
          </span>
        </div>
      </div>

      {/* Operational Highlights Pill Banner */}
      {isLoading ? (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <Skeleton width={180} height={32} borderRadius="var(--radius-full)" />
          <Skeleton width={180} height={32} borderRadius="var(--radius-full)" />
          <Skeleton width={180} height={32} borderRadius="var(--radius-full)" />
        </div>
      ) : stats?.operationalSummary ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              fontSize: '0.8rem',
              color: '#065F46',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={14} color="#10B981" />
            <span>{stats.operationalSummary.activeMembers} Active Members Living</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: stats.operationalSummary.pendingApprovals > 0 ? '#FEF2F2' : '#F8FAFC',
              border: `1px solid ${stats.operationalSummary.pendingApprovals > 0 ? '#FECACA' : '#E2E8F0'}`,
              fontSize: '0.8rem',
              color: stats.operationalSummary.pendingApprovals > 0 ? '#991B1B' : '#475569',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/expenses')}
          >
            <Clock size={14} color={stats.operationalSummary.pendingApprovals > 0 ? '#EF4444' : '#64748B'} />
            <span>
              {stats.operationalSummary.pendingApprovals} Pending Expense Approval
              {stats.operationalSummary.pendingApprovals > 1 ? 's' : ''}
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              fontSize: '0.8rem',
              color: '#1E40AF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/bills')}
          >
            <Receipt size={14} color="#3B82F6" />
            <span>{stats.operationalSummary.upcomingBills} Fixed Bills Due Soon</span>
          </div>
        </div>
      ) : null}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="kpi-card"
            style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            onClick={kpi.onClick}
          >
            <div className="kpi-header">
              <span className="kpi-title">{kpi.title}</span>
              <div className="kpi-icon-box" style={{ backgroundColor: kpi.bg }}>
                {kpi.icon}
              </div>
            </div>

            {isLoading || kpi.value === null ? (
              <div style={{ padding: '6px 0' }}>
                <Skeleton width="65%" height={28} />
                <div style={{ marginTop: 8 }}>
                  <Skeleton width="90%" height={14} />
                </div>
              </div>
            ) : (
              <>
                <div className="kpi-value">{kpi.value}</div>
                <div
                  className="kpi-subtext"
                  style={{
                    color:
                      kpi.trend === 'positive'
                        ? '#10B981'
                        : kpi.trend === 'negative'
                        ? '#EF4444'
                        : '#64748B',
                  }}
                >
                  {kpi.trend === 'positive' && <TrendingUp size={14} />}
                  <span>{kpi.subtext}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Middle Grid: Monthly Overview + Expense by Category + Recent Activities */}
      <div className="dashboard-middle-grid">
        {/* Monthly Overview Chart */}
        <Card
          title="Monthly Expense Overview"
          rightAction={
            <div className="card-legend">
              <span><span className="legend-dot" style={{ backgroundColor: '#10B981' }} />Food</span>
              <span><span className="legend-dot" style={{ backgroundColor: '#F59E0B' }} />Rent</span>
              <span><span className="legend-dot" style={{ backgroundColor: '#06B6D4' }} />Utilities</span>
              <span><span className="legend-dot" style={{ backgroundColor: '#8B5CF6' }} />Other</span>
            </div>
          }
        >
          {isLoading ? (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Skeleton width="100%" height={180} />
            </div>
          ) : monthlyOverview.length > 0 ? (
            <div style={{ height: 210, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '10px 10px 0 10px', borderBottom: '1px solid #f1f5f9' }}>
              {monthlyOverview.map((col, i) => {
                const maxVal = Math.max(1, col.food, col.rent, col.utilities, col.other);
                const hFood = col.food > 0 ? Math.max(8, Math.round((col.food / maxVal) * 140)) : 4;
                const hRent = col.rent > 0 ? Math.max(8, Math.round((col.rent / maxVal) * 140)) : 4;
                const hUtil = col.utilities > 0 ? Math.max(8, Math.round((col.utilities / maxVal) * 140)) : 4;
                const hOther = col.other > 0 ? Math.max(8, Math.round((col.other / maxVal) * 140)) : 4;

                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                      <div title={`Food: ৳${col.food.toLocaleString()}`} style={{ width: 14, height: hFood, background: '#10B981', borderRadius: '3px 3px 0 0' }} />
                      <div title={`Rent: ৳${col.rent.toLocaleString()}`} style={{ width: 14, height: hRent, background: '#F59E0B', borderRadius: '3px 3px 0 0' }} />
                      <div title={`Utilities: ৳${col.utilities.toLocaleString()}`} style={{ width: 14, height: hUtil, background: '#06B6D4', borderRadius: '3px 3px 0 0' }} />
                      <div title={`Other: ৳${col.other.toLocaleString()}`} style={{ width: 14, height: hOther, background: '#8B5CF6', borderRadius: '3px 3px 0 0' }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{col.month}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              No monthly breakdown data available yet.
            </div>
          )}
        </Card>

        {/* Expense by Category */}
        <Card title="Expense Distribution">
          {isLoading ? (
            <div style={{ height: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Skeleton width={120} height={120} borderRadius="50%" />
              <Skeleton width="80%" height={16} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', width: 140, height: 140 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {donutSlices.length > 0 ? (
                    donutSlices.map((slice, i) => (
                      <circle
                        key={i}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="4.2"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                      />
                    ))
                  ) : (
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="4.2" strokeDasharray="100 0" />
                  )}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                    ৳ {stats?.kpis.totalExpenses.value || '0'}
                  </span>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.75rem' }}>
                {expenseByCategory.map((cat, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="legend-dot" style={{ backgroundColor: cat.color }} />
                      <span>{cat.category}</span>
                    </span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>
                      {cat.percentage}% <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>({cat.amount > 0 ? `৳${cat.amount.toLocaleString()}` : '৳0'})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Recent Activities */}
        <Card title="Recent Activity Feed">
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Skeleton width={32} height={32} borderRadius="var(--radius-md)" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="85%" height={14} />
                    <div style={{ marginTop: 4 }}>
                      <Skeleton width="40%" height={10} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="activity-list">
              {recentActivities.map((act) => (
                <div key={act.id} className="activity-item">
                  <div
                    className="activity-icon-badge"
                    style={{
                      backgroundColor:
                        act.category === 'Food' || act.type === 'bazar'
                          ? '#ECFDF5'
                          : act.category === 'Meals' || act.type === 'meal'
                          ? '#F0F9FF'
                          : act.category === 'Utilities' || act.type === 'bill'
                          ? '#FFFBEB'
                          : '#F5F3FF',
                    }}
                  >
                    {act.category === 'Food' || act.type === 'bazar' ? (
                      <Receipt size={14} color="#10B981" />
                    ) : act.category === 'Meals' || act.type === 'meal' ? (
                      <Utensils size={14} color="#0EA5E9" />
                    ) : act.category === 'Utilities' || act.type === 'bill' ? (
                      <Receipt size={14} color="#F59E0B" />
                    ) : (
                      <Users size={14} color="#8B5CF6" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="activity-text">{act.title}</div>
                    <div className="activity-time">{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              No recent activity recorded for this period.
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Grid: Top Spenders + Quick Actions */}
      <div className="dashboard-bottom-grid">
        <Card title="Top Mess Spenders">
          {isLoading ? (
            <div style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} width="25%" height={80} borderRadius="var(--radius-md)" />
              ))}
            </div>
          ) : topSpenders.length > 0 ? (
            <div className="spenders-row">
              {topSpenders.map((spender) => (
                <div key={spender.rank} className="spender-card">
                  <span className="spender-rank">{spender.rank}</span>
                  <div className="spender-avatar">
                    {spender.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="spender-name">{spender.name}</div>
                  <div className="spender-amount">{spender.amount}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              No member expenses or bazar contributions recorded yet.
            </div>
          )}
        </Card>

        <Card title="Core Quick Actions">
          <div className="quick-actions-grid">
            <button className="action-btn" onClick={() => navigate('/meals')}>
              <Utensils size={18} className="action-btn-icon" />
              <span>Record Meals</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/bazar')}>
              <ShoppingCart size={18} className="action-btn-icon" />
              <span>Record Bazar</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/expenses')}>
              <PlusCircle size={18} className="action-btn-icon" />
              <span>Add Expense</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/bills')}>
              <Receipt size={18} className="action-btn-icon" />
              <span>Fixed Bills</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/ledger')}>
              <CreditCard size={18} className="action-btn-icon" />
              <span>Shared Ledger</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/settlement')}>
              <ArrowLeftRight size={18} className="action-btn-icon" />
              <span>Settle Up</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
