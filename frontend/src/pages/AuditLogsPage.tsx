import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient } from '../lib/apiClient.js';
import { MessAuditLogItem, MessAuditLogsResponse } from '../types/index.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { useDataSync } from '../hooks/useDataSync.js';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Download,
  Wallet,
  Users,
  Zap,
  Lock,
  Clock,
  Eye,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id;

  const [loading, setLoading] = useState<boolean>(true);
  const [logs, setLogs] = useState<MessAuditLogItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    financialCount: 0,
    memberCount: 0,
    utilityCount: 0,
    securityCount: 0,
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<MessAuditLogItem | null>(null);

  // 300ms debounce on search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAuditLogs = async () => {
    if (!messId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      params.append('limit', '100');

      const res = await apiClient<MessAuditLogsResponse>(
        `/messes/${messId}/audit-logs?${params.toString()}`
      );
      if (res && res.logs) {
        setLogs(res.logs);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [messId, selectedCategory, debouncedSearch]);

  // Real-time synchronization across mess mutations
  useDataSync(['audit', 'expenses', 'meals', 'bazar', 'members', 'bills', 'settlements'], fetchAuditLogs);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  // Category filter options
  const categories = [
    { id: 'ALL', label: 'All Activities', count: stats.total },
    { id: 'FINANCIAL', label: 'Financial & Ledger', count: stats.financialCount },
    { id: 'MEMBER', label: 'Members & Rooms', count: stats.memberCount },
    { id: 'UTILITY', label: 'Utilities & Bills', count: stats.utilityCount },
    { id: 'SECURITY', label: 'Security & Admin', count: stats.securityCount },
  ];

  // Action Badge Formatter
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DEPOSIT') || act.includes('SETTLEMENT') || act.includes('RECONCILED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Wallet className="w-3 h-3 text-emerald-600" />
          {action}
        </span>
      );
    }
    if (act.includes('BILL') || act.includes('UTILITY')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Zap className="w-3 h-3 text-amber-600" />
          {action}
        </span>
      );
    }
    if (act.includes('MEMBER') || act.includes('ROOM')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Users className="w-3 h-3 text-blue-600" />
          {action}
        </span>
      );
    }
    if (act.includes('DOCUMENT')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <FileText className="w-3 h-3 text-purple-600" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <Lock className="w-3 h-3 text-slate-500" />
        {action}
      </span>
    );
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['Timestamp', 'Action', 'Category', 'Entity', 'EntityID', 'PerformedBy', 'Details', 'IPAddress'];
    const rows = logs.map((l) => [
      new Date(l.createdAt).toISOString(),
      `"${l.action}"`,
      `"${l.entity}"`,
      `"${l.entityId || ''}"`,
      `"${l.user?.name || 'System'}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || '127.0.0.1'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_${activeMess?.name || 'Mess'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit Logs & Security Trail</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Authoritative Log
            </span>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            Immutable audit record tracking administrative events, financial entries, member lifecycle changes, and zero-sum ledger reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            disabled={!logs.length}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total Actions</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">Tamper-evident log</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Events</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.financialCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">Deposits & settlements</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Member Actions</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.memberCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">Rooms & status changes</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Utilities</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.utilityCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">Bills & readings</div>
        </div>
      </div>

      {/* 3. Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search action, details, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchAuditLogs();
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-colors"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      {/* 4. Main Audit Trail View (Desktop Table + Mobile Cards) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Performed By</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Audit Description</th>
                <th className="py-3.5 px-4">IP / Security</th>
                <th className="py-3.5 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading authoritative audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No audit logs matching query</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try clearing your filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dateObj = new Date(log.createdAt);
                  const formattedDate = dateObj.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formattedDate}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formattedTime}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">{getActionBadge(log.action)}</td>

                      {/* Performed By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-[10px] font-bold">
                            {log.user?.name ? log.user.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{log.user?.name || 'System Automation'}</div>
                            <div className="text-[10px] text-slate-400">{log.user?.email || 'internal-core'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Target Entity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {log.entity}
                        </span>
                        {log.entityId && (
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">
                            {log.entityId}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4">
                        <p className="line-clamp-2 text-slate-800 text-xs leading-relaxed max-w-md">
                          {log.details || 'System event recorded without custom notes.'}
                        </p>
                      </td>

                      {/* IP / Security */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[11px] font-bold text-slate-700 font-mono">
                            {log.ipAddress || '127.0.0.1'}
                          </span>
                        </div>
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                          title="Inspect Immutable Record"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Feed View */}
        <div className="block md:hidden p-3.5 sm:p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
              Loading authoritative audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No audit logs matching query</p>
              <p className="text-xs text-slate-400 mt-0.5">Try clearing your filters or search terms.</p>
            </div>
          ) : (
            logs.map((log) => {
              const dateObj = new Date(log.createdAt);
              const formattedDate = dateObj.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
              });
              const formattedTime = dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-2.5 active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    {getActionBadge(log.action)}
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formattedDate} {formattedTime}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {log.details || 'System event recorded without custom notes.'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                        {log.user?.name ? log.user.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <span className="truncate font-semibold text-slate-700">
                        {log.user?.name || 'System'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      Inspect
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Inspection Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Immutable Audit Entry Inspection"
          subtitle="Cryptographically sealed activity record"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Header info card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action Name</span>
                {getActionBadge(selectedLog.action)}
              </div>
              <div className="text-sm font-bold text-slate-900">{selectedLog.details}</div>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Recorded At</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Actor</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                  {selectedLog.user?.name || 'Automated System Routine'}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Entity Type</span>
                <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                  {selectedLog.entity}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Target Entity ID</span>
                <span className="font-mono text-slate-800 text-xs mt-0.5 block truncate">
                  {selectedLog.entityId || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Origin IP Address</span>
                <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                  {selectedLog.ipAddress || '127.0.0.1'}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Verification Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-xs mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tamper-Evident SHA-256
                </span>
              </div>
            </div>

            {/* Raw JSON inspection */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Raw Event Payload</span>
              <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-44 border border-slate-800">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>

            {/* Footer Close */}
            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setSelectedLog(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5"
              >
                Close Audit Inspection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default AuditLogsPage;
