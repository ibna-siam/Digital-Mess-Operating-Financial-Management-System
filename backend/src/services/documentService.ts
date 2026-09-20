import { prisma } from '../config/database.js';
import { StorageService } from '../config/supabaseStorage.js';
import { ImageOptimizationService } from './imageOptimizationService.js';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { Role, MemberStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';

const db = prisma as any;

export interface UploadDocumentInput {
  messId: string;
  userId: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
  category?: string;
  documentType?: string;
  visibility?: 'PRIVATE' | 'MESS_SHARED' | 'ADMIN_ONLY' | 'TREASURER_ONLY';
  entityType?: 'EXPENSE' | 'UTILITY_BILL' | 'SETTLEMENT_PAYMENT' | 'MEMBER' | 'ANNOUNCEMENT' | 'MESS';
  entityId?: string;
  metadata?: Record<string, any>;
}

export interface GetDocumentsQuery {
  messId: string;
  userId: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class DocumentService {
  /**
   * Upload, optimize, store in Supabase Storage, and persist metadata in PostgreSQL.
   */
  static async uploadDocument(input: UploadDocumentInput) {
    // 1. Verify user membership in mess
    const membership = await prisma.messMember.findFirst({
      where: {
        messId: input.messId,
        userId: input.userId,
        status: { in: [MemberStatus.ACTIVE, MemberStatus.ON_LEAVE] },
      },
    });

    if (!membership) {
      throw new UnauthorizedError('You are not an active member of this mess');
    }

    const category = input.category || 'GENERAL_DOCUMENT';
    const isPublicImage = category === 'IMAGE' || category === 'ANNOUNCEMENT_ATTACHMENT';
    const storageBucket = isPublicImage ? 'mess-images' : 'mess-documents';

    // 2. Process & Optimize Image/Document
    const isAvatar = category === 'MEMBER_DOCUMENT' && input.documentType === 'PHOTO';
    const optimized = await ImageOptimizationService.processFile(
      input.file.buffer,
      input.file.originalname,
      input.file.mimetype,
      { isAvatar }
    );

    // 3. Construct clean tenant-aware storage path
    const fileUuid = crypto.randomUUID();
    const storageFilename = `${fileUuid}.${optimized.fileExtension}`;
    const entityFolder = input.entityType && input.entityId ? `${input.entityType.toLowerCase()}s/${input.entityId}/` : '';
    const storagePath = `mess/${input.messId}/${category.toLowerCase()}/${entityFolder}${storageFilename}`;

    // 4. Upload binary to Supabase Storage
    await StorageService.upload(storageBucket, storagePath, optimized.buffer, optimized.mimeType);

    // 5. Persist document metadata in Supabase PostgreSQL (Source of Truth)
    const doc = await db.document.create({
      data: {
        messId: input.messId,
        uploadedById: input.userId,
        originalFilename: input.file.originalname,
        storageFilename,
        storageBucket,
        storagePath,
        mimeType: optimized.mimeType,
        fileExtension: optimized.fileExtension,
        fileSize: optimized.compressedFileSize,
        originalFileSize: optimized.originalFileSize,
        compressedFileSize: optimized.compressedFileSize,
        width: optimized.width || null,
        height: optimized.height || null,
        checksum: optimized.checksum,
        category,
        documentType: input.documentType || null,
        visibility: input.visibility || (isPublicImage ? 'MESS_SHARED' : 'MESS_SHARED'),
        status: 'ACTIVE',
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // 6. Link to business entity where appropriate
    if (input.entityType === 'EXPENSE' && input.entityId) {
      await prisma.expense.update({
        where: { id: input.entityId },
        data: { receiptUrl: doc.storagePath },
      }).catch((err) => logger.warn(`Could not link expense receiptUrl: ${err.message}`));
    } else if (input.entityType === 'UTILITY_BILL' && input.entityId) {
      await prisma.utilityBill.update({
        where: { id: input.entityId },
        data: { receiptUrl: doc.storagePath },
      }).catch((err) => logger.warn(`Could not link utility receiptUrl: ${err.message}`));
    } else if (isAvatar) {
      const publicUrl = StorageService.getPublicUrl(storageBucket, storagePath);
      await prisma.user.update({
        where: { id: input.userId },
        data: { avatarUrl: publicUrl },
      }).catch((err) => logger.warn(`Could not link user avatarUrl: ${err.message}`));
    }

    // 7. Audit Logging
    await prisma.auditLog.create({
      data: {
        messId: input.messId,
        userId: input.userId,
        action: 'FILE_UPLOADED',
        entity: 'Document',
        entityId: doc.id,
        details: JSON.stringify({
          originalFilename: doc.originalFilename,
          category: doc.category,
          originalSize: doc.originalFileSize,
          optimizedSize: doc.compressedFileSize,
        }),
      },
    }).catch(() => {});

    // 8. Generate URL for immediate view
    const viewUrl = storageBucket === 'mess-images'
      ? StorageService.getPublicUrl(storageBucket, storagePath)
      : await StorageService.getSignedUrl(storageBucket, storagePath, 900);

    return {
      ...doc,
      viewUrl,
    };
  }

  /**
   * Retrieves single document by ID with multi-tenant and visibility authorization.
   */
  static async getDocumentById(documentId: string, messId: string, userId: string) {
    const doc = await db.document.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!doc || doc.messId !== messId) {
      throw new NotFoundError('Document not found in this mess');
    }

    // Role and visibility check
    const membership = await prisma.messMember.findFirst({
      where: { messId, userId },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenError('Unauthorized: You are not a member of this mess');
    }

    if (doc.visibility === 'ADMIN_ONLY' && membership.role !== Role.OWNER && membership.role !== Role.MANAGER) {
      throw new ForbiddenError('Unauthorized: This document is restricted to managers and owners');
    }

    if (
      doc.visibility === 'TREASURER_ONLY' &&
      membership.role !== Role.OWNER &&
      membership.role !== Role.MANAGER &&
      membership.role !== Role.TREASURER
    ) {
      throw new ForbiddenError('Unauthorized: This document is restricted to financial managers');
    }

    if (doc.visibility === 'PRIVATE' && doc.uploadedById !== userId && membership.role !== Role.OWNER) {
      throw new ForbiddenError('Unauthorized: This document is private to the uploader');
    }

    const downloadUrl = doc.storageBucket === 'mess-images'
      ? StorageService.getPublicUrl(doc.storageBucket, doc.storagePath)
      : await StorageService.getSignedUrl(doc.storageBucket, doc.storagePath, 900);

    return {
      ...doc,
      downloadUrl,
    };
  }

  /**
   * Paginated retrieval of mess documents with multi-field search and category filtering.
   */
  static async getDocuments(query: GetDocumentsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      messId: query.messId,
      ...(query.category && query.category !== 'ALL' ? { category: query.category } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.status ? { status: query.status } : { status: { not: 'REPLACED' } }),
      ...(query.search
        ? {
            OR: [
              { originalFilename: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      db.document.count({ where }),
      db.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    // Attach signed/public URLs for client rendering
    const enhancedItems = await Promise.all(
      items.map(async (item: any) => {
        let viewUrl = '';
        try {
          viewUrl = item.storageBucket === 'mess-images'
            ? StorageService.getPublicUrl(item.storageBucket, item.storagePath)
            : await StorageService.getSignedUrl(item.storageBucket, item.storagePath, 900);
        } catch {
          viewUrl = '';
        }
        return {
          ...item,
          viewUrl,
        };
      })
    );

    return {
      data: enhancedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Traceably replaces an existing document with a new upload.
   * Preserves historical auditability without silent overwrites.
   */
  static async replaceDocument(
    documentId: string,
    messId: string,
    userId: string,
    newFile: { buffer: Buffer; originalname: string; mimetype: string }
  ) {
    const existing = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!existing || existing.messId !== messId) {
      throw new NotFoundError('Document not found in this mess');
    }

    // Check if linked to closed period
    await this.assertNotClosedPeriod(existing);

    // 1. Mark existing as REPLACED
    await db.document.update({
      where: { id: documentId },
      data: { status: 'REPLACED' },
    });

    // 2. Upload replacement document
    const replacement = await this.uploadDocument({
      messId,
      userId,
      file: newFile,
      category: existing.category,
      documentType: existing.documentType || undefined,
      visibility: existing.visibility as any,
      entityType: (existing.entityType as any) || undefined,
      entityId: existing.entityId || undefined,
      metadata: {
        replacedDocumentId: existing.id,
        previousFilename: existing.originalFilename,
      },
    });

    // 3. Audit log
    await prisma.auditLog.create({
      data: {
        messId,
        userId,
        action: 'FILE_REPLACED',
        entity: 'Document',
        entityId: replacement.id,
        details: JSON.stringify({
          oldDocumentId: existing.id,
          newDocumentId: replacement.id,
          filename: newFile.originalname,
        }),
      },
    }).catch(() => {});

    return replacement;
  }

  /**
   * Non-destructive archive for documents.
   */
  static async archiveDocument(documentId: string, messId: string, userId: string) {
    const doc = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.messId !== messId) {
      throw new NotFoundError('Document not found in this mess');
    }

    // Check closed period protection
    await this.assertNotClosedPeriod(doc);

    const archived = await db.document.update({
      where: { id: documentId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        messId,
        userId,
        action: 'FILE_ARCHIVED',
        entity: 'Document',
        entityId: doc.id,
        details: JSON.stringify({ filename: doc.originalFilename }),
      },
    }).catch(() => {});

    return archived;
  }

  /**
   * Storage analytics for a mess: total storage, original size vs optimized size, savings.
   */
  static async getStorageAnalytics(messId: string) {
    const docs = await db.document.findMany({
      where: { messId },
      select: {
        category: true,
        fileSize: true,
        originalFileSize: true,
        compressedFileSize: true,
        status: true,
      },
    });

    let totalFiles = docs.length;
    let totalStorageBytes = 0;
    let totalOriginalBytes = 0;
    let archivedFiles = 0;

    const categoryBreakdown: Record<string, { count: number; bytes: number }> = {};

    docs.forEach((d: any) => {
      const bytes = d.compressedFileSize || d.fileSize;
      const orig = d.originalFileSize || bytes;

      totalStorageBytes += bytes;
      totalOriginalBytes += orig;

      if (d.status === 'ARCHIVED') archivedFiles++;

      if (!categoryBreakdown[d.category]) {
        categoryBreakdown[d.category] = { count: 0, bytes: 0 };
      }
      categoryBreakdown[d.category].count++;
      categoryBreakdown[d.category].bytes += bytes;
    });

    const spaceSavedBytes = Math.max(0, totalOriginalBytes - totalStorageBytes);
    const spaceSavedPercent = totalOriginalBytes > 0
      ? Math.round((spaceSavedBytes / totalOriginalBytes) * 100)
      : 0;

    return {
      totalFiles,
      archivedFiles,
      totalStorageBytes,
      totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
      totalOriginalBytes,
      spaceSavedBytes,
      spaceSavedMB: (spaceSavedBytes / (1024 * 1024)).toFixed(2),
      spaceSavedPercent,
      categoryBreakdown,
    };
  }

  /**
   * Detects orphaned files in storage where database metadata is absent.
   */
  static async detectOrphans(messId: string) {
    const prefix = `mess/${messId}`;
    const storageFiles = await StorageService.list('mess-documents', prefix);
    const dbDocs = await db.document.findMany({
      where: { messId },
      select: { storagePath: true },
    });

    const dbPaths = new Set(dbDocs.map((d: any) => d.storagePath));
    const orphans = storageFiles.filter((p: string) => !dbPaths.has(p));

    return {
      totalStorageObjects: storageFiles.length,
      totalDatabaseRecords: dbDocs.length,
      orphanCount: orphans.length,
      orphans,
    };
  }

  /**
   * Closed financial period protection: prevents destructive changes to closed-period financial documents.
   */
  private static async assertNotClosedPeriod(doc: { entityType: string | null; entityId: string | null; messId: string }) {
    if (doc.entityType === 'EXPENSE' && doc.entityId) {
      const expense = await prisma.expense.findUnique({
        where: { id: doc.entityId },
        select: { billingPeriod: true },
      });
      if (expense?.billingPeriod) {
        const period = await prisma.financialPeriod.findFirst({
          where: { messId: doc.messId, periodKey: expense.billingPeriod },
          select: { status: true },
        });
        if (period?.status === 'CLOSED') {
          throw new ForbiddenError(
            'Cannot modify or archive a document attached to a CLOSED financial period.'
          );
        }
      }
    }
  }
}
