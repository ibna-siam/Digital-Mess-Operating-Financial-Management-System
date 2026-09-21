import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Calendar,
  CheckCircle2,
  Repeat,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { Bill, BillStatus, RecurringBill, MessMember } from '../types/index.js';

export const BillsPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id || '';

  const [activeTab, setActiveTab] = useState<'bills' | 'recurring'>('bills');
  const [bills, setBills] = useState<Bill[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringBill[]>([]);
  const [members, setMembers] = useState<MessMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | BillStatus>('ALL');

  // Add Bill Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Bill Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Rent');
  const [amount, setAmount] = useState('');
  const [billingPeriod, setBillingPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [isRecurring, setIsRecurring] = useState(true);
  const [notes, setNotes] = useState('');

  // Mark Paid Modal
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BKASH');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [paySubmitting, setPaySubmitting] = useState(false);

  const fetchBillsData = async () => {
    setIsLoading(true);
    try {
      const [billsRes, templatesRes, membersRes] = await Promise.all([
        apiClient<Bill[]>(`/messes/${messId}/bills`),
        apiClient<RecurringBill[]>(`/messes/${messId}/bills/templates`),
        apiClient<MessMember[]>(`/messes/${messId}/members`),
      ]);
      setBills(billsRes);
      setRecurringTemplates(templatesRes);
      const activeM = membersRes.filter((m) => m.status === 'ACTIVE');
      setMembers(activeM);
      if (membersRes.length > 0 && !paidByMemberId) {
        setPaidByMemberId(membersRes[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch bills', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillsData();
  }, [messId]);

  useDataSync(['bills', 'utilities'], fetchBillsData);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Please enter a valid bill amount.');
      return;
    }

    if (!name.trim()) {
      setFormError('Please enter a bill name.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient(`/messes/${messId}/bills`, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category,
          amount: parsedAmount,
          billingPeriod,
          dueDate,
          isRecurring,
          notes: notes.trim() || undefined,
        }),
      });

      setIsAddModalOpen(false);
      setName('');
      setAmount('');
      setNotes('');
      await fetchBillsData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;

    try {
      setPaySubmitting(true);
      await apiClient(`/messes/${messId}/bills/${payingBill.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          paidByMemberId,
          paymentMethod,
          paidAt,
        }),
      });

      setPayingBill(null);
      await fetchBillsData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark bill as paid.');
    } finally {
      setPaySubmitting(false);
    }
  };

  // KPIs
  const totalBillsAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const paidBillsAmount = bills
    .filter((b) => b.status === 'PAID')
    .reduce((sum, b) => sum + b.amount, 0);
  const dueBillsAmount = bills
    .filter((b) => b.status === 'DUE' || b.status === 'OVERDUE')
    .reduce((sum, b) => sum + b.amount, 0);
  const upcomingBillsCount = bills.filter((b) => b.status === 'UPCOMING' || b.status === 'DUE').length;

  const filteredBills = bills.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Fixed Bills & Recurring Costs
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Schedule and track recurring facility expenses, utilities, rent, and payment status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button icon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
            Add Fixed Bill
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="kpi-card" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Bills</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
            ৳ {totalBillsAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 2 }}>Current period</div>
        </div>
        <div className="kpi-card" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Paid</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: 2 }}>
            ৳ {paidBillsAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#10B981', marginTop: 2 }}>Cleared out</div>
        </div>
        <div className="kpi-card" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outstanding</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EF4444', marginTop: 2 }}>
            ৳ {dueBillsAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 2 }}>Needs settlement</div>
        </div>
        <div className="kpi-card" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Invoices</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B', marginTop: 2 }}>
            {upcomingBillsCount} Bills
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 2 }}>Due / upcoming</div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="table-container">
        <div className="table-header-bar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="table-tabs">
            <button
              className={`table-tab ${activeTab === 'bills' ? 'active' : ''}`}
              onClick={() => setActiveTab('bills')}
            >
              Current Bills ({bills.length})
            </button>
            <button
              className={`table-tab ${activeTab === 'recurring' ? 'active' : ''}`}
              onClick={() => setActiveTab('recurring')}
            >
              Templates ({recurringTemplates.length})
            </button>
          </div>

          {activeTab === 'bills' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {(['ALL', 'DUE', 'UPCOMING', 'PAID'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    border: '1px solid var(--color-border)',
                    backgroundColor: statusFilter === st ? 'var(--color-primary-dark)' : '#ffffff',
                    color: statusFilter === st ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'bills' ? (
          isLoading ? (
            <div style={{ padding: 40 }}>
              <PageLoader message="Loading bills..." />
            </div>
          ) : filteredBills.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>No Bills Found</p>
              <p style={{ fontSize: '0.82rem' }}>Add a fixed facility bill or generate next month recurring bills.</p>
            </div>
          ) : (
            <>
              {/* Mobile Bills Feed (< md) */}
              <div className="block md:hidden" style={{ padding: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredBills.map((b) => (
                    <div
                      key={b.id}
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
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                            {b.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={11} /> Due: {b.dueDate}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>•</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {b.billingPeriod}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                            ৳{b.amount.toLocaleString()}
                          </div>
                          <Badge
                            variant={
                              b.status === 'PAID'
                                ? 'success'
                                : b.status === 'DUE'
                                ? 'warning'
                                : b.status === 'OVERDUE'
                                ? 'danger'
                                : 'info'
                            }
                          >
                            {b.status}
                          </Badge>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                        <Badge variant="info">{b.category}</Badge>
                        {b.status !== 'PAID' ? (
                          <button
                            onClick={() => {
                              setPayingBill(b);
                              if (members.length > 0) setPaidByMemberId(members[0].id);
                            }}
                            style={{
                              backgroundColor: 'var(--color-primary)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <CheckCircle2 size={12} /> Mark Paid
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} /> Paid by {b.paidByName || 'Member'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table (hidden on mobile) */}
              <div className="hidden md:block" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Period</th>
                      <th>Due Date</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th>Paid Details</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{b.name}</div>
                          {b.isRecurring && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--color-primary-dark)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontWeight: 600,
                              }}
                            >
                              <Repeat size={10} /> Monthly recurring
                            </span>
                          )}
                        </td>
                        <td>
                          <Badge variant="info">{b.category}</Badge>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{b.billingPeriod}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} color="#94A3B8" />
                            {b.dueDate}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                          ৳ {b.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Badge
                            variant={
                              b.status === 'PAID'
                                ? 'success'
                                : b.status === 'DUE'
                                ? 'warning'
                                : b.status === 'OVERDUE'
                                ? 'danger'
                                : 'info'
                            }
                          >
                            {b.status}
                          </Badge>
                        </td>
                        <td>
                          {b.status === 'PAID' ? (
                            <div style={{ fontSize: '0.8rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{b.paidByName || 'Member'}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {b.paidAt} • {b.paymentMethod || 'CASH'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>Unpaid</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {b.status !== 'PAID' ? (
                            <Button
                              icon={<CheckCircle2 size={13} />}
                              onClick={() => {
                                setPayingBill(b);
                                if (members.length > 0) setPaidByMemberId(members[0].id);
                              }}
                            >
                              Mark Paid
                            </Button>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#10B981',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <CheckCircle2 size={13} /> Paid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          /* Recurring Templates Tab */
          <div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                These templates automatically remind managers and pre-generate bills on a designated recurring day of each month.
              </p>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Category</th>
                  <th>Frequency</th>
                  <th>Due Day of Month</th>
                  <th style={{ textAlign: 'right' }}>Standard Amount</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recurringTemplates.map((tpl) => (
                  <tr key={tpl.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{tpl.name}</td>
                    <td>
                      <Badge variant="info">{tpl.category}</Badge>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{tpl.frequency}</td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>Day {tpl.dueDay} of each month</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                      ৳ {tpl.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={tpl.isActive ? 'success' : 'neutral'}>
                        {tpl.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Bill Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Fixed Bill" maxWidth={560}>
        <form onSubmit={handleCreateBill}>
          {formError && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #F87171',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: '#991B1B',
                fontSize: '0.82rem',
                marginBottom: 16,
              }}
            >
              {formError}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
              Bill Name *
            </label>
            <input
              type="text"
              placeholder="e.g. House Rent or WiFi Bill"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backgroundColor: '#fff',
                }}
              >
                <option value="House Rent">House Rent</option>
                <option value="Utilities">Electricity (DESCO/DPDC)</option>
                <option value="Internet">Internet / WiFi</option>
                <option value="Staff Salary">Maid / Cook Salary</option>
                <option value="Maintenance">Maintenance & Guard</option>
                <option value="Gas / Fuel">Gas Cylinder / Line</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Amount (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 20000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  fontWeight: 700,
                }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Billing Period (YYYY-MM) *
              </label>
              <input
                type="text"
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              Save as monthly recurring template
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
              Notes
            </label>
            <input
              type="text"
              placeholder="Account numbers, remarks, or specific instructions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Bill'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mark Bill Paid Modal */}
      {payingBill && (
        <Modal
          isOpen={Boolean(payingBill)}
          onClose={() => setPayingBill(null)}
          title={`Mark Bill as Paid: ${payingBill.name}`}
          maxWidth={500}
        >
          <form onSubmit={handlePayBill}>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#F8FAFC',
                borderRadius: 'var(--radius-md)',
                marginBottom: 16,
                border: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Payable Amount</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                  ৳ {payingBill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <Badge variant="warning">Due {payingBill.dueDate}</Badge>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Paid By Member *
              </label>
              <select
                value={paidByMemberId}
                onChange={(e) => setPaidByMemberId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backgroundColor: '#fff',
                }}
                required
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    backgroundColor: '#fff',
                  }}
                >
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="secondary" type="button" onClick={() => setPayingBill(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={paySubmitting}>
                {paySubmitting ? 'Confirming...' : 'Confirm Payment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
