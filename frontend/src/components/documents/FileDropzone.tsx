import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import type { DocumentCategory } from '../../types/document';
import { uploadDocument } from '../../lib/documentApi';

interface FileDropzoneProps {
  messId: string;
  defaultCategory?: DocumentCategory;
  entityType?: string;
  entityId?: string;
  onUploadSuccess?: (doc: any) => void;
  onUploadError?: (err: any) => void;
}

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'EXPENSE_RECEIPT', label: 'Expense Receipt' },
  { value: 'UTILITY_RECEIPT', label: 'Utility Receipt' },
  { value: 'PAYMENT_PROOF', label: 'Payment Proof' },
  { value: 'MEMBER_DOCUMENT', label: 'Member Document' },
  { value: 'MESS_DOCUMENT', label: 'Mess Document' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'STATEMENT', label: 'Statement' },
  { value: 'GENERAL_DOCUMENT', label: 'General Document' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'OTHER', label: 'Other' },
];

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  messId,
  defaultCategory = 'EXPENSE_RECEIPT',
  entityType,
  entityId,
  onUploadSuccess,
  onUploadError,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'optimizing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMessage(null);
    setUploadStatus('idle');

    // Basic frontend size check (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 20MB limit.');
      return;
    }

    // Supported formats
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
      setErrorMessage('Only JPG, PNG, WebP images and PDF documents are allowed.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus('uploading');
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category);
      if (description) formData.append('description', description);
      if (entityType) formData.append('entityType', entityType);
      if (entityId) formData.append('entityId', entityId);

      // Simulate optimizing progress for visual feedback if image
      if (selectedFile.type.startsWith('image/')) {
        setTimeout(() => {
          setUploadStatus((prev) => (prev === 'uploading' ? 'optimizing' : prev));
        }, 500);
      }

      const doc = await uploadDocument(messId, formData);
      setUploadStatus('success');
      setSelectedFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onUploadSuccess) onUploadSuccess(doc);
    } catch (err: any) {
      setUploadStatus('error');
      const msg = err?.message || 'Failed to upload document.';
      setErrorMessage(msg);
      if (onUploadError) onUploadError(err);
    }
  };

  return (
    <div className="file-dropzone-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '12px',
          padding: '32px 20px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <UploadCloud size={40} color={isDragging ? '#3b82f6' : '#6b7280'} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
            {selectedFile ? selectedFile.name : 'Choose a file or drag & drop here'}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Supports JPG, PNG, WebP (auto-optimized) & PDF (up to 20MB)
          </div>
          {selectedFile && (
            <div style={{ fontSize: '12px', color: '#059669', fontWeight: 500, marginTop: '4px' }}>
              Selected: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </div>
          )}
        </div>
      </div>

      {selectedFile && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                Document Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Bazar receipt for rice & oil"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setUploadStatus('idle');
              }}
              disabled={uploadStatus === 'uploading' || uploadStatus === 'optimizing'}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpload}
              isLoading={uploadStatus === 'uploading' || uploadStatus === 'optimizing'}
            >
              {uploadStatus === 'optimizing' ? 'Optimizing Image...' : 'Upload File'}
            </Button>
          </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>File uploaded and optimized successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
