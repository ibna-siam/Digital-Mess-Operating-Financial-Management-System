import React, { useState } from 'react';
import { Download, RefreshCw, Archive, ExternalLink, FileText, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { DocumentItem } from '../../types/document';
import { getDownloadUrl, replaceDocument, archiveDocument } from '../../lib/documentApi';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onDocumentUpdated?: (updatedDoc: DocumentItem) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  onDocumentUpdated,
}) => {
  const [isReplacing, setIsReplacing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [archiveReason, setArchiveReason] = useState('');

  if (!document) return null;

  const downloadUrl = getDownloadUrl(document.messId, document.id);
  const isImage = document.mimeType.startsWith('image/');
  const isPdf = document.mimeType === 'application/pdf';

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const savingsPercent =
    document.originalFileSize > document.compressedFileSize
      ? Math.round(
          ((document.originalFileSize - document.compressedFileSize) /
            document.originalFileSize) *
            100
        )
      : 0;

  const handleExecuteReplace = async () => {
    if (!replaceFile) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const formData = new FormData();
      formData.append('file', replaceFile);
      const updated = await replaceDocument(document.messId, document.id, formData);
      setIsReplacing(false);
      setReplaceFile(null);
      if (onDocumentUpdated) onDocumentUpdated(updated);
    } catch (err: any) {
      setActionError(err?.message || 'Replacement failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteArchive = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await archiveDocument(document.messId, document.id, archiveReason);
      setIsArchiving(false);
      if (onDocumentUpdated) onDocumentUpdated(updated);
    } catch (err: any) {
      setActionError(err?.message || 'Archival failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsReplacing(false);
        setIsArchiving(false);
        setActionError(null);
        onClose();
      }}
      title={document.originalFilename}
      maxWidth={780}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Main Preview Screen */}
        <div
          style={{
            backgroundColor: '#1f2937',
            borderRadius: '10px',
            minHeight: '280px',
            maxHeight: '480px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {isImage ? (
            <img
              src={downloadUrl}
              alt={document.originalFilename}
              style={{
                maxWidth: '100%',
                maxHeight: '480px',
                objectFit: 'contain',
              }}
              onError={(e) => {
                // In case signed URL isn't immediately loadable via img tag
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : isPdf ? (
            <div style={{ width: '100%', height: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '12px' }}>
              <FileText size={64} color="#9ca3af" />
              <div style={{ fontSize: '16px', fontWeight: 500 }}>PDF Document</div>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLink size={16} /> Open in PDF Viewer
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#9ca3af' }}>
              <FileText size={64} />
              <span>Preview not available for this file type</span>
            </div>
          )}
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            backgroundColor: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '13px',
          }}
        >
          <div>
            <span style={{ color: '#6b7280', display: 'block' }}>Category</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{document.category.replace('_', ' ')}</span>
          </div>

          <div>
            <span style={{ color: '#6b7280', display: 'block' }}>Status</span>
            <Badge
              variant={
                document.status === 'ACTIVE'
                  ? 'success'
                  : document.status === 'REPLACED'
                  ? 'warning'
                  : 'neutral'
              }
              size="sm"
            >
              {document.status}
            </Badge>
          </div>

          <div>
            <span style={{ color: '#6b7280', display: 'block' }}>Optimized Size</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {formatBytes(document.compressedFileSize)}
              </span>
              {savingsPercent > 0 && (
                <Badge variant="success" size="sm">
                  -{savingsPercent}%
                </Badge>
              )}
            </div>
          </div>

          <div>
            <span style={{ color: '#6b7280', display: 'block' }}>Original Size</span>
            <span style={{ color: '#6b7280' }}>
              {formatBytes(document.originalFileSize)}
            </span>
          </div>

          {document.width && document.height && (
            <div>
              <span style={{ color: '#6b7280', display: 'block' }}>Dimensions</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {document.width} × {document.height} px
              </span>
            </div>
          )}

          <div>
            <span style={{ color: '#6b7280', display: 'block' }}>Uploaded By</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>
              {document.uploader?.name || 'System / Member'}
            </span>
          </div>

          <div>
            <span style={{ color: '#6b7280', display: 'block' }}>Uploaded On</span>
            <span style={{ color: '#374151' }}>
              {new Date(document.createdAt).toLocaleString()}
            </span>
          </div>

          {document.entityType && (
            <div>
              <span style={{ color: '#6b7280', display: 'block' }}>Attached Entity</span>
              <span style={{ fontWeight: 600, color: '#2563eb' }}>
                {document.entityType}: {document.entityId?.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        {actionError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{actionError}</span>
          </div>
        )}

        {isReplacing ? (
          <div
            style={{
              padding: '14px',
              border: '1px solid #fed7aa',
              backgroundColor: '#fffbeb',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#9a3412' }}>
              Replace with new file (Old version will be marked as REPLACED)
            </div>
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setReplaceFile(e.target.files[0]);
                }
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setIsReplacing(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!replaceFile}
                isLoading={actionLoading}
                onClick={handleExecuteReplace}
              >
                Confirm Replacement
              </Button>
            </div>
          </div>
        ) : isArchiving ? (
          <div
            style={{
              padding: '14px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
              Archive Document (Will be removed from active lists but kept for audit)
            </div>
            <input
              type="text"
              placeholder="Reason for archiving (optional)"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setIsArchiving(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={actionLoading}
                onClick={handleExecuteArchive}
              >
                Confirm Archive
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {document.status === 'ACTIVE' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw size={14} />}
                    onClick={() => setIsReplacing(true)}
                  >
                    Replace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Archive size={14} />}
                    onClick={() => setIsArchiving(true)}
                  >
                    Archive
                  </Button>
                </>
              )}
            </div>

            <a
              href={downloadUrl}
              download={document.originalFilename}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} /> Download File
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
};
