import React, { useState, useEffect } from 'react';
import {
  FileText,
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
  const [bills, setBills] = useState<Bill[]>(() => {
    try {
      const cached = sessionStorage.getItem(`messmate_bills_${messId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringBill[]>(() => {
    try {
      const cached = sessionStorage.getItem(`messmate_bill_templates_${messId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [members, setMembers] = useState<MessMember[]>(() => {
    try {
      const cached = sessionStorage.getItem(`messmate_members_${messId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !sessionStorage.getItem(`messmate_bills_${messId}`);
    } catch {
      return true;
    }
  });
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
      try {
        sessionStorage.setItem(`messmate_bills_${messId}`, JSON.stringify(billsRes));
        sessionStorage.setItem(`messmate_bill_templates_${messId}`, JSON.stringify(templatesRes));
        sessionStorage.setItem(`messmate_members_${messId}`, JSON.stringify(activeM));
      } catch {
        //
      }
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Fixed Bills</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
            ৳ {totalBillsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>Current period</div>
        </div>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Paid</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: 4 }}>
            ৳ {paidBillsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 4 }}>Cleared out</div>
        </div>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outstanding Due</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444', marginTop: 4 }}>
            ৳ {dueBillsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>Needs settlement</div>
        </div>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Invoices</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
            {upcomingBillsCount} Bills
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>Due or Upcoming</div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="table-container">
        <div className="table-header-bar">
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
              Recurring Templates ({recurringTemplates.length})
            </button>
          </div>

          {activeTab === 'bills' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(['ALL', 'DUE', 'UPCOMING', 'PAID'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
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

        {isLoading ? (
          <div style={{ padding: 40 }}>
            <PageLoader message="Loading bills data..." />
          </div>
        ) : activeTab === 'bills' ? (
          filteredBills.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>No Bills Found</p>
              <p style={{ fontSize: '0.82rem' }}>Add a fixed monthly bill to begin monitoring.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill Name</th>
                  <th>Category</th>
                  <th>Period</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Paid By / Payment Info</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.name}</div>
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
