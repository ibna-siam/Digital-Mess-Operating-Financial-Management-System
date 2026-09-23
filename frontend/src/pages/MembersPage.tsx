import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  DoorOpen,
  UserX,
  AlertCircle,
  Mail,
  CheckCircle2,
  Users,
  Eye,
  FileText,
  UserPlus,
  Clock,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { EmptyState, AppViewSkeleton } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { Room, AppRole } from '../types/index.js';
import { MemberListItem, InvitationItem, MemberPagination } from '../types/memberLifecycle.js';

export const MembersPage: React.FC = () => {
  const { activeMess } = useAuth();
  const navigate = useNavigate();
  const messId = activeMess?.id || '';
  const isManager = activeMess?.myRole === 'MANAGER' || activeMess?.myRole === 'OWNER';

  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pagination, setPagination] = useState<MemberPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'DEFICIT' | 'SURPLUS' | 'SETTLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAddDirectModalOpen, setIsAddDirectModalOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [memberToArchive, setMemberToArchive] = useState<MemberListItem | null>(null);

  // Direct Add Form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<AppRole>('MEMBER');
  const [formRoomId, setFormRoomId] = useState('');
  const [formJoinDate, setFormJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Invitation Modal Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('MEMBER');
  const [inviteRoomId, setInviteRoomId] = useState('');
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Room Form
  const [roomNumber, setRoomNumber] = useState('');
  const [roomFloor, setRoomFloor] = useState('1st');
  const [roomCapacity, setRoomCapacity] = useState(2);
  const [roomRent, setRoomRent] = useState(10000);

  // Toast Notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      if (activeStatusTab !== 'ALL') params.append('status', activeStatusTab);
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (selectedRoomId !== 'ALL') params.append('roomId', selectedRoomId);
      if (balanceFilter !== 'ALL') params.append('balanceFilter', balanceFilter);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const [membersResponse, roomsData] = await Promise.all([
        apiClient<any>(`/messes/${messId}/members?${params.toString()}`),
        apiClient<Room[]>(`/messes/${messId}/members/rooms`).catch(() => []),
      ]);

      if (membersResponse && Array.isArray(membersResponse.members)) {
        setMembers(membersResponse.members);
        if (membersResponse.pagination) {
          setPagination(membersResponse.pagination);
        }
      } else if (Array.isArray(membersResponse)) {
        setMembers(
          membersResponse.map((m: any) => ({
            ...m,
            netBalance: m.balance || 0,
            balanceStatus: (m.balance || 0) < 0 ? 'DEFICIT' : (m.balance || 0) > 0 ? 'SURPLUS' : 'SETTLED',
          }))
        );
      } else {
        setMembers([]);
      }

      setRooms(roomsData || []);
    } catch (err: unknown) {
      console.error('Failed to load member directory:', err);
      setError(err instanceof Error ? err.message : 'Unable to connect to mess members service. Please check your session.');
    } finally {
      setIsLoading(false);
    }
  }, [messId, activeStatusTab, selectedRole, selectedRoomId, balanceFilter, debouncedSearch, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useDataSync(['members'], fetchMembers);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers();
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsInviting(true);
      const res = await apiClient<InvitationItem>(`/messes/${messId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole,
          roomId: inviteRoomId || undefined,
        }),
      });

      const fullUrl = `${window.location.origin}/invite/${res.token}`;
      setCreatedInviteUrl(fullUrl);
      showNotification('success', 'Invitation link generated successfully');
      fetchMembers();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to generate invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAddDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      await apiClient(`/messes/${messId}/members/invite`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          phone: formPhone || undefined,
          role: formRole,
          roomId: formRoomId || undefined,
          joinDate: formJoinDate,
        }),
      });
      setIsAddDirectModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      showNotification('success', 'Member added successfully');
      fetchMembers();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient(`/messes/${messId}/members/rooms`, {
        method: 'POST',
        body: JSON.stringify({
          roomNumber,
          floor: roomFloor,
          capacity: Number(roomCapacity),
          monthlyRent: Number(roomRent),
        }),
      });
      setIsAddRoomModalOpen(false);
      setRoomNumber('');
      showNotification('success', 'Room added to mess');
      fetchMembers();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to create room');
    }
  };

  const handleArchive = async () => {
    if (!memberToArchive) return;
    try {
      await apiClient(`/messes/${messId}/members/${memberToArchive.id}/archive`, {
        method: 'POST',
      });
      setMemberToArchive(null);
      showNotification('success', 'Member archived. Historical records fully preserved.');
      fetchMembers();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to archive member');
    }
  };

  // Metric aggregates
  const totalCount = pagination.total || members.length;
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const onLeaveCount = members.filter((m) => m.status === 'ON_LEAVE' || m.status === 'LEAVING_REQUESTED').length;
  const owingCount = members.filter((m) => (m.netBalance || 0) < 0).length;

  if (isLoading && members.length === 0) {
    return <AppViewSkeleton title="Member & Living Directory" />;
  }

  return (
    <div className="page-enter max-w-7xl mx-auto space-y-5 p-2 sm:p-4">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-2xl text-xs font-semibold shadow-md ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* A. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users size={24} className="text-emerald-600" />
            Member & Living Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage lifecycle, invitations, room capacities, meal eligibility, and member profiles.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setIsAddRoomModalOpen(true)} className="text-xs py-1.5 px-3 rounded-xl touch-spring">
            <DoorOpen size={14} /> Add Room
          </Button>

          <Button variant="secondary" onClick={() => setIsAddDirectModalOpen(true)} className="text-xs py-1.5 px-3 rounded-xl touch-spring">
            <UserPlus size={14} /> Direct Add
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setCreatedInviteUrl(null);
              setInviteEmail('');
              setInviteName('');
              setIsInviteModalOpen(true);
            }}
            className="text-xs py-1.5 px-3 rounded-xl touch-spring shadow-xs"
          >
            <Mail size={14} /> Invite Link
          </Button>
        </div>
      </div>

      {/* B. Summary Section: KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Directory</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <Users size={14} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">{totalCount}</div>
          <div className="text-[11px] text-slate-500">All registered residents</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Active</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono">{activeCount}</div>
          <div className="text-[11px] text-emerald-600/80">Participating in meals/rent</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">On Leave</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-700 font-mono">{onLeaveCount}</div>
          <div className="text-[11px] text-amber-600/80">Exempt from active meals</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Owing Balance</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <Wallet size={14} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700 font-mono">{owingCount}</div>
          <div className="text-[11px] text-rose-600/80">Residents with deficit</div>
        </div>
      </div>

      {/* C. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-3.5 sm:p-4 space-y-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-100">
          {(
            [
              { id: 'ALL', label: 'All Members' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'ON_LEAVE', label: 'On Leave' },
              { id: 'LEAVING_REQUESTED', label: 'Leaving Requested' },
              { id: 'INACTIVE', label: 'Inactive' },
              { id: 'ARCHIVED', label: 'Archived' },
            ] as const
          ).map((tab) => {
            const isActive = activeStatusTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveStatusTab(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-spring ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Select Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, room, email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </form>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
          >
            <option value="ALL">All Roles</option>
            <option value="MANAGER">MANAGER</option>
            <option value="MEMBER">MEMBER</option>
          </select>

          {/* Room Filter */}
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
          >
            <option value="ALL">All Rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.roomNumber} ({r.currentMembers || 0}/{r.capacity})
              </option>
            ))}
          </select>

          {/* Balance Filter */}
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value as any)}
            className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
          >
            <option value="ALL">All Balances</option>
            <option value="DEFICIT">Owes Money (Deficit)</option>
            <option value="SURPLUS">Receives Refund (Surplus)</option>
            <option value="SETTLED">Balanced (0.00)</option>
          </select>
        </div>
      </div>

      {/* D. Member List Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {error ? (
          <div className="p-10 text-center bg-rose-50/50">
            <AlertCircle size={36} className="text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-rose-800">Failed to Load Members</h3>
            <p className="text-xs text-rose-600 mt-1 max-w-md mx-auto mb-4">{error}</p>
            <Button variant="secondary" onClick={() => fetchMembers()} className="text-xs py-1 px-3">
              <RefreshCw size={13} /> Retry Loading
            </Button>
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            title="No Members Found"
            description="No members match your current filters or directory is empty. Try resetting search criteria or inviting members."
          />
        ) : (
          <>
            {/* Mobile View: Dedicated Member Cards (< md) */}
            <div className="block md:hidden p-3 space-y-2.5">
              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => navigate(`/members/${member.id}`)}
                  className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs space-y-3 cursor-pointer touch-card"
                >
                  {/* Top Row: Avatar, Name, Email, Balance */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-100">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">
                          {member.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {member.email}
                        </div>
                      </div>
                    </div>

                    {/* Net Balance Pill */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-black font-mono ${
                          (member.netBalance || 0) > 0
                            ? 'text-emerald-600'
                            : (member.netBalance || 0) < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {(member.netBalance || 0) > 0
                          ? `+৳${(member.netBalance || 0).toFixed(0)}`
                          : (member.netBalance || 0) < 0
                          ? `-৳${Math.abs(member.netBalance || 0).toFixed(0)}`
                          : '৳0'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {(member.netBalance || 0) < 0 ? 'OWES' : (member.netBalance || 0) > 0 ? 'REFUND' : 'SETTLED'}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Room, Role, Status Badges & Quick Action */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="primary">{member.role}</Badge>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {member.roomNo ? `Room ${member.roomNo}` : 'No Room'}
                      </span>
                      <Badge
                        variant={
                          member.status === 'ACTIVE'
                            ? 'success'
                            : member.status === 'ON_LEAVE'
                            ? 'warning'
                            : member.status === 'ARCHIVED'
                            ? 'neutral'
                            : 'danger'
                        }
                      >
                        {member.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/members/${member.id}/statement`)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors touch-spring"
                        title="Financial Statement"
                      >
                        <FileText size={14} />
                      </button>
                      {member.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => setMemberToArchive(member)}
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors touch-spring"
                          title="Archive Member"
                        >
                          <UserX size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

        {/* Desktop View: Full Data Table (hidden on mobile) */}
        <div className="hidden md:block" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Room</th>
                  <th>Status</th>
                  <th>Join Date</th>
                  <th>Net Balance</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => navigate(`/members/${member.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0,
                          }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            {member.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <Badge variant="primary">{member.role}</Badge>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        {member.roomNo ? `Room ${member.roomNo}` : 'Unassigned'}
                      </span>
                    </td>

                    <td>
                      <Badge
                        variant={
                          member.status === 'ACTIVE'
                            ? 'success'
                            : member.status === 'ON_LEAVE'
                            ? 'warning'
                            : member.status === 'ARCHIVED'
                            ? 'neutral'
                            : member.status === 'LEAVING_REQUESTED'
                            ? 'danger'
                            : 'primary'
                        }
                      >
                        {member.status}
                      </Badge>
                    </td>

                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {member.joinDate || 'Active'}
                    </td>

                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color:
                            (member.netBalance || 0) > 0
                              ? 'var(--color-success)'
                              : (member.netBalance || 0) < 0
                              ? 'var(--color-danger)'
                              : 'var(--text-muted)',
                        }}
                      >
                        {(member.netBalance || 0) > 0
                          ? `+৳${(member.netBalance || 0).toFixed(2)}`
                          : (member.netBalance || 0) < 0
                          ? `-৳${Math.abs(member.netBalance || 0).toFixed(2)}`
                          : '৳0.00'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => navigate(`/members/${member.id}`)}
                          className="header-icon-btn"
                          style={{ width: 30, height: 30 }}
                          title="View Profile"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/members/${member.id}/statement`)}
                          className="header-icon-btn"
                          style={{ width: 30, height: 30 }}
                          title="Financial Statement"
                        >
                          <FileText size={15} />
                        </button>
                        {member.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => setMemberToArchive(member)}
                            className="header-icon-btn"
                            style={{ width: 30, height: 30, color: 'var(--color-danger)' }}
                            title="Archive Member"
                          >
                            <UserX size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>

      {/* MODAL 1: Invite Member Link */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Generate Expiring Invitation Link"
      >
        {createdInviteUrl ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#ecfdf5',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <h4 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
              Single-Use Link Ready!
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 16 }}>
              Valid for 7 days. Send this link to your new mess member to onboard them.
            </p>

            <div
              style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: 'var(--color-primary-dark)',
                wordBreak: 'break-all',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span>{createdInviteUrl}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(createdInviteUrl);
                  showNotification('success', 'Copied to clipboard');
                }}
              >
                Copy
              </Button>
            </div>

            <Button variant="primary" onClick={() => setIsInviteModalOpen(false)} style={{ width: '100%' }}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateInvitation} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="new.member@example.com"
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Full Name (Optional)
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Shakil Hossain"
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                  Role in Mess
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  <option value="MEMBER">MEMBER</option>
                  {isManager && <option value="MANAGER">MANAGER</option>}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                  Initial Room
                </label>
                <select
                  value={inviteRoomId}
                  onChange={(e) => setInviteRoomId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Unassigned</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} ({r.currentMembers || 0}/{r.capacity})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button variant="secondary" type="button" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isInviting}>
                {isInviting ? 'Generating...' : 'Generate Invite Link'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 2: Direct Add Member */}
      <Modal isOpen={isAddDirectModalOpen} onClose={() => setIsAddDirectModalOpen(false)} title="Direct Add Member">
        <form onSubmit={handleAddDirect} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Full Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="e.g. Siam Ahmed"
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                placeholder="siam@example.com"
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+880 1XXXXXXXXX"
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Role in Mess
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                <option value="MEMBER">MEMBER</option>
                {isManager && <option value="MANAGER">MANAGER</option>}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Assigned Room
              </label>
              <select
                value={formRoomId}
                onChange={(e) => setFormRoomId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                <option value="">Unassigned</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} ({r.currentMembers || 0}/{r.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Joining Date
              </label>
              <input
                type="date"
                value={formJoinDate}
                onChange={(e) => setFormJoinDate(e.target.value)}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddDirectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Add Room */}
      <Modal isOpen={isAddRoomModalOpen} onClose={() => setIsAddRoomModalOpen(false)} title="Create Room / Unit">
        <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Room Number
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
                placeholder="e.g. 401"
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Floor
              </label>
              <input
                type="text"
                value={roomFloor}
                onChange={(e) => setRoomFloor(e.target.value)}
                placeholder="e.g. 4th"
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Capacity (Beds)
              </label>
              <input
                type="number"
                min="1"
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(Number(e.target.value))}
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                Monthly Rent (BDT)
              </label>
              <input
                type="number"
                value={roomRent}
                onChange={(e) => setRoomRent(Number(e.target.value))}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddRoomModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Archive Confirmation */}
      <Modal isOpen={!!memberToArchive} onClose={() => setMemberToArchive(null)} title="Confirm Member Archive">
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Are you sure you want to archive <strong>{memberToArchive?.name}</strong>?
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Archiving sets member status to ARCHIVED and releases their bed capacity. All ledger entries,
            transaction history, and closing statements will remain immutable and fully preserved.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" onClick={() => setMemberToArchive(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleArchive}>
              Confirm Archive
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
