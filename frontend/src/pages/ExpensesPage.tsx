import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { Expense, ExpenseStatus, ExpenseType, MessMember } from '../types/index.js';

export const ExpensesPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id || '';

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const cached = sessionStorage.getItem(`messmate_expenses_${messId}`);
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
      return !sessionStorage.getItem(`messmate_expenses_${messId}`);
    } catch {
      return true;
    }
  });
  const [filterTab, setFilterTab] = useState<'all' | 'variable' | 'fixed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Expense Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [payerMemberId, setPayerMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<ExpenseType>('VARIABLE');
  const [category, setCategory] = useState('Utilities');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [billingPeriod, setBillingPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Action status
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchExpenseData = async () => {
    try {
      const [expRes, membersRes] = await Promise.all([
        apiClient<Expense[]>(`/messes/${messId}/expenses`),
        apiClient<MessMember[]>(`/messes/${messId}/members`),
      ]);
      setExpenses(expRes);
      const activeM = membersRes.filter((m) => m.status === 'ACTIVE');
      setMembers(activeM);
      try {
        sessionStorage.setItem(`messmate_expenses_${messId}`, JSON.stringify(expRes));
        sessionStorage.setItem(`messmate_members_${messId}`, JSON.stringify(activeM));
      } catch {
        //
      }
      if (membersRes.length > 0 && !payerMemberId) {
        setPayerMemberId(membersRes[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseData();
  }, [messId]);

  useDataSync(['expenses'], fetchExpenseData);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Please enter a valid expense amount.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please enter a description or reason.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient(`/messes/${messId}/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          payerMemberId,
          amount: parsedAmount,
          type,
          category,
          description: description.trim(),
          date,
          billingPeriod,
          receiptUrl: receiptUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      setIsAddModalOpen(false);
      setAmount('');
      setDescription('');
      setNotes('');
      setReceiptUrl('');
      await fetchExpenseData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoadingId(id);
      await apiClient(`/messes/${messId}/expenses/${id}/approve`, { method: 'POST' });
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'APPROVED' as ExpenseStatus } : e))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to approve expense');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Are you sure you want to reject this expense?')) return;
    try {
      setActionLoadingId(id);
      await apiClient(`/messes/${messId}/expenses/${id}/reject`, { method: 'POST' });
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'REJECTED' as ExpenseStatus } : e))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to reject expense');
    } finally {
      setActionLoadingId(null);
    }
  };

  // KPIs
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const variableAmount = expenses
    .filter((e) => e.type === 'VARIABLE')
    .reduce((sum, e) => sum + e.amount, 0);
  const fixedAmount = expenses
    .filter((e) => e.type === 'FIXED')
    .reduce((sum, e) => sum + e.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === 'PENDING_APPROVAL').length;

  // Filtered List
  const filteredExpenses = expenses.filter((e) => {
    if (filterTab === 'variable' && e.type !== 'VARIABLE') return false;
    if (filterTab === 'fixed' && e.type !== 'FIXED') return false;
    if (filterTab === 'pending' && e.status !== 'PENDING_APPROVAL') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        e.payerName.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Expenses Management
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track variable operational costs, fixed facility overheads, and approval authorizations.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
          Add Expense
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Expenses</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
            ৳ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>All categories</div>
        </div>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Variable Expenses</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: 4 }}>
            ৳ {variableAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 4 }}>Bazar & supplies</div>
        </div>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fixed Overheads</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
            ৳ {fixedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>Rent, Maid, WiFi</div>
        </div>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Approval</div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: pendingCount > 0 ? '#EF4444' : 'var(--text-main)',
              marginTop: 4,
            }}
          >
            {pendingCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>Requires review</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-container">
        <div className="table-header-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
          {/* Tabs */}
          <div className="table-tabs">
            <button
              className={`table-tab ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All ({expenses.length})
            </button>
            <button
              className={`table-tab ${filterTab === 'variable' ? 'active' : ''}`}
              onClick={() => setFilterTab('variable')}
            >
              Variable
            </button>
            <button
              className={`table-tab ${filterTab === 'fixed' ? 'active' : ''}`}
              onClick={() => setFilterTab('fixed')}
            >
              Fixed
            </button>
            <button
              className={`table-tab ${filterTab === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterTab('pending')}
            >
              Pending Approval {pendingCount > 0 && `(${pendingCount})`}
            </button>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', minWidth: 240 }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
              />
              <input
                type="text"
                placeholder="Search description, payer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40 }}>
            <PageLoader message="Loading expenses..." />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CreditCard size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>No Expenses Recorded</p>
            <p style={{ fontSize: '0.82rem' }}>Add a new expense to track mess cash flow.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Category</th>
                <th>Payer</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} color="#94A3B8" />
                      {exp.date}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{exp.description}</div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Period: {exp.billingPeriod}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        backgroundColor: exp.type === 'VARIABLE' ? '#ECFDF5' : '#FFFBEB',
                        color: exp.type === 'VARIABLE' ? '#065F46' : '#B45309',
                      }}
                    >
                      {exp.type}
                    </span>
                  </td>
                  <td>
                    <Badge variant={exp.category === 'Food' ? 'success' : exp.category === 'House Rent' ? 'warning' : 'info'}>
                      {exp.category}
                    </Badge>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{exp.payerName}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    ৳ {exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Badge
                      variant={
                        exp.status === 'APPROVED'
                          ? 'success'
                          : exp.status === 'PENDING_APPROVAL'
                          ? 'warning'
                          : exp.status === 'REJECTED'
                          ? 'danger'
                          : 'neutral'
                      }
                    >
                      {exp.status === 'PENDING_APPROVAL' ? 'Pending' : exp.status}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {exp.status === 'PENDING_APPROVAL' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button
                          onClick={() => handleApprove(exp.id)}
                          disabled={actionLoadingId === exp.id}
                          title="Approve Expense"
                          style={{
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #10B981',
                            color: '#065F46',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={13} color="#10B981" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(exp.id)}
                          disabled={actionLoadingId === exp.id}
                          title="Reject Expense"
                          style={{
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #EF4444',
                            color: '#991B1B',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <XCircle size={13} color="#EF4444" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record New Expense" maxWidth={560}>
        <form onSubmit={handleCreateExpense}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Payer Member *
              </label>
              <select
                value={payerMemberId}
                onChange={(e) => setPayerMemberId(e.target.value)}
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

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Expense Nature *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExpenseType)}
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
                <option value="VARIABLE">Variable (Bazar / Daily Operational)</option>
                <option value="FIXED">Fixed Overhead (Rent / Utility / Salary)</option>
              </select>
            </div>
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
                required
              >
                <option value="Food">Food / Bazar</option>
                <option value="House Rent">House Rent</option>
                <option value="Maid / Cook Salary">Maid / Cook Salary</option>
                <option value="Internet / WiFi">Internet / WiFi</option>
                <option value="Electricity">Electricity Bill</option>
                <option value="Gas / Cylinder">Gas & Cooking Fuel</option>
                <option value="Water & Sewerage">Water & Sewerage</option>
                <option value="Maintenance">Maintenance & Repairs</option>
                <option value="Cleaning Supplies">Cleaning Supplies</option>
                <option value="Other">Other Miscellaneous</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Amount (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1500"
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

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
              Description / Memo *
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly High-speed fiber broadband bill"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                Date Paid *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                Billing Period (YYYY-MM) *
              </label>
              <input
                type="text"
                placeholder="2026-09"
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Receipt Link / Photo URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
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

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Notes / Memo
              </label>
              <input
                type="text"
                placeholder="Optional notes"
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
