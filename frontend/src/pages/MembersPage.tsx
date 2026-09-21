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
import { PageLoader, EmptyState } from '../components/ui/StateComponents.js';
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Toast Feedback */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.85rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* A. Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={26} style={{ color: 'var(--color-primary)' }} />
            Member & Living Directory
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Manage lifecycle, invitations, room capacities, meal eligibility, and member profiles.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setIsAddRoomModalOpen(true)}>
            <DoorOpen size={16} /> Add Room
          </Button>

          <Button variant="secondary" onClick={() => setIsAddDirectModalOpen(true)}>
            <UserPlus size={16} /> Direct Add
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setCreatedInviteUrl(null);
              setInviteEmail('');
              setInviteName('');
              setIsInviteModalOpen(true);
            }}
          >
            <Mail size={16} /> Invite Member Link
          </Button>
        </div>
      </div>

      {/* B. Summary Section: KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total In Directory</span>
            <div className="kpi-icon-box" style={{ backgroundColor: '#f1f5f9' }}>
              <Users size={18} color="var(--text-muted)" />
            </div>
          </div>
          <div className="kpi-value">{totalCount}</div>
          <div className="kpi-subtext" style={{ color: 'var(--text-muted)' }}>
            Across all lifecycle stages
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Members</span>
            <div className="kpi-icon-box" style={{ backgroundColor: '#ecfdf5' }}>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#10b981' }}>
            {activeCount}
          </div>
          <div className="kpi-subtext" style={{ color: '#10b981' }}>
            Participating in meals/rent
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">On Leave / Exiting</span>
            <div className="kpi-icon-box" style={{ backgroundColor: '#fffbeb' }}>
              <Clock size={18} color="#f59e0b" />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#f59e0b' }}>
            {onLeaveCount}
          </div>
          <div className="kpi-subtext" style={{ color: '#f59e0b' }}>
            Exempt from active meals
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Owing Balance</span>
            <div className="kpi-icon-box" style={{ backgroundColor: '#fef2f2' }}>
              <Wallet size={18} color="#ef4444" />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>
            {owingCount}
          </div>
          <div className="kpi-subtext" style={{ color: '#ef4444' }}>
            Debtors needing settlement
          </div>
        </div>
      </div>

      {/* C. Search & Filters Bar */}
      <div
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Status Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 8,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
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
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  border: 'none',
                  backgroundColor: isActive ? 'var(--color-primary)' : '#f1f5f9',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Dropdown Filters Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, room, email..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            />
          </form>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: '#ffffff',
              fontSize: '0.82rem',
              color: 'var(--text-main)',
              outline: 'none',
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="MANAGER">MANAGER</option>
            <option value="MEMBER">MEMBER</option>
          </select>

          {/* Room Filter */}
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: '#ffffff',
              fontSize: '0.82rem',
              color: 'var(--text-main)',
              outline: 'none',
            }}
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
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: '#ffffff',
              fontSize: '0.82rem',
              color: 'var(--text-main)',
              outline: 'none',
            }}
          >
            <option value="ALL">All Balances</option>
            <option value="DEFICIT">Owes Money (Deficit)</option>
            <option value="SURPLUS">Receives Refund (Surplus)</option>
            <option value="SETTLED">Balanced (0.00)</option>
          </select>
        </div>
      </div>

      {/* D. Member List with Proper LOADING, ERROR, EMPTY, DATA States */}
      <div className="table-container">
        {isLoading ? (
          <PageLoader message="Loading member directory..." />
        ) : error ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', backgroundColor: '#fef2f2' }}>
            <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b' }}>Failed to Load Members</h3>
            <p style={{ fontSize: '0.82rem', color: '#b91c1c', marginTop: 4, maxWidth: 460, margin: '4px auto 16px' }}>
              {error}
            </p>
            <Button variant="secondary" onClick={() => fetchMembers()}>
              <RefreshCw size={14} /> Retry Loading
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
            <div className="block md:hidden">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px' }}>
            {members.map((member) => (
              <div
                key={member.id}
                onClick={() => navigate(`/members/${member.id}`)}
                style={{
                  background: 'var(--color-card, #ffffff)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Top Row: Avatar, Name, Email, Balance */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '12px',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1rem',
                        flexShrink: 0,
                      }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {member.email}
                      </div>
                    </div>
                  </div>

                  {/* Net Balance Pill */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color:
                          (member.netBalance || 0) > 0
                            ? 'var(--color-success, #10b981)'
                            : (member.netBalance || 0) < 0
                            ? 'var(--color-danger, #ef4444)'
                            : 'var(--text-muted)',
                      }}
                    >
                      {(member.netBalance || 0) > 0
                        ? `+৳${(member.netBalance || 0).toFixed(0)}`
                        : (member.netBalance || 0) < 0
                        ? `-৳${Math.abs(member.netBalance || 0).toFixed(0)}`
                        : '৳0'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {(member.netBalance || 0) < 0 ? 'OWES' : (member.netBalance || 0) > 0 ? 'REFUND' : 'SETTLED'}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Room, Role, Status Badges & Quick Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Badge variant="primary">{member.role}</Badge>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/members/${member.id}/statement`)}
                      className="header-icon-btn"
                      style={{ width: 32, height: 32, borderRadius: '8px' }}
                      title="Financial Statement"
                    >
                      <FileText size={15} />
                    </button>
                    {member.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => setMemberToArchive(member)}
                        className="header-icon-btn"
                        style={{ width: 32, height: 32, borderRadius: '8px', color: 'var(--color-danger)' }}
                        title="Archive Member"
                      >
                        <UserX size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
