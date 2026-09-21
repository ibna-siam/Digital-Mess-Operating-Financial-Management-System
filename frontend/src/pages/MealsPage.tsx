import React, { useState, useEffect } from 'react';
import { Plus, Check, ArrowLeft, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { MealRecord, MealSummary } from '../types/index.js';

export const MealsPage: React.FC = () => {
  const { user, activeMess } = useAuth();
  const messId = activeMess?.id || '';

  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'daily' | 'calendar'>('daily');

  // Clean state initialization
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [summary, setSummary] = useState<MealSummary | null>(null);
  const [calendarDays, setCalendarDays] = useState<Array<{ date: string; day: number; totalMeals: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Self entry state for current user
  const [myBreakfast, setMyBreakfast] = useState(false);
  const [myLunch, setMyLunch] = useState(false);
  const [myDinner, setMyDinner] = useState(false);

  // Bulk Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkEntries, setBulkEntries] = useState<Array<{ memberId: string; name: string; breakfast: number; lunch: number; dinner: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMealData = async (date: string) => {
    setIsLoading(true);
    try {
      const [dailyData, summaryData] = await Promise.all([
        apiClient<MealRecord[]>(`/messes/${messId}/meals?date=${date}`),
        apiClient<MealSummary>(`/messes/${messId}/meals/summary?date=${date}`),
      ]);

      setMeals(dailyData);
      setSummary(summaryData);

      // Find current user's entry
      const myEntry = dailyData.find((m) => m.memberName.toLowerCase().includes(user?.name?.toLowerCase() || 'siam'));
      if (myEntry) {
        setMyBreakfast(myEntry.breakfast > 0);
        setMyLunch(myEntry.lunch > 0);
        setMyDinner(myEntry.dinner > 0);
      }
    } catch (err) {
      console.error('Failed to fetch meals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const now = new Date(currentDate);
      const res = await apiClient<{ days: Array<{ date: string; day: number; totalMeals: number }> }>(
        `/messes/${messId}/meals/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
      );
      setCalendarDays(res.days);
    } catch {
      //
    }
  };

  useEffect(() => {
    fetchMealData(currentDate);
  }, [currentDate, messId]);

  useDataSync(['meals'], () => {
    fetchMealData(currentDate);
    if (activeTab === 'calendar') {
      fetchCalendarData();
    }
  });

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendarData();
    }
  }, [activeTab]);

  const toggleSelfMeal = async (type: 'breakfast' | 'lunch' | 'dinner', currentVal: boolean) => {
    const newVal = !currentVal;
    if (type === 'breakfast') setMyBreakfast(newVal);
    if (type === 'lunch') setMyLunch(newVal);
    if (type === 'dinner') setMyDinner(newVal);

    try {
      await apiClient(`/messes/${messId}/meals/quick-self`, {
        method: 'POST',
        body: JSON.stringify({
          date: currentDate,
          mealType: type,
          count: newVal ? 1 : 0,
        }),
      });
      fetchMealData(currentDate);
    } catch {
      // Revert if error
      if (type === 'breakfast') setMyBreakfast(currentVal);
      if (type === 'lunch') setMyLunch(currentVal);
      if (type === 'dinner') setMyDinner(currentVal);
    }
  };

  const openBulkModal = () => {
    setBulkEntries(
      meals.map((m) => ({
        memberId: m.memberId,
        name: m.memberName,
        breakfast: m.breakfast,
        lunch: m.lunch,
        dinner: m.dinner,
      }))
    );
    setIsBulkModalOpen(true);
  };

  const handleSaveBulk = async () => {
    setIsSubmitting(true);
    try {
      await apiClient(`/messes/${messId}/meals/bulk`, {
        method: 'POST',
        body: JSON.stringify({
          date: currentDate,
          entries: bulkEntries,
        }),
      });
      setIsBulkModalOpen(false);
      fetchMealData(currentDate);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating meals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShiftDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Header & Date controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Meals</h1>
          <p className="text-text-muted text-sm mt-0.5">
            1-tap self-entry, manager bulk recording, and operational meal tracking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Date Picker Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '4px 8px',
            }}
          >
            <button
              onClick={() => handleShiftDate(-1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              title="Previous Day"
            >
              <ArrowLeft size={16} />
            </button>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 600,
                fontSize: '0.88rem',
                color: 'var(--text-main)',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <button
              onClick={() => handleShiftDate(1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              title="Next Day"
            >
              <ArrowRight size={16} />
            </button>
          </div>

          <Button onClick={openBulkModal} className="gap-1.5">
            <Plus size={16} /> Bulk Record Meals
          </Button>
        </div>
      </div>

      {/* 1-Tap Quick Self-Entry Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 24px',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-light)',
            }}
          >
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
              Quick Meal Self-Entry ({user?.name || 'You'})
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
              Tap to mark whether you will eat breakfast, lunch, or dinner today
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => toggleSelfMeal('breakfast', myBreakfast)}
            style={{
              background: myBreakfast ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              transition: 'all 0.15s ease',
            }}
          >
            {myBreakfast && <Check size={14} />} Breakfast
          </button>
          <button
            onClick={() => toggleSelfMeal('lunch', myLunch)}
            style={{
              background: myLunch ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              transition: 'all 0.15s ease',
            }}
          >
            {myLunch && <Check size={14} />} Lunch
          </button>
          <button
            onClick={() => toggleSelfMeal('dinner', myDinner)}
            style={{
              background: myDinner ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              transition: 'all 0.15s ease',
            }}
          >
            {myDinner && <Check size={14} />} Dinner
          </button>
        </div>
      </div>

      {/* Mini KPI stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="kpi-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Meals</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
            {isLoading && !summary ? (
              <span className="inline-block w-12 h-6 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            ) : (
              summary?.totalMealsToday ?? 0
            )}
          </div>
        </div>
        <div className="kpi-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>B / L / D</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: 2 }}>
            {isLoading && !summary ? (
              <span className="inline-block w-20 h-5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            ) : summary ? (
              `${summary.totalBreakfast}/${summary.totalLunch}/${summary.totalDinner}`
            ) : (
              '0/0/0'
            )}
          </div>
        </div>
        <div className="kpi-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Diners</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
            {isLoading && !summary ? (
              <span className="inline-block w-10 h-6 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            ) : (
              summary?.activeMembers ?? 0
            )}
          </div>
        </div>
        <div className="kpi-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg / Member</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
            {isLoading && !summary ? (
              <span className="inline-block w-14 h-6 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            ) : (
              `${summary?.avgPerMember ?? 0}`
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="table-container">
        <div className="table-header-bar">
          <div className="table-tabs">
            <button
              className={`table-tab ${activeTab === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              Daily Meals
            </button>
            <button
              className={`table-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              Monthly Calendar
            </button>
          </div>
        </div>

        {activeTab === 'calendar' ? (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8 }}>
              {calendarDays.map((cd) => (
                <div
                  key={cd.date}
                  style={{
                    background: cd.date === currentDate ? 'var(--color-primary-subtle, #ecfdf5)' : '#f8fafc',
                    border: `1px solid ${cd.date === currentDate ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: '12px',
                    padding: '10px 6px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setCurrentDate(cd.date);
                    setActiveTab('daily');
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: cd.date === currentDate ? 'var(--color-primary-dark)' : 'var(--text-muted)' }}>
                    Day {cd.day}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                    {cd.totalMeals}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-subtle)' }}>meals</div>
                </div>
              ))}
            </div>
          </div>
        ) : isLoading && meals.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Meal Cards (< md) */}
            <div className="block md:hidden" style={{ padding: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {meals.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      background: 'var(--color-card, #ffffff)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '16px',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {row.memberName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {row.roomNo ? `Room ${row.roomNo}` : 'Unassigned'}
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: 'var(--color-primary)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {row.total} Meals
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 6,
                        background: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>BREAKFAST</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: row.breakfast > 0 ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                          {row.breakfast}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>LUNCH</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: row.lunch > 0 ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                          {row.lunch}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>DINNER</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: row.dinner > 0 ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                          {row.dinner}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>GUESTS</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                          {row.guestBreakfast + row.guestLunch + row.guestDinner}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {meals.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No meal records found for this date.
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Room</th>
                    <th>Breakfast</th>
                    <th>Lunch</th>
                    <th>Dinner</th>
                    <th>Guest Meals</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {meals.map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600 }}>{row.memberName}</td>
                      <td>{row.roomNo || 'Unassigned'}</td>
                      <td>{row.breakfast}</td>
                      <td>{row.lunch}</td>
                      <td>{row.dinner}</td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {row.guestBreakfast + row.guestLunch + row.guestDinner}
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{row.total}</td>
                    </tr>
                  ))}
                  {meals.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                        No meal records found for this date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Bulk Record Meals Modal */}
      <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title={`Bulk Record Meals (${currentDate})`} maxWidth={640}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Record or modify breakfast, lunch, and dinner counts for all active mess members at once.
          </p>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th style={{ width: 80 }}>B-fast</th>
                  <th style={{ width: 80 }}>Lunch</th>
                  <th style={{ width: 80 }}>Dinner</th>
                </tr>
              </thead>
              <tbody>
                {bulkEntries.map((entry, idx) => (
                  <tr key={entry.memberId}>
                    <td style={{ fontWeight: 600 }}>{entry.name}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={entry.breakfast}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBulkEntries((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, breakfast: val } : it))
                          );
                        }}
                        style={{ width: 60, padding: '4px 6px', borderRadius: 4, border: '1px solid #cbd5e1', textAlign: 'center' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={entry.lunch}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBulkEntries((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, lunch: val } : it))
                          );
                        }}
                        style={{ width: 60, padding: '4px 6px', borderRadius: 4, border: '1px solid #cbd5e1', textAlign: 'center' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={entry.dinner}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBulkEntries((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, dinner: val } : it))
                          );
                        }}
                        style={{ width: 60, padding: '4px 6px', borderRadius: 4, border: '1px solid #cbd5e1', textAlign: 'center' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <Button variant="secondary" onClick={() => setIsBulkModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBulk} isLoading={isSubmitting}>Save All Meals</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
