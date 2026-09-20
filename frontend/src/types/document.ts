export type DocumentCategory =
  | 'EXPENSE_RECEIPT'
  | 'UTILITY_RECEIPT'
  | 'PAYMENT_PROOF'
  | 'MEMBER_DOCUMENT'
  | 'MESS_DOCUMENT'
  | 'INVOICE'
  | 'STATEMENT'
  | 'SETTLEMENT_DOCUMENT'
  | 'GENERAL_DOCUMENT'
  | 'IMAGE'
  | 'OTHER';

export type DocumentVisibility =
  | 'PRIVATE'
  | 'MESS_SHARED'
  | 'ROLE_RESTRICTED'
  | 'ENTITY_RESTRICTED';

export type DocumentStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'REPLACED'
  | 'DELETED';

export interface DocumentItem {
  id: string;
  messId: string;
  uploadedBy: string;
  originalFilename: string;
  storageFilename: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileExtension: string;
  fileSize: number;
  originalFileSize: number;
  compressedFileSize: number;
  width?: number | null;
  height?: number | null;
  checksum?: string | null;
  documentType: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  tags?: string[] | null;
  downloadUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  uploader?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface StorageAnalytics {
  totalFiles: number;
  totalStorageBytes: number;
  originalStorageBytes: number;
  savedBytes: number;
  savingsPercentage: number;
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  imageCount: number;
  documentCount: number;
}

export interface DocumentQueryFilter {
  category?: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  search?: string;
  page?: number;
  limit?: number;
}
