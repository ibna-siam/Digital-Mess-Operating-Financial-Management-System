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
  ChevronRight,
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
      {/* =========================================================================
          MOBILE PURPOSE-BUILT DASHBOARD (md:hidden)
          Modern Fintech & Mess Operating Mobile App UI
         ========================================================================= */}
      <div className="block md:hidden space-y-4 pb-4">
        {/* 1. Greeting & Context Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Hello, {userName} 👋
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {activeMess?.name || stats?.messName || 'My Mess'} · {new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Mess
          </div>
        </div>

        {/* 2. Premium Hero Financial Card - Crisp White with Emerald Glow */}
        <div className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-xs border border-emerald-100/90">
          {/* Ambient Mint & Emerald Glow */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-emerald-500/8 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -top-8 w-36 h-36 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                Total Month Expenses
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                Active Period
              </span>
            </div>

            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-slate-900">
                {isLoading ? <Skeleton width={120} height={36} /> : `৳ ${stats?.kpis.totalExpenses.value || '0'}`}
              </span>
              <span className="text-xs text-slate-400 font-medium">Food + Overheads</span>
            </div>

            {/* Bottom 3-Column Key Metrics Sub-Bar */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100 text-center">
              <div className="pr-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Meal Rate</div>
                <div className="text-sm font-extrabold text-emerald-600 mt-0.5">
                  {isLoading ? '...' : `৳ ${stats?.kpis.mealRate.value || '0.00'}`}
                </div>
              </div>
              <div className="px-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Today Meals</div>
                <div className="text-sm font-extrabold text-sky-600 mt-0.5">
                  {isLoading ? '...' : stats?.todayMeals?.total ?? '0'}
                </div>
                <div className="text-[9px] text-slate-400">
                  {stats?.todayMeals ? `${stats.todayMeals.breakfast}B · ${stats.todayMeals.lunch}L · ${stats.todayMeals.dinner}D` : ''}
                </div>
              </div>
              <div className="pl-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Residents</div>
                <div className="text-sm font-extrabold text-purple-600 mt-0.5">
                  {isLoading ? '...' : stats?.operationalSummary?.activeMembers ?? stats?.kpis.totalMembers.value ?? 0}
                </div>
                <div className="text-[9px] text-slate-400">living</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Mobile Multi-Month Expense Overview Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight">Monthly Expense Overview</h2>
              <p className="text-[10px] text-slate-400 font-medium">6-Month Trend (Apr – Sep)</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Food</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" />Utilities</span>
            </div>
          </div>

          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Skeleton width="100%" height={120} />
            </div>
          ) : monthlyOverview.length > 0 ? (
            (() => {
              const globalMax = Math.max(
                1,
                ...monthlyOverview.flatMap((c) => [c.food, c.rent, c.utilities, c.other])
              );
              return (
                <div className="h-44 flex items-end justify-between pt-4 pb-1 px-1 border-b border-slate-100 overflow-x-auto">
                  {monthlyOverview.map((col, i) => {
                    const hFood = col.food > 0 ? Math.max(8, Math.round((col.food / globalMax) * 110)) : 3;
                    const hRent = col.rent > 0 ? Math.max(8, Math.round((col.rent / globalMax) * 110)) : 3;
                    const hUtil = col.utilities > 0 ? Math.max(8, Math.round((col.utilities / globalMax) * 110)) : 3;
                    const hOther = col.other > 0 ? Math.max(8, Math.round((col.other / globalMax) * 110)) : 3;
                    const isCurrent = i === monthlyOverview.length - 1;

                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 min-w-[44px]">
                        <div className="flex items-end gap-1">
                          <div
                            title={`${col.month} Food: ৳${col.food.toLocaleString()}`}
                            style={{ height: hFood }}
                            className="w-2.5 bg-emerald-500 rounded-t-sm transition-all"
                          />
                          {col.rent > 0 && (
                            <div
                              title={`${col.month} Rent: ৳${col.rent.toLocaleString()}`}
                              style={{ height: hRent }}
                              className="w-2.5 bg-amber-500 rounded-t-sm transition-all"
                            />
                          )}
                          <div
                            title={`${col.month} Utilities: ৳${col.utilities.toLocaleString()}`}
                            style={{ height: hUtil }}
                            className="w-2.5 bg-cyan-500 rounded-t-sm transition-all"
                          />
                          {col.other > 0 && (
                            <div
                              title={`${col.month} Other: ৳${col.other.toLocaleString()}`}
                              style={{ height: hOther }}
                              className="w-2.5 bg-purple-500 rounded-t-sm transition-all"
                            />
                          )}
                        </div>
                        <span className={`text-[10px] ${isCurrent ? 'text-emerald-700 font-extrabold' : 'text-slate-400 font-semibold'}`}>
                          {col.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-slate-400">
              No historical data available.
            </div>
          )}
        </div>

        {/* 4. Quick Action Grid */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-3.5 shadow-xs">
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Quick Hub
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <button
              onClick={() => navigate('/bazar')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
                <ShoppingCart size={19} />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Bazar</span>
            </button>

            <button
              onClick={() => navigate('/meals')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-sky-50/50 hover:bg-sky-50 active:scale-95 transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/25">
                <Utensils size={19} />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Meals</span>
            </button>

            <button
              onClick={() => navigate('/expenses')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-rose-50/50 hover:bg-rose-50 active:scale-95 transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/25">
                <PlusCircle size={19} />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Expenses</span>
            </button>

            <button
              onClick={() => navigate('/settlement')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-purple-50/50 hover:bg-purple-50 active:scale-95 transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25">
                <CheckCircle2 size={19} />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Settle</span>
            </button>
          </div>
        </div>

        {/* 5. Operational Highlights & Action Banners */}
        {stats?.operationalSummary && (stats.operationalSummary.pendingApprovals > 0 || stats.operationalSummary.upcomingBills > 0) && (
          <div className="space-y-2">
            {stats.operationalSummary.pendingApprovals > 0 && (
              <div
                onClick={() => navigate('/expenses')}
                className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold active:scale-[0.98] transition-transform cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-amber-200/70 text-amber-800 flex items-center justify-center">
                    <Clock size={15} />
                  </div>
                  <span>{stats.operationalSummary.pendingApprovals} Pending Expense Approval{stats.operationalSummary.pendingApprovals > 1 ? 's' : ''}</span>
                </div>
                <ChevronRight size={15} className="text-amber-500" />
              </div>
            )}
            {stats.operationalSummary.upcomingBills > 0 && (
              <div
                onClick={() => navigate('/bills-utilities')}
                className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-bold active:scale-[0.98] transition-transform cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-blue-200/70 text-blue-800 flex items-center justify-center">
                    <Receipt size={15} />
                  </div>
                  <span>{stats.operationalSummary.upcomingBills} Bill{stats.operationalSummary.upcomingBills > 1 ? 's' : ''} Due Soon</span>
                </div>
                <ChevronRight size={15} className="text-blue-500" />
              </div>
            )}
          </div>
        )}

        {/* 6. Expense Distribution Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold text-slate-900">Expense Breakdown</span>
              <p className="text-[10px] text-slate-400 font-medium">By Category This Month</p>
            </div>
            <span className="text-xs font-extrabold text-slate-900">৳ {stats?.kpis.totalExpenses.value || '0'}</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton width="100%" height={12} />
              <Skeleton width="100%" height={12} />
            </div>
          ) : expenseByCategory.length > 0 ? (
            <div className="space-y-2.5">
              {expenseByCategory.map((cat, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.category}
                    </span>
                    <span className="text-slate-900 font-bold">৳ {cat.amount.toLocaleString()} ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">No expenses recorded yet.</p>
          )}
        </div>

        {/* 7. Recent Activity Feed */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900">Recent Activity</span>
            <button
              onClick={() => navigate('/ledger')}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
            >
              View Ledger
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-2.5">
              <Skeleton width="100%" height={32} />
              <Skeleton width="100%" height={32} />
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentActivities.slice(0, 4).map((act) => (
                <div key={act.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                    {act.category === 'Food' || act.type === 'bazar' ? (
                      <ShoppingCart size={15} className="text-emerald-600" />
                    ) : act.category === 'Meals' || act.type === 'meal' ? (
                      <Utensils size={15} className="text-sky-600" />
                    ) : (
                      <Receipt size={15} className="text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{act.title}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-3">No recent activities.</p>
          )}
        </div>

        {/* 7. Top Spenders Carousel */}
        {topSpenders.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs">
            <div className="text-xs font-bold text-slate-900 mb-2.5">Top Mess Spenders</div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {topSpenders.map((s) => (
                <div
                  key={s.rank}
                  className="flex-shrink-0 w-24 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center"
                >
                  <div className="w-7 h-7 mx-auto rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-[11px] font-bold text-slate-800 truncate mt-1.5">{s.name.split(' ')[0]}</div>
                  <div className="text-[10px] font-extrabold text-emerald-600 truncate">{s.amount}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          DESKTOP DASHBOARD (hidden md:block)
          Preserved original full-fidelity SaaS desktop dashboard layout
         ========================================================================= */}
      <div className="hidden md:block">
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
            onClick={() => navigate('/bills-utilities')}
          >
            <Receipt size={14} color="#3B82F6" />
            <span>{stats.operationalSummary.upcomingBills} Bills Due Soon</span>
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
            (() => {
              const globalMax = Math.max(
                1,
                ...monthlyOverview.flatMap((c) => [c.food, c.rent, c.utilities, c.other])
              );
              return (
                <div style={{ height: 210, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '10px 8px 0 8px', borderBottom: '1px solid #f1f5f9' }}>
                  {monthlyOverview.map((col, i) => {
                    const hFood = col.food > 0 ? Math.max(6, Math.round((col.food / globalMax) * 140)) : 3;
                    const hRent = col.rent > 0 ? Math.max(6, Math.round((col.rent / globalMax) * 140)) : 3;
                    const hUtil = col.utilities > 0 ? Math.max(6, Math.round((col.utilities / globalMax) * 140)) : 3;
                    const hOther = col.other > 0 ? Math.max(6, Math.round((col.other / globalMax) * 140)) : 3;
                    const isCurrent = i === monthlyOverview.length - 1;

                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                          <div title={`${col.month} Food: ৳${col.food.toLocaleString()}`} style={{ width: 10, height: hFood, background: '#10B981', borderRadius: '3px 3px 0 0', transition: 'height 0.3s ease' }} />
                          <div title={`${col.month} Rent: ৳${col.rent.toLocaleString()}`} style={{ width: 10, height: hRent, background: '#F59E0B', borderRadius: '3px 3px 0 0', transition: 'height 0.3s ease' }} />
                          <div title={`${col.month} Utilities: ৳${col.utilities.toLocaleString()}`} style={{ width: 10, height: hUtil, background: '#06B6D4', borderRadius: '3px 3px 0 0', transition: 'height 0.3s ease' }} />
                          <div title={`${col.month} Other: ৳${col.other.toLocaleString()}`} style={{ width: 10, height: hOther, background: '#8B5CF6', borderRadius: '3px 3px 0 0', transition: 'height 0.3s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.76rem', color: isCurrent ? '#059669' : '#64748b', fontWeight: isCurrent ? 700 : 600 }}>{col.month}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()
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
            <button className="action-btn" onClick={() => navigate('/bills-utilities')}>
              <Receipt size={18} className="action-btn-icon" />
              <span>Bills & Utilities</span>
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
  </div>
);
};
