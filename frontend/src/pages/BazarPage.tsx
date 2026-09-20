import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  FileText,
  Calendar,
  Eye,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { PageLoader, Skeleton } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { BazarEntry, BazarItem, MessMember } from '../types/index.js';

export const BazarPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id || 'c3a66302-28a7-48a9-bb71-f500b36e6ea0';

  const [bazarList, setBazarList] = useState<BazarEntry[]>(() => {
    try {
      const cached = sessionStorage.getItem(`messmate_bazar_${messId}`);
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
      return !sessionStorage.getItem(`messmate_bazar_${messId}`);
    } catch {
      return true;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Add Bazar Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [buyerMemberId, setBuyerMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Groceries');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [items, setItems] = useState<Array<{ name: string; quantity: string; unit: string; unitPrice: string; totalAmount: string }>>([
    { name: '', quantity: '', unit: 'kg', unitPrice: '', totalAmount: '' },
  ]);

  // Details Modal State
  const [selectedEntry, setSelectedEntry] = useState<BazarEntry | null>(null);

  const fetchBazarData = async () => {
    try {
      const [bazarRes, membersRes] = await Promise.all([
        apiClient<BazarEntry[]>(`/messes/${messId}/bazar`),
        apiClient<MessMember[]>(`/messes/${messId}/members`),
      ]);
      setBazarList(bazarRes);
      const activeM = membersRes.filter((m) => m.status === 'ACTIVE');
      setMembers(activeM);
      try {
        sessionStorage.setItem(`messmate_bazar_${messId}`, JSON.stringify(bazarRes));
        sessionStorage.setItem(`messmate_members_${messId}`, JSON.stringify(activeM));
      } catch {
        //
      }
      if (membersRes.length > 0 && !buyerMemberId) {
        setBuyerMemberId(membersRes[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch bazar data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBazarData();
  }, [messId]);

  useDataSync(['bazar'], fetchBazarData);

  const handleAddItemRow = () => {
    setItems([...items, { name: '', quantity: '', unit: 'kg', unitPrice: '', totalAmount: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated.length > 0 ? updated : [{ name: '', quantity: '', unit: 'kg', unitPrice: '', totalAmount: '' }]);
  };

  const handleItemChange = (index: number, field: string, val: string) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;

    // Recalculate item total if qty and price exist
    if (field === 'quantity' || field === 'unitPrice') {
      const q = parseFloat(field === 'quantity' ? val : updated[index].quantity) || 0;
      const p = parseFloat(field === 'unitPrice' ? val : updated[index].unitPrice) || 0;
      if (q > 0 && p > 0) {
        updated[index].totalAmount = (q * p).toFixed(2);
      }
    }

    setItems(updated);

    // Auto-update overall amount if all non-empty rows have amounts
    const validSum = updated.reduce((sum, it) => sum + (parseFloat(it.totalAmount) || 0), 0);
    if (validSum > 0) {
      setAmount(validSum.toFixed(2));
    }
  };

  const handleCreateBazar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Please enter a valid total amount.');
      return;
    }

    if (!buyerMemberId) {
      setFormError('Please select the buyer who paid for this bazar.');
      return;
    }

    // Filter filled item rows
    const validItems: BazarItem[] = items
      .filter((i) => i.name.trim().length > 0)
      .map((i) => ({
        name: i.name.trim(),
        quantity: parseFloat(i.quantity) || null,
        unit: i.unit.trim() || null,
        unitPrice: parseFloat(i.unitPrice) || null,
        totalAmount: parseFloat(i.totalAmount) || (parseFloat(i.quantity) || 1) * (parseFloat(i.unitPrice) || 0),
      }));

    try {
      setIsSubmitting(true);
      await apiClient(`/messes/${messId}/bazar`, {
        method: 'POST',
        body: JSON.stringify({
          buyerMemberId,
          amount: parsedAmount,
          date,
          category,
          paymentMethod,
          description: description.trim() || `${category} Bazar Purchase`,
          notes: notes.trim() || undefined,
          receiptUrl: receiptUrl.trim() || undefined,
          items: validItems.length > 0 ? validItems : undefined,
        }),
      });

      // Reset & Refresh
      setIsAddModalOpen(false);
      setAmount('');
      setDescription('');
      setNotes('');
      setReceiptUrl('');
      setItems([{ name: '', quantity: '', unit: 'kg', unitPrice: '', totalAmount: '' }]);
      await fetchBazarData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record bazar. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPIs
  const totalSpent = bazarList.reduce((sum, b) => sum + b.amount, 0);
  const totalTrips = bazarList.length;
  const avgTrip = totalTrips > 0 ? totalSpent / totalTrips : 0;

  // Find top buyer
  const buyerTotals: Record<string, { name: string; total: number }> = {};
  bazarList.forEach((b) => {
    if (!buyerTotals[b.buyerName]) {
      buyerTotals[b.buyerName] = { name: b.buyerName, total: 0 };
    }
    buyerTotals[b.buyerName].total += b.amount;
  });
  const topBuyer = Object.values(buyerTotals).sort((a, b) => b.total - a.total)[0] || { name: 'None', total: 0 };

  // Filtered entries
  const filteredEntries = bazarList.filter((entry) => {
    const matchesCategory = selectedCategory === 'ALL' || entry.category.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      entry.description.toLowerCase().includes(query) ||
      entry.buyerName.toLowerCase().includes(query) ||
      entry.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Bazar Records
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track daily grocery purchases, itemized receipts, and buyer accountability.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
          Record Bazar
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Bazar Expense</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: 4 }}>
            {isLoading ? <Skeleton width="65%" height={28} /> : `৳ ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>Across all members</div>
        </div>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Purchases</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
            {isLoading ? <Skeleton width="50%" height={28} /> : `${totalTrips} Trips`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 4 }}>Active month</div>
        </div>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Top Bazar Buyer</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0EA5E9', marginTop: 4 }}>
            {isLoading ? <Skeleton width="70%" height={24} /> : topBuyer.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
            {isLoading ? <Skeleton width="55%" height={14} /> : `৳ ${topBuyer.total.toLocaleString()} spent`}
          </div>
        </div>
        <div className="kpi-card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Average per Bazar</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
            {isLoading ? <Skeleton width="65%" height={28} /> : `৳ ${avgTrip.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>Per grocery run</div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="table-container">
        <div className="table-header-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
          {/* Category Tabs */}
          <div className="table-tabs">
            {['ALL', 'Groceries', 'Vegetables', 'Fish & Meat', 'Spices'].map((cat) => (
              <button
                key={cat}
                className={`table-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', minWidth: 240 }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
              />
              <input
                type="text"
                placeholder="Search buyer, items..."
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
            <PageLoader message="Loading bazar records..." />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShoppingCart size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>No Bazar Entries Found</p>
            <p style={{ fontSize: '0.82rem' }}>Record a new grocery purchase to track it here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Buyer</th>
                <th>Method</th>
                <th>Items</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((bazar) => (
                <tr key={bazar.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} color="#94A3B8" />
                      {bazar.date}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{bazar.description}</div>
                    {bazar.notes && <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{bazar.notes}</div>}
                  </td>
                  <td>
                    <Badge
                      variant={
                        bazar.category === 'Fish & Meat'
                          ? 'danger'
                          : bazar.category === 'Vegetables'
                          ? 'success'
                          : bazar.category === 'Groceries'
                          ? 'info'
                          : 'neutral'
                      }
                    >
                      {bazar.category}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          backgroundColor: '#E2E8F0',
                          color: '#334155',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {bazar.buyerName.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{bazar.buyerName}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                      }}
                    >
                      {bazar.paymentMethod}
                    </span>
                  </td>
                  <td>
                    {bazar.items && bazar.items.length > 0 ? (
                      <span
                        style={{
                          cursor: 'pointer',
                          color: 'var(--color-primary-dark)',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                        }}
                        onClick={() => setSelectedEntry(bazar)}
                      >
                        {bazar.items.length} item{bazar.items.length > 1 ? 's' : ''} • View
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Summary only</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    ৳ {bazar.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedEntry(bazar)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        padding: '5px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Eye size={12} /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Bazar Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record Bazar Purchase" maxWidth={680}>
        <form onSubmit={handleCreateBazar}>
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
                Buyer (Who Paid?) *
              </label>
              <select
                value={buyerMemberId}
                onChange={(e) => setBuyerMemberId(e.target.value)}
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
                Purchase Date *
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Total Amount (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 2500"
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

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Category
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
                <option value="Groceries">Groceries</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Fish & Meat">Fish & Meat</option>
                <option value="Spices">Spices</option>
                <option value="Cooking Gas">Cooking Gas</option>
                <option value="Cleaning">Cleaning & Toiletries</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Payment Method
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
                <option value="CASH">Cash</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="BANK">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
              Description / Memo *
            </label>
            <input
              type="text"
              placeholder="e.g. Weekly Bazar from Karwan Bazar (Chicken, Rice, Oil)"
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

          {/* Itemized Breakdown Section */}
          <div
            style={{
              marginTop: 18,
              marginBottom: 16,
              padding: 14,
              backgroundColor: '#F8FAFC',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B' }}>
                Itemized Breakdown (Optional)
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary-dark)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={14} /> Add Item Row
              </button>
            </div>

            {items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                  gap: 8,
                  marginBottom: 8,
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder="Item (e.g. Rice)"
                  value={it.name}
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8rem',
                    backgroundColor: '#fff',
                  }}
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Qty"
                  value={it.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8rem',
                    backgroundColor: '#fff',
                  }}
                />
                <input
                  type="text"
                  placeholder="Unit (kg/L)"
                  value={it.unit}
                  onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8rem',
                    backgroundColor: '#fff',
                  }}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Rate"
                  value={it.unitPrice}
                  onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8rem',
                    backgroundColor: '#fff',
                  }}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Total"
                  value={it.totalAmount}
                  onChange={(e) => handleItemChange(idx, 'totalAmount', e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: '#fff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItemRow(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                Receipt Link / Photo URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/receipt.jpg"
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
                Internal Notes
              </label>
              <input
                type="text"
                placeholder="Extra comments or memo"
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
              {isSubmitting ? 'Recording...' : 'Save Bazar Purchase'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Bazar Details Modal */}
      {selectedEntry && (
        <Modal
          isOpen={Boolean(selectedEntry)}
          onClose={() => setSelectedEntry(null)}
          title="Bazar Purchase Details"
          maxWidth={580}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 16,
                borderBottom: '1px solid var(--color-border)',
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Expense
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                  ৳ {selectedEntry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <Badge variant="success">{selectedEntry.paymentMethod}</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18, fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Buyer:</span>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{selectedEntry.buyerName}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{selectedEntry.date}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{selectedEntry.category}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Memo / Description:</span>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{selectedEntry.description}</div>
              </div>
            </div>

            {selectedEntry.items && selectedEntry.items.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
                  Itemized Goods
                </h4>
                <div
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748B' }}>Item</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B' }}>Quantity</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B' }}>Rate</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntry.items.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B' }}>
                            {it.quantity ? `${it.quantity} ${it.unit || ''}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B' }}>
                            {it.unitPrice ? `৳ ${it.unitPrice}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                            ৳ {it.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedEntry.receiptUrl && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Receipt Attachment:
                </span>
                <a
                  href={selectedEntry.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-primary-dark)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                  }}
                >
                  <FileText size={15} /> Open Attached Receipt
                </a>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Button onClick={() => setSelectedEntry(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
