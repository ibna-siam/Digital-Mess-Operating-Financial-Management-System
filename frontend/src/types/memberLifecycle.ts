import { AppRole } from './index.js';

export type MemberStatus =
  | 'INVITED'
  | 'PENDING'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ON_LEAVE'
  | 'LEAVING_REQUESTED'
  | 'EXITING'
  | 'SETTLED'
  | 'ARCHIVED';

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type LeaveType = 'TEMPORARY' | 'PERMANENT_EXIT';

export interface CostEligibility {
  MEALS?: boolean;
  RENT?: boolean;
  ELECTRICITY?: boolean;
  GAS?: boolean;
  WATER?: boolean;
  WIFI?: boolean;
  MAID?: boolean;
  OTHER?: boolean;
}

export interface MemberHistoryItem {
  id: string;
  messId: string;
  memberId: string;
  action: string;
  details: any;
  createdAt: string;
  createdBy?: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  } | null;
}

export interface LeaveRequestItem {
  id: string;
  messId: string;
  memberId: string;
  startDate: string;
  endDate?: string | null;
  type: LeaveType;
  reason?: string | null;
  status: LeaveRequestStatus;
  clearanceDetails?: any;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  member?: {
    id: string;
    role: AppRole;
    roomNo?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
    };
  };
  approvedBy?: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  } | null;
}

export interface ExitClearanceAudit {
  memberId: string;
  memberName: string;
  email: string;
  currentStatus: MemberStatus;
  assignedRoom: {
    id: string;
    roomNumber: string;
  } | null;
  financialSummary: {
    totalCredits: number;
    totalDebits: number;
    netBalance: number;
    balanceStatus: 'SURPLUS' | 'DEFICIT' | 'SETTLED';
    unsettledDebtAmount: number;
    pendingUtilityAmount: number;
  };
  exitChecklist: {
    roomVacated: boolean;
    allDebtsSettled: boolean;
    noPendingUtilityBills: boolean;
    eligibleForImmediateExit: boolean;
  };
}

export interface InvitationItem {
  id: string;
  messId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  token: string;
  role: AppRole;
  roomId?: string | null;
  roomNo?: string | null;
  joinDate?: string | null;
  notes?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
  isExpired?: boolean;
  inviteUrl?: string;
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  mess?: {
    id: string;
    name: string;
    code: string;
    area?: string | null;
    city?: string | null;
    currency?: string;
    currencySymbol?: string;
  };
}

export interface MemberListItem {
  id: string;
  messId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: AppRole;
  roomNo?: string | null;
  roomId?: string | null;
  room?: {
    id: string;
    roomNumber: string;
    floor?: string | null;
    capacity: number;
    monthlyRent: number;
  } | null;
  status: MemberStatus;
  emergencyContact?: string | null;
  address?: string | null;
  notes?: string | null;
  costEligibility?: CostEligibility | null;
  joinDate: string;
  leaveDate?: string | null;
  netBalance: number;
  balanceStatus: 'SURPLUS' | 'DEFICIT' | 'SETTLED';
}

export interface MemberPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
