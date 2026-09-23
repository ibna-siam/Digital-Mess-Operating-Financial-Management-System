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
import { AppViewSkeleton } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { Expense, ExpenseStatus, ExpenseType, MessMember } from '../types/index.js';

export const ExpensesPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id || '';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<MessMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [category, setCategory] = useState('Maintenance');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [billingPeriod, setBillingPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Action status
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchExpenseData = async () => {
    setIsLoading(true);
    try {
      const [expRes, membersRes] = await Promise.all([
        apiClient<Expense[]>(`/messes/${messId}/expenses`),
        apiClient<MessMember[]>(`/messes/${messId}/members`),
      ]);
      setExpenses(expRes);
      const activeM = membersRes.filter((m) => m.status === 'ACTIVE');
      setMembers(activeM);
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

  if (isLoading && expenses.length === 0) {
    return <AppViewSkeleton title="Expenses Management" />;
  }

  return (
    <div className="page-enter max-w-7xl mx-auto space-y-5 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Expenses Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track variable operational costs, facility maintenance, and approval authorizations.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setIsAddModalOpen(true)}
          className="self-start sm:self-auto touch-spring shadow-xs"
        >
          Add Expense
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Expenses</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 font-mono">
            ৳{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">All recorded items</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Variable Cost</div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1 font-mono">
            ৳{variableAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cook salary & supplies</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Fixed Overheads</div>
          <div className="text-lg sm:text-xl font-black text-amber-700 mt-1 font-mono">
            ৳{fixedAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Maintenance & repairs</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Review</div>
          <div className={`text-lg sm:text-xl font-black mt-1 font-mono ${pendingCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{pendingCount > 0 ? 'Action required' : 'All approved'}</div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {/* Filter Strip & Search Row */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Scrollable Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-spring ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setFilterTab('all')}
            >
              All ({expenses.length})
            </button>
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-spring ${
                filterTab === 'variable'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setFilterTab('variable')}
            >
              Variable
            </button>
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-spring ${
                filterTab === 'fixed'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setFilterTab('fixed')}
            >
              Fixed
            </button>
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-spring ${
                filterTab === 'pending'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setFilterTab('pending')}
            >
              Pending Approval {pendingCount > 0 && `(${pendingCount})`}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <CreditCard size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No Expenses Recorded</p>
            <p className="text-xs text-slate-400 mt-0.5">Add a new expense to track mess cash flow.</p>
          </div>
        ) : (
          <>
            {/* Mobile Expenses Feed (< md) */}
            <div className="block md:hidden p-3 space-y-2.5">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs space-y-2.5 touch-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-800 leading-snug line-clamp-2">
                        {exp.description}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" /> {exp.date}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-medium text-slate-700">{exp.payerName}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-slate-900 font-mono">
                        ৳{exp.amount.toLocaleString()}
                      </div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                        exp.type === 'VARIABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {exp.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="info">{exp.category}</Badge>
                      <Badge
                        variant={
                          exp.status === 'APPROVED'
                            ? 'success'
                            : exp.status === 'PENDING_APPROVAL'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {exp.status === 'PENDING_APPROVAL' ? 'Pending' : exp.status}
                      </Badge>
                    </div>

                    {exp.status === 'PENDING_APPROVAL' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApprove(exp.id)}
                          disabled={actionLoadingId === exp.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition-colors touch-spring"
                        >
                          <CheckCircle2 size={12} className="text-emerald-600" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(exp.id)}
                          disabled={actionLoadingId === exp.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-colors touch-spring"
                        >
                          <XCircle size={12} className="text-rose-600" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
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
            </div>
          </>
        )}
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record New Expense" maxWidth={560}>
        {/* Single Source-of-Truth Guidance Banner */}
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            fontSize: '0.8rem',
            color: '#166534',
            lineHeight: 1.4,
          }}
        >
          <strong>💡 Source of Truth Note:</strong> Use Expenses strictly for one-time/miscellaneous overhead (repairs, cleaning supplies, tools, furniture). For recurring bills (House Rent, Wi-Fi, Maid/Cook Salary) and utilities (Electricity, Gas, Water), please use <strong>Bills & Utilities</strong>. For groceries, use <strong>Bazar</strong>.
        </div>

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
                <option value="VARIABLE">One-Time Operational Expense</option>
                <option value="FIXED">Recurring Non-Bill Overhead</option>
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
                <option value="Maintenance">Maintenance & Repairs</option>
                <option value="Cleaning Supplies">Cleaning Supplies</option>
                <option value="Equipment">Equipment & Tools</option>
                <option value="Furniture">Furniture & Fixtures</option>
                <option value="Emergency Expense">Emergency Expense</option>
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
