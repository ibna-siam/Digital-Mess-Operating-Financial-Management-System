import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Search,
  Download,
  Eye,
  HardDrive,
  Database,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataSync } from '../hooks/useDataSync';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageLoader, EmptyState } from '../components/ui/StateComponents';
import { FileDropzone } from '../components/documents/FileDropzone';
import { FilePreviewModal } from '../components/documents/FilePreviewModal';
import {
  getDocuments,
  getStorageAnalytics,
  getDownloadUrl,
} from '../lib/documentApi';
import type {
  DocumentItem,
  StorageAnalytics,
} from '../types/document';

const CATEGORIES: { value: string; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'EXPENSE_RECEIPT', label: 'Expense Receipts' },
  { value: 'UTILITY_RECEIPT', label: 'Utility Receipts' },
  { value: 'PAYMENT_PROOF', label: 'Payment Proofs' },
  { value: 'MEMBER_DOCUMENT', label: 'Member Documents' },
  { value: 'MESS_DOCUMENT', label: 'Mess Documents' },
  { value: 'INVOICE', label: 'Invoices' },
  { value: 'STATEMENT', label: 'Statements' },
  { value: 'IMAGE', label: 'Images' },
  { value: 'OTHER', label: 'Other' },
];

export const DocumentsPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id;

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const fetchDocsAndAnalytics = useCallback(async () => {
    if (!messId) return;
    try {
      setIsLoading(true);
      const [docsRes, analyticsRes] = await Promise.all([
        getDocuments(messId, {
          category: selectedCategory || undefined,
          status: selectedStatus || undefined,
          search: debouncedSearch || undefined,
          page,
          limit: 15,
        }),
        getStorageAnalytics(messId).catch(() => null),
      ]);

      setDocuments(docsRes.documents || []);
      setTotalPages(docsRes.totalPages || 1);
      setTotalDocs(docsRes.total || 0);
      if (analyticsRes) setAnalytics(analyticsRes);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messId, selectedCategory, selectedStatus, debouncedSearch, page]);

  useEffect(() => {
    fetchDocsAndAnalytics();
  }, [fetchDocsAndAnalytics]);

  useDataSync(['documents'], fetchDocsAndAnalytics);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="page-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
            Documents & Storage
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Supabase Storage file management with auto-compression, multi-tenant isolation, and business record attachments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={15} />}
            onClick={() => fetchDocsAndAnalytics()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload File
          </Button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      {analytics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '18px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <HardDrive size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                Total Active Files
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                {analytics.totalFiles}
              </div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 500 }}>
                {analytics.imageCount} images, {analytics.documentCount} docs
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '18px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <Database size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                Supabase Storage Used
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                {formatBytes(analytics.totalStorageBytes)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                Original: {formatBytes(analytics.originalStorageBytes)}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '18px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                Bandwidth & Space Saved
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                {formatBytes(analytics.savedBytes)}
              </div>
              <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}>
                {analytics.savingsPercentage}% overall reduction
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
            />
            <input
              type="text"
              placeholder="Search by filename or notes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
              }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              backgroundColor: '#fff',
            }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="REPLACED">Replaced</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
          Showing {documents.length} of {totalDocs} files
        </div>
      </div>

      {/* Documents Table */}
      {isLoading ? (
        <PageLoader message="Loading documents from Supabase..." />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents found"
          description="Upload receipts, bills, payment proofs, or member documents to manage them securely."
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload First Document
            </Button>
          }
        />
      ) : (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>File</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Size / Optimization</th>
                  <th style={{ padding: '12px 16px' }}>Attached Entity</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Uploaded</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const isImage = doc.mimeType.startsWith('image/');
                  const savings =
                    doc.originalFileSize > doc.compressedFileSize
                      ? Math.round(
                          ((doc.originalFileSize - doc.compressedFileSize) /
                            doc.originalFileSize) *
                            100
                        )
                      : 0;

                  return (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: isImage ? '#eff6ff' : '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isImage ? '#2563eb' : '#4b5563',
                              flexShrink: 0,
                            }}
                          >
                            {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: '#111827',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '240px',
                                cursor: 'pointer',
                              }}
                              onClick={() => setPreviewDoc(doc)}
                            >
                              {doc.originalFilename}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                              {doc.mimeType} {doc.width && doc.height ? `• ${doc.width}×${doc.height}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <Badge variant="neutral" size="sm">
                          {doc.category.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {formatBytes(doc.compressedFileSize)}
                        </div>
                        {savings > 0 && (
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 500 }}>
                            Saved {savings}% (from {formatBytes(doc.originalFileSize)})
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {doc.entityType ? (
                          <span style={{ color: '#2563eb', fontWeight: 500 }}>
                            {doc.entityType}: {doc.entityId?.slice(0, 8)}...
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>Standalone</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <Badge
                          variant={
                            doc.status === 'ACTIVE'
                              ? 'success'
                              : doc.status === 'REPLACED'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {doc.status}
                        </Badge>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#6b7280' }}>
                        <div>{new Date(doc.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          {doc.uploader?.name || 'Member'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Preview file"
                            onClick={() => setPreviewDoc(doc)}
                            style={{ padding: '6px', color: '#4b5563' }}
                          >
                            <Eye size={16} />
                          </button>
                          <a
                            href={getDownloadUrl(doc.messId, doc.id)}
                            download={doc.originalFilename}
                            className="btn btn-ghost btn-sm"
                            title="Download file"
                            style={{ padding: '6px', color: '#4b5563' }}
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderTop: '1px solid #e5e7eb',
                fontSize: '13px',
                color: '#6b7280',
              }}
            >
              <div>
                Page {page} of {totalPages}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {messId && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title="Upload Document or Receipt"
          maxWidth={640}
        >
          <FileDropzone
            messId={messId}
            onUploadSuccess={() => {
              setIsUploadModalOpen(false);
              fetchDocsAndAnalytics();
            }}
          />
        </Modal>
      )}

      {/* Preview Modal */}
      <FilePreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        onDocumentUpdated={(updated) => {
          setPreviewDoc(updated);
          fetchDocsAndAnalytics();
        }}
      />
    </div>
  );
};
