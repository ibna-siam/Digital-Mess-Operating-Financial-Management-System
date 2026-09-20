import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Building2,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  UserX,
  RefreshCw,
  LogOut,
  Save,
  Check,
  X,
  Phone,
  Mail,
  Sliders,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { MessMember, Room } from '../types/index.js';
import { MemberHistoryItem, CostEligibility, ExitClearanceAudit } from '../types/memberLifecycle.js';

export const MemberDetailPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { activeMess } = useAuth();
  const messId = activeMess?.id || 'mess-greenview-01';

  const [member, setMember] = useState<MessMember | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [history, setHistory] = useState<MemberHistoryItem[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [clearance, setClearance] = useState<ExitClearanceAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'room' | 'eligibility' | 'finance' | 'history'>('profile');

  // Edit Profile Form
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Room Assignment Modal
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [isAssigningRoom, setIsAssigningRoom] = useState(false);

  // Cost Eligibility
  const [eligibility, setEligibility] = useState<CostEligibility>({
    MEALS: true,
    RENT: true,
    ELECTRICITY: true,
    GAS: true,
    WATER: true,
    WIFI: true,
    MAID: true,
    OTHER: true,
  });
  const [isSavingEligibility, setIsSavingEligibility] = useState(false);

  // Leave / Exit Request Modal
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<'TEMPORARY' | 'PERMANENT_EXIT'>('TEMPORARY');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Archival Confirmation Modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMemberData = async () => {
    if (!memberId) return;
    try {
      setIsLoading(true);
      const [memberData, roomsData, historyData, finSummary] = await Promise.all([
        apiClient<MessMember>(`/messes/${messId}/members/${memberId}`),
        apiClient<Room[]>(`/messes/${messId}/members/rooms`),
        apiClient<MemberHistoryItem[]>(`/messes/${messId}/members/${memberId}/history`).catch(() => []),
        apiClient<any>(`/messes/${messId}/members/${memberId}/financial-summary`).catch(() => null),
      ]);

      setMember(memberData);
      setRooms(roomsData);
      setHistory(historyData);
      setFinancialSummary(finSummary);

      // Populate forms
      setProfileName(memberData.name || '');
      setProfilePhone(memberData.phone || '');
      setEmergencyContact(memberData.emergencyContact || '');
      setAddress(memberData.address || '');
      setNotes(memberData.notes || '');

      if (memberData.costEligibility) {
        setEligibility({ ...eligibility, ...memberData.costEligibility });
      }

      if (memberData.roomId) {
        setSelectedRoomId(memberData.roomId);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberData();
  }, [messId, memberId]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;
    try {
      setIsSavingProfile(true);
      await apiClient(`/messes/${messId}/members/${memberId}/profile`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          emergencyContact,
          address,
          notes,
        }),
      });
      showNotification('success', 'Profile updated successfully');
      fetchMemberData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAssignRoom = async (roomIdToAssign: string | null) => {
    if (!memberId) return;
    try {
      setIsAssigningRoom(true);
      await apiClient(`/messes/${messId}/members/${memberId}/room`, {
        method: 'PATCH',
        body: JSON.stringify({ roomId: roomIdToAssign }),
      });
      setIsRoomModalOpen(false);
      showNotification('success', roomIdToAssign ? 'Room assigned successfully' : 'Room vacated successfully');
      fetchMemberData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to update room');
    } finally {
      setIsAssigningRoom(false);
    }
  };

  const handleSaveEligibility = async () => {
    if (!memberId) return;
    try {
      setIsSavingEligibility(true);
      await apiClient(`/messes/${messId}/members/${memberId}/eligibility`, {
        method: 'PATCH',
        body: JSON.stringify({ eligibility }),
      });
      showNotification('success', 'Cost eligibility rules saved');
      fetchMemberData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save eligibility');
    } finally {
      setIsSavingEligibility(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;
    try {
      setIsSubmittingLeave(true);
      await apiClient(`/messes/${messId}/leave-requests`, {
        method: 'POST',
        body: JSON.stringify({
          memberId,
          startDate: leaveStartDate,
          endDate: leaveEndDate || undefined,
          type: leaveType,
          reason: leaveReason,
        }),
      });
      setIsLeaveModalOpen(false);
      showNotification('success', 'Leave request recorded successfully');
      fetchMemberData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleArchiveMember = async () => {
    if (!memberId) return;
    try {
      setIsArchiving(true);
      await apiClient(`/messes/${messId}/members/${memberId}/archive`, {
        method: 'POST',
      });
      setIsArchiveModalOpen(false);
      showNotification('success', 'Member archived. All ledger and financial history preserved.');
      fetchMemberData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to archive member');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreMember = async () => {
    if (!memberId) return;
    try {
      await apiClient(`/messes/${messId}/members/${memberId}/restore`, {
        method: 'POST',
      });
      showNotification('success', 'Member restored to ACTIVE status');
      fetchMemberData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to restore member');
    }
  };

  const fetchClearanceAudit = async () => {
    if (!memberId) return;
    try {
      const data = await apiClient<ExitClearanceAudit>(`/messes/${messId}/leave-requests/clearance/${memberId}`);
      setClearance(data);
    } catch {
      // Fallback
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading member profile & financial records..." />;
  }

  if (!member) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Member Not Found</h2>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/members')}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const isArchived = member.status === 'ARCHIVED';
  const balance = member.netBalance !== undefined ? member.netBalance : member.balance || 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center gap-2 animate-slide-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Members Directory
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/members/${member.id}/statement`)}
            className="flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Monthly Statement
          </Button>

          {!isArchived ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  fetchClearanceAudit();
                  setIsLeaveModalOpen(true);
                }}
                className="flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" /> Request Leave / Exit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsArchiveModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <UserX className="w-4 h-4" /> Archive Member
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRestoreMember}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              <RefreshCw className="w-4 h-4" /> Restore Member
            </Button>
          )}
        </div>
      </div>

      {/* Member Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-2xl shrink-0">
              {member.name.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{member.name}</h1>
                <Badge
                  variant={
                    member.status === 'ACTIVE'
                      ? 'success'
                      : member.status === 'ON_LEAVE'
                      ? 'warning'
                      : member.status === 'ARCHIVED'
                      ? 'neutral'
                      : 'primary'
                  }
                >
                  {member.status}
                </Badge>
                <Badge variant="primary">{member.role}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {member.email}
                </span>
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {member.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Room: {member.roomNo || 'Unassigned'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Joined {member.joinDate}
                </span>
              </div>
            </div>
          </div>

          {/* Running Balance Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4 min-w-[220px]">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                balance > 0
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : balance < 0
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              ৳
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Net Ledger Balance</span>
              <p
                className={`text-xl font-bold font-mono ${
                  balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {balance > 0 ? `+৳${balance.toFixed(2)}` : balance < 0 ? `-৳${Math.abs(balance).toFixed(2)}` : '৳0.00'}
              </p>
              <span className="text-[11px] text-slate-500">
                {balance > 0 ? 'To receive at settlement' : balance < 0 ? 'Owes to mess fund' : 'Fully balanced'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-6 -mx-6 px-6 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" /> Personal Profile
          </button>
          <button
            onClick={() => setActiveTab('room')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'room'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" /> Room & Living
          </button>
          <button
            onClick={() => setActiveTab('eligibility')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'eligibility'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" /> Cost Eligibility
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'finance'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Financial History
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" /> Audit Log ({history.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {/* TAB 1: Profile & Contact */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Contact & Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Emergency Contact (Name & Phone)</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. Father: +8801700000000"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Home / Permanent Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Rajshahi, Bangladesh"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes & Special Requirements</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Dietary preferences, allergen details, study schedule notes"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <Button type="submit" variant="primary" disabled={isSavingProfile} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {isSavingProfile ? 'Saving Changes...' : 'Save Profile Details'}
            </Button>
          </form>
        )}

        {/* TAB 2: Room & Living */}
        {activeTab === 'room' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Room Assignment & Capacity Status</h3>

            {member.room ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      {member.room.roomNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Room {member.room.roomNumber}</h4>
                      <p className="text-xs text-slate-500">Floor: {member.room.floor || 'N/A'}</p>
                    </div>
                  </div>
                  <Badge variant="success">Assigned</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-sm">
                  <div>
                    <span className="text-xs text-slate-500">Max Room Capacity</span>
                    <p className="text-slate-900 font-medium">{member.room.capacity} members</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Monthly Room Rent</span>
                    <p className="text-slate-900 font-medium">৳{Number(member.room.monthlyRent).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <Button variant="secondary" size="sm" onClick={() => setIsRoomModalOpen(true)}>
                    Change Room
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isAssigningRoom}
                    onClick={() => handleAssignRoom(null)}
                  >
                    Vacate Room
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900 mb-1">No Room Currently Assigned</h4>
                <p className="text-xs text-slate-500 mb-4">
                  Assigning a room automatically links the member to room-based rent allocations.
                </p>
                <Button variant="primary" size="sm" onClick={() => setIsRoomModalOpen(true)}>
                  Assign to Room
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Cost Eligibility */}
        {activeTab === 'eligibility' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Member-Specific Cost Eligibility</h3>
              <p className="text-xs text-slate-500">
                Disable categories if this member is exempt from specific shared expenses (e.g. WiFi or Maid).
              </p>
            </div>

            <div className="space-y-3">
              {(
                [
                  { key: 'MEALS', title: 'Daily Meals & Bazar', desc: 'Participates in mess food and daily meal counts' },
                  { key: 'RENT', title: 'House / Room Rent', desc: 'Participates in fixed monthly house rent split' },
                  { key: 'ELECTRICITY', title: 'Electricity Bills', desc: 'Participates in DESCO/DPDC bill splits' },
                  { key: 'GAS', title: 'Gas Bills', desc: 'Participates in Titas/LPG cylinder costs' },
                  { key: 'WATER', title: 'Water / WASA', desc: 'Participates in monthly water utility allocations' },
                  { key: 'WIFI', title: 'High-Speed Wi-Fi', desc: 'Participates in shared internet subscription' },
                  { key: 'MAID', title: 'Maid / Housekeeper', desc: 'Participates in cooking & cleaning salary' },
                  { key: 'OTHER', title: 'Other Recurring Costs', desc: 'Waste collection, paper, common supplies' },
                ] as const
              ).map((item) => {
                const isChecked = eligibility[item.key] !== false;
                return (
                  <div
                    key={item.key}
                    onClick={() => setEligibility({ ...eligibility, [item.key]: !isChecked })}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isChecked ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="primary"
              onClick={handleSaveEligibility}
              disabled={isSavingEligibility}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {isSavingEligibility ? 'Saving Rules...' : 'Save Cost Eligibility'}
            </Button>
          </div>
        )}

        {/* TAB 4: Financial History */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Authoritative Financial Ledger & History</h3>

            {financialSummary ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">Total Credits (Deposits)</span>
                    <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                      ৳{financialSummary.totalCredits.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">Total Debits (Charges)</span>
                    <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                      ৳{financialSummary.totalDebits.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">Net Standing</span>
                    <p
                      className={`text-xl font-bold font-mono mt-1 ${
                        financialSummary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      ৳{financialSummary.netBalance.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Recent Transactions (Last 10)</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {financialSummary.recentTransactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 text-xs text-slate-500">{tx.effectiveDate}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant={tx.direction === 'CREDIT' ? 'success' : 'danger'}>
                                {tx.entryType}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">{tx.description}</td>
                            <td
                              className={`py-2.5 px-3 font-mono font-medium ${
                                tx.direction === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {tx.direction === 'CREDIT' ? '+' : '-'}৳{tx.amount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 text-right">
                              ৳{tx.balanceAfter.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-sm">No transaction records available.</p>
            )}
          </div>
        )}

        {/* TAB 5: Audit Log Timeline */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Member Audit & Transition Timeline</h3>

            {history.length === 0 ? (
              <p className="text-slate-500 text-sm">No audit history recorded yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                {history.map((item) => (
                  <div key={item.id} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-500 shrink-0" />
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-1">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <Badge variant="primary">{item.action}</Badge>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <pre className="text-xs text-slate-700 font-mono mt-2 bg-white border border-slate-200 p-2 rounded-lg overflow-x-auto">
                        {JSON.stringify(item.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Room Assignment Modal */}
      <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} title="Assign Room">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Select a room with available bed capacity. Rooms at full capacity will be disabled.
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {rooms.map((room) => {
              const isFull = (room.currentMembers || 0) >= room.capacity;
              const isCurrent = room.id === member.roomId;

              return (
                <div
                  key={room.id}
                  onClick={() => !isFull && setSelectedRoomId(room.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50'
                      : isFull
                      ? 'border-slate-200 bg-slate-100/60 opacity-50 cursor-not-allowed'
                      : selectedRoomId === room.id
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Room {room.roomNumber}</h4>
                    <p className="text-xs text-slate-500">Floor: {room.floor || '1st'} • ৳{room.monthlyRent}/mo</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${isFull ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {room.currentMembers || 0} / {room.capacity} Beds
                    </span>
                    {isCurrent && <Badge variant="primary" className="ml-2">Current</Badge>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setIsRoomModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isAssigningRoom || !selectedRoomId || selectedRoomId === member.roomId}
              onClick={() => handleAssignRoom(selectedRoomId)}
            >
              {isAssigningRoom ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave / Exit Request Modal */}
      <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Submit Leave / Exit Request">
        <form onSubmit={handleSubmitLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Request Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLeaveType('TEMPORARY')}
                className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                  leaveType === 'TEMPORARY'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Temporary Leave
              </button>
              <button
                type="button"
                onClick={() => setLeaveType('PERMANENT_EXIT')}
                className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                  leaveType === 'PERMANENT_EXIT'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Permanent Exit
              </button>
            </div>
          </div>

          {clearance && leaveType === 'PERMANENT_EXIT' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <span className="font-semibold text-slate-800 block">Exit Clearance Audit Preview</span>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Net Balance:</span>
                <span
                  className={`font-mono font-bold ${
                    clearance.financialSummary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  ৳{clearance.financialSummary.netBalance.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Unsettled Debts:</span>
                <span className="text-slate-800">৳{clearance.financialSummary.unsettledDebtAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Bed to Release:</span>
                <span className="text-slate-800">{clearance.assignedRoom?.roomNumber || 'None'}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            {leaveType === 'TEMPORARY' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Expected Return Date</label>
                <input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Reason / Justification</label>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              rows={2}
              placeholder="e.g. Semester break, family vacation, job relocation"
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" type="button" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingLeave}>
              {isSubmittingLeave ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Member Safety Modal */}
      <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Archive Member">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs leading-relaxed flex items-start gap-3">
            <Shield className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong className="block font-bold mb-1">Non-Destructive Financial Archival</strong>
              Archiving sets the member status to ARCHIVED and vacates their assigned room. All ledger entries,
              payments, deposits, meal records, and historical monthly statements will be permanently retained
              down to the penny. The member can be restored at any time.
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Are you sure you want to archive <strong className="text-slate-900">{member.name}</strong>?
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={isArchiving} onClick={handleArchiveMember}>
              {isArchiving ? 'Archiving...' : 'Confirm Archival'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
