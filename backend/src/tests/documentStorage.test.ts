import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import { prisma, isDatabaseOnline } from '../config/database.js';
import { DocumentService } from '../services/documentService.js';
import { ImageOptimizationService } from '../services/imageOptimizationService.js';
import { Role, MemberStatus } from '@prisma/client';

describe('Phase 9: Documents, File Management & Supabase Storage Suite', () => {
  let mess1Id: string;
  let mess2Id: string;
  let userAId: string; // Mess 1 Owner/Admin
  let userBId: string; // Mess 1 Member
  let userCId: string; // Mess 2 Foreign User
  let memberAId: string;
  let memberBId: string;
  let memberCId: string;
  let expenseId: string;
  let closedPeriodId: string;
  let closedExpenseId: string;

  beforeAll(async () => {
    if (await isDatabaseOnline()) {
      const unique = `P9_${Date.now()}`;

      // 1. Create Users
      const uA = await prisma.user.create({
        data: {
          email: `p9_admin_${unique}@test.com`,
          passwordHash: 'hash',
          name: 'Siam Document Admin',
          isActive: true,
        },
      });
      userAId = uA.id;

      const uB = await prisma.user.create({
        data: {
          email: `p9_memB_${unique}@test.com`,
          passwordHash: 'hash',
          name: 'Rahim Normal Member',
          isActive: true,
        },
      });
      userBId = uB.id;

      const uC = await prisma.user.create({
        data: {
          email: `p9_memC_${unique}@test.com`,
          passwordHash: 'hash',
          name: 'Foreign Mess User',
          isActive: true,
        },
      });
      userCId = uC.id;

      // 2. Create Mess 1 and Mess 2
      const m1 = await prisma.mess.create({
        data: {
          name: `Phase9 Mess Alpha ${unique}`,
          code: `M1-P9-${unique}`,
          currency: 'BDT',
          currencySymbol: '৳',
          status: 'ACTIVE',
          createdById: userAId,
        },
      });
      mess1Id = m1.id;

      const m2 = await prisma.mess.create({
        data: {
          name: `Phase9 Mess Beta ${unique}`,
          code: `M2-P9-${unique}`,
          currency: 'BDT',
          currencySymbol: '৳',
          status: 'ACTIVE',
          createdById: userCId,
        },
      });
      mess2Id = m2.id;

      // 3. Create Members
      const memA = await prisma.messMember.create({
        data: {
          messId: mess1Id,
          userId: userAId,
          role: Role.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });
      memberAId = memA.id;

      const memB = await prisma.messMember.create({
        data: {
          messId: mess1Id,
          userId: userBId,
          role: Role.MEMBER,
          status: MemberStatus.ACTIVE,
        },
      });
      memberBId = memB.id;

      const memC = await prisma.messMember.create({
        data: {
          messId: mess2Id,
          userId: userCId,
          role: Role.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });
      memberCId = memC.id;

      // 4. Create an active Expense in Mess 1
      const exp = await prisma.expense.create({
        data: {
          messId: mess1Id,
          payerMemberId: memberAId,
          amount: 1200,
          category: 'BAZAR',
          date: new Date(),
          description: 'Grocery bazar supplies',
          status: 'APPROVED',
        },
      });
      expenseId = exp.id;

      // 5. Create a CLOSED Financial Period and an Expense in it
      const closedP = await prisma.financialPeriod.create({
        data: {
          messId: mess1Id,
          year: 2026,
          month: 8,
          periodKey: '2026-08',
          startDate: new Date('2026-08-01'),
          endDate: new Date('2026-08-31'),
          status: 'CLOSED',
        },
      });
      closedPeriodId = closedP.id;

      const closedExp = await prisma.expense.create({
        data: {
          messId: mess1Id,
          payerMemberId: memberAId,
          amount: 3500,
          category: 'RENT',
          date: new Date('2026-08-05'),
          billingPeriod: '2026-08',
          description: 'Historical August Rent',
          status: 'APPROVED',
        },
      });
      closedExpenseId = closedExp.id;
    }
  });

  afterAll(async () => {
    if (await isDatabaseOnline()) {
      try {
        if (mess1Id) {
          await (prisma as any).document.deleteMany({ where: { messId: mess1Id } });
          await prisma.expense.deleteMany({ where: { messId: mess1Id } });
          await prisma.financialPeriod.deleteMany({ where: { messId: mess1Id } });
          await prisma.auditLog.deleteMany({ where: { messId: mess1Id } });
          await prisma.messMember.deleteMany({ where: { messId: mess1Id } });
          await prisma.mess.delete({ where: { id: mess1Id } });
        }
        if (mess2Id) {
          await (prisma as any).document.deleteMany({ where: { messId: mess2Id } });
          await prisma.messMember.deleteMany({ where: { messId: mess2Id } });
          await prisma.mess.delete({ where: { id: mess2Id } });
        }
        if (userAId) await prisma.user.delete({ where: { id: userAId } });
        if (userBId) await prisma.user.delete({ where: { id: userBId } });
        if (userCId) await prisma.user.delete({ where: { id: userCId } });
      } catch (err: any) {
        console.warn('Phase 9 cleanup note:', err.message);
      }
    }
  });

  describe('1. Image Optimization & File Validation Engine', () => {
    it('should validate and optimize an oversized image to WebP preserving aspect ratio', async () => {
      // Generate a 2400x1600 sample PNG buffer (oversized)
      const testBuffer = await sharp({
        create: {
          width: 2400,
          height: 1600,
          channels: 3,
          background: { r: 50, g: 120, b: 200 },
        },
      })
        .png()
        .toBuffer();

      const result = await ImageOptimizationService.processFile(
        testBuffer,
        'grocery-receipt.png',
        'image/png'
      );

      expect(result.mimeType).toBe('image/webp');
      expect(result.fileExtension).toBe('webp');
      // Dimension resized to max 1920 width, keeping 3:2 ratio
      expect(result.width).toBeLessThanOrEqual(1920);
      expect(result.height).toBeLessThanOrEqual(1280);
      expect(result.checksum).toBeDefined();
      expect(result.compressedFileSize).toBeLessThan(result.originalFileSize);
    });

    it('should reject unsupported file types (MIME & magic byte validation)', async () => {
      const fakeExecutable = Buffer.from('MZ\x90\x00\x03\x00\x00\x00fake-windows-binary');

      await expect(
        ImageOptimizationService.processFile(fakeExecutable, 'exploit.exe', 'application/x-msdownload')
      ).rejects.toThrow('Invalid or unsupported file format');
    });

    it('should reject files exceeding maximum size limits', () => {
      const oversizedSize = 25 * 1024 * 1024; // 25MB
      expect(() => ImageOptimizationService.validateSize(oversizedSize, false)).toThrow(
        'File size exceeds maximum allowed limit'
      );
    });

    it('should safely preserve PDF documents without image compression distortion', async () => {
      // Sample mock PDF with standard %PDF magic header
      const mockPdfBuffer = Buffer.from('%PDF-1.4\n%mock pdf stream content\n%%EOF');

      const result = await ImageOptimizationService.processFile(
        mockPdfBuffer,
        'official_notice.pdf',
        'application/pdf'
      );

      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileExtension).toBe('pdf');
      expect(result.compressedFileSize).toBe(mockPdfBuffer.length);
    });
  });

  describe('2. Document Service CRUD & Entity Attachments', () => {
    let uploadedDocId: string;

    it('should upload document, optimize, save in Supabase, and link to an Expense', async () => {
      const sampleReceipt = await sharp({
        create: {
          width: 800,
          height: 1200,
          channels: 3,
          background: { r: 240, g: 240, b: 240 },
        },
      })
        .jpeg()
        .toBuffer();

      const doc = await DocumentService.uploadDocument({
        messId: mess1Id,
        userId: userAId,
        file: {
          buffer: sampleReceipt,
          originalname: 'bazar_invoice_sep18.jpg',
          mimetype: 'image/jpeg',
        },
        category: 'EXPENSE_RECEIPT',
        documentType: 'RECEIPT',
        entityType: 'EXPENSE',
        entityId: expenseId,
      });

      expect(doc.id).toBeDefined();
      expect(doc.originalFilename).toBe('bazar_invoice_sep18.jpg');
      expect(doc.category).toBe('EXPENSE_RECEIPT');
      expect(doc.status).toBe('ACTIVE');
      expect(doc.viewUrl).toBeDefined();

      uploadedDocId = doc.id;

      // Verify Expense was automatically linked
      const updatedExpense = await prisma.expense.findUnique({
        where: { id: expenseId },
      });
      expect(updatedExpense?.receiptUrl).toBe(doc.storagePath);
    });

    it('should query entity documents and return the uploaded receipt', async () => {
      const docs = await DocumentService.getDocuments({
        messId: mess1Id,
        userId: userAId,
        entityType: 'EXPENSE',
        entityId: expenseId,
      });

      expect(docs.data.length).toBe(1);
      expect(docs.data[0].id).toBe(uploadedDocId);
      expect(docs.data[0].category).toBe('EXPENSE_RECEIPT');
    });

    it('should support traceable replacement of an existing document', async () => {
      const replacementImage = await sharp({
        create: {
          width: 600,
          height: 800,
          channels: 3,
          background: { r: 220, g: 255, b: 220 },
        },
      })
        .jpeg()
        .toBuffer();

      const replacement = await DocumentService.replaceDocument(
        uploadedDocId,
        mess1Id,
        userAId,
        {
          buffer: replacementImage,
          originalname: 'bazar_invoice_corrected.jpg',
          mimetype: 'image/jpeg',
        }
      );

      expect(replacement.id).not.toBe(uploadedDocId);
      expect(replacement.status).toBe('ACTIVE');
      expect(replacement.originalFilename).toBe('bazar_invoice_corrected.jpg');

      // Verify old document was marked as REPLACED for historical auditability
      const oldDoc = await (prisma as any).document.findUnique({
        where: { id: uploadedDocId },
      });
      expect(oldDoc?.status).toBe('REPLACED');
    });

    it('should support non-destructive archiving of a document', async () => {
      // Upload a standalone mess document
      const docBuffer = Buffer.from('%PDF-1.4\nmess bylaws\n%%EOF');
      const newDoc = await DocumentService.uploadDocument({
        messId: mess1Id,
        userId: userAId,
        file: {
          buffer: docBuffer,
          originalname: 'mess_bylaws_2026.pdf',
          mimetype: 'application/pdf',
        },
        category: 'MESS_DOCUMENT',
      });

      // Archive document
      const archived = await DocumentService.archiveDocument(newDoc.id, mess1Id, userAId);
      expect(archived.status).toBe('ARCHIVED');
      expect(archived.archivedAt).toBeInstanceOf(Date);

      // Verify still exists in DB for audit trail
      const fromDb = await (prisma as any).document.findUnique({
        where: { id: newDoc.id },
      });
      expect(fromDb?.status).toBe('ARCHIVED');
    });
  });

  describe('3. Multi-Tenant Isolation & Closed Period Protection', () => {
    it('should strictly prevent Mess Beta user from accessing Mess Alpha documents', async () => {
      // Upload private document in Mess 1
      const privateDoc = await DocumentService.uploadDocument({
        messId: mess1Id,
        userId: userAId,
        file: {
          buffer: Buffer.from('%PDF-1.4\nconfidential\n%%EOF'),
          originalname: 'confidential_lease.pdf',
          mimetype: 'application/pdf',
        },
        category: 'MESS_DOCUMENT',
        visibility: 'ADMIN_ONLY',
      });

      // User C from Mess 2 attempts to view document from Mess 1
      await expect(
        DocumentService.getDocumentById(privateDoc.id, mess2Id, userCId)
      ).rejects.toThrow('Document not found in this mess');
    });

    it('should enforce role visibility restrictions for general members', async () => {
      // Create ADMIN_ONLY document in Mess 1
      const adminDoc = await DocumentService.uploadDocument({
        messId: mess1Id,
        userId: userAId,
        file: {
          buffer: Buffer.from('%PDF-1.4\naudit details\n%%EOF'),
          originalname: 'internal_audit_notes.pdf',
          mimetype: 'application/pdf',
        },
        category: 'MESS_DOCUMENT',
        visibility: 'ADMIN_ONLY',
      });

      // Normal member (User B) attempts to access ADMIN_ONLY document
      await expect(
        DocumentService.getDocumentById(adminDoc.id, mess1Id, userBId)
      ).rejects.toThrow('Unauthorized: This document is restricted to managers and owners');
    });

    it('should block destructive operations on documents attached to a CLOSED financial period', async () => {
      // Attach receipt to an expense in the closed August period
      const closedReceipt = await DocumentService.uploadDocument({
        messId: mess1Id,
        userId: userAId,
        file: {
          buffer: Buffer.from('%PDF-1.4\naugust rent receipt\n%%EOF'),
          originalname: 'august_rent_receipt.pdf',
          mimetype: 'application/pdf',
        },
        category: 'EXPENSE_RECEIPT',
        entityType: 'EXPENSE',
        entityId: closedExpenseId,
      });

      // Attempt to archive document from closed period -> must be rejected
      await expect(
        DocumentService.archiveDocument(closedReceipt.id, mess1Id, userAId)
      ).rejects.toThrow('Cannot modify or archive a document attached to a CLOSED financial period');
    });
  });

  describe('4. Storage Analytics & Orphan File Detection', () => {
    it('should compute storage analytics with original vs compressed savings', async () => {
      const analytics = await DocumentService.getStorageAnalytics(mess1Id);

      expect(analytics.totalFiles).toBeGreaterThanOrEqual(1);
      expect(Number(analytics.totalStorageMB)).toBeGreaterThanOrEqual(0);
      expect(analytics.categoryBreakdown).toBeDefined();
      expect(analytics.categoryBreakdown['EXPENSE_RECEIPT']).toBeDefined();
    });

    it('should run orphan file detection without crashing', async () => {
      const orphans = await DocumentService.detectOrphans(mess1Id);

      expect(orphans.totalDatabaseRecords).toBeGreaterThanOrEqual(1);
      expect(orphans.orphanCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(orphans.orphans)).toBe(true);
    });
  });
});
