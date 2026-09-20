import { apiClient, ApiError } from './apiClient';
import type { DocumentItem, StorageAnalytics, DocumentQueryFilter } from '../types/document';

const API_BASE = '/api/v1';

export async function uploadDocument(
  messId: string,
  formData: FormData
): Promise<DocumentItem> {
  const token = localStorage.getItem('messmate_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/messes/${messId}/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const err = data.error || {};
    throw new ApiError(
      response.status,
      err.code || 'UPLOAD_FAILED',
      err.message || 'File upload failed'
    );
  }

  return data.data;
}

export async function replaceDocument(
  messId: string,
  documentId: string,
  formData: FormData
): Promise<DocumentItem> {
  const token = localStorage.getItem('messmate_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/messes/${messId}/documents/${documentId}/replace`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const err = data.error || {};
    throw new ApiError(
      response.status,
      err.code || 'REPLACE_FAILED',
      err.message || 'File replacement failed'
    );
  }

  return data.data;
}

export async function getDocuments(
  messId: string,
  filter: DocumentQueryFilter = {}
): Promise<{ documents: DocumentItem[]; total: number; page: number; limit: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (filter.category) query.set('category', filter.category);
  if (filter.status) query.set('status', filter.status);
  if (filter.entityType) query.set('entityType', filter.entityType);
  if (filter.entityId) query.set('entityId', filter.entityId);
  if (filter.search) query.set('search', filter.search);
  if (filter.page) query.set('page', filter.page.toString());
  if (filter.limit) query.set('limit', filter.limit.toString());

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient<{ documents: DocumentItem[]; total: number; page: number; limit: number; totalPages: number }>(
    `/messes/${messId}/documents${qs}`
  );
}

export async function getDocumentById(
  messId: string,
  documentId: string
): Promise<DocumentItem> {
  return apiClient<DocumentItem>(`/messes/${messId}/documents/${documentId}`);
}

export async function archiveDocument(
  messId: string,
  documentId: string,
  reason?: string
): Promise<DocumentItem> {
  return apiClient<DocumentItem>(`/messes/${messId}/documents/${documentId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getStorageAnalytics(
  messId: string
): Promise<StorageAnalytics> {
  return apiClient<StorageAnalytics>(`/messes/${messId}/documents/analytics`);
}

export async function detectOrphans(
  messId: string
): Promise<{ orphanedDatabaseRecords: string[]; totalOrphansFound: number }> {
  return apiClient<{ orphanedDatabaseRecords: string[]; totalOrphansFound: number }>(
    `/messes/${messId}/documents/orphans`
  );
}

export function getDownloadUrl(messId: string, documentId: string): string {
  const token = localStorage.getItem('messmate_token');
  return `${API_BASE}/messes/${messId}/documents/${documentId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}
