import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Printer,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { MemberStatement, FinancialPeriod } from '../types/index.js';

export const MemberStatementPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { activeMess } = useAuth();
  const messId = activeMess?.id || '';

  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [statement, setStatement] = useState<MemberStatement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const list = await apiClient<FinancialPeriod[]>(`/messes/${messId}/financial-periods`).catch(() => []);
        setPeriods(list);
      } catch {
        // Fallback
      }
    };
    fetchPeriods();
  }, [messId]);

  useEffect(() => {
    if (!memberId) return;
    const fetchStatement = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await apiClient<MemberStatement>(
          `/messes/${messId}/reports/members/${memberId}/statement?periodKey=${selectedPeriodKey}`
        );
        setStatement(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load member statement.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatement();
  }, [messId, memberId, selectedPeriodKey]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = async () => {
    if (!memberId) return;
    try {
      const token = localStorage.getItem('messmate_token');
      const url = `/api/v1/messes/${messId}/reports/export?type=statement&periodKey=${selectedPeriodKey}&memberId=${memberId}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `statement_${memberId}_${selectedPeriodKey}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading member statement..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 60 }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-statement-container, .printable-statement-container * {
            visibility: visible;
          }
          .printable-statement-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Action Header */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '16px 20px',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
        }}
      >
        <Button
          variant="secondary"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate(-1)}
          className="text-xs py-2 px-3"
        >
          Back
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="#64748b" />
            <select
              value={selectedPeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {periods.length > 0 ? (
                periods.map((p) => (
                  <option key={p.periodKey} value={p.periodKey}>
                    {p.periodKey} ({p.status})
                  </option>
                ))
              ) : (
                <option value={selectedPeriodKey}>{selectedPeriodKey}</option>
              )}
            </select>
          </div>

          <Button
            variant="secondary"
            icon={<Printer size={16} />}
            onClick={handlePrint}
            className="text-xs py-2 px-3"
          >
            Print Statement
          </Button>

          <Button
            variant="primary"
            icon={<Download size={16} />}
            onClick={handleExportCsv}
            className="text-xs py-2 px-3"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {errorMsg ? (
        <div style={{ backgroundColor: '#fef2f2', padding: 20, borderRadius: 12, color: '#dc2626' }}>
          {errorMsg}
        </div>
      ) : statement ? (
        <div className="printable-statement-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {activeMess?.name || 'MessMate'} Financial Statement
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0' }}>
                {statement.memberName}
              </h1>
              <div style={{ fontSize: 13, color: '#475569' }}>
                Room: {statement.roomNo} | Role: {statement.role} | Period: {statement.periodKey}
              </div>
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                textAlign: 'right',
                backgroundColor:
                  statement.statusBadge.status === 'OWES'
                    ? '#fef2f2'
                    : statement.statusBadge.status === 'RECEIVES'
                    ? '#f0fdf4'
                    : '#f8fafc',
                border: `1px solid ${
                  statement.statusBadge.status === 'OWES'
                    ? '#fecaca'
                    : statement.statusBadge.status === 'RECEIVES'
                    ? '#bbf7d0'
                    : '#e2e8f0'
                }`,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Net Settlement Status
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color:
                    statement.statusBadge.status === 'OWES'
                      ? '#dc2626'
                      : statement.statusBadge.status === 'RECEIVES'
                      ? '#16a34a'
                      : '#475569',
                  marginTop: 2,
                }}
              >
                {statement.statusBadge.label}
              </div>
            </div>
          </div>

          {/* Breakdown KPI cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Opening Balance</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                ৳{statement.summary.openingBalance.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Food Cost ({statement.summary.totalMeals.toFixed(1)} meals)
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                ৳{statement.summary.foodShare.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Fixed & Utilities</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                ৳{(statement.summary.rentShare + statement.summary.utilityShare).toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Total Obligations</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                ৳{statement.summary.totalObligations.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Total Contributions</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                ৳{statement.summary.totalContributions.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0' }}>
              Transaction Ledger
            </h3>

            {statement.transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: 13 }}>
                No financial transactions recorded for this period.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '10px 12px' }}>Date</th>
                    <th style={{ padding: '10px 12px' }}>Description</th>
                    <th style={{ padding: '10px 12px' }}>Reference</th>
                    <th style={{ padding: '10px 12px' }}>Type</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Debit</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Credit</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{tx.date}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1e293b' }}>
                        {tx.description}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{tx.reference}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant="neutral">{tx.entryType}</Badge>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                        {tx.debit !== null ? `৳${tx.debit.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                        {tx.credit !== null ? `৳${tx.credit.toFixed(2)}` : '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: tx.runningBalance >= 0 ? '#16a34a' : '#dc2626',
                        }}
                      >
                        ৳{tx.runningBalance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
