import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate.js';
import { DocumentService } from '../services/documentService.js';
import { sendSuccess } from '../utils/response.js';
import { BadRequestError } from '../utils/errors.js';
import { requirePermission } from '../middleware/rbac.js';

export const documentRouter = Router({ mergeParams: true });

// Multer memory storage configuration (max 20MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
});

const getDocumentsSchema = z.object({
  category: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

// POST /api/v1/messes/:messId/documents/upload — Upload single document
documentRouter.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new BadRequestError('No file provided in multipart request');
      }

      const messId = req.params.messId;
      const userId = req.user!.id;
      const { category, documentType, visibility, entityType, entityId } = req.body;

      const doc = await DocumentService.uploadDocument({
        messId,
        userId,
        file: {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        },
        category,
        documentType,
        visibility,
        entityType,
        entityId,
      });

      sendSuccess(res, doc, 201, 'Document uploaded and optimized successfully');
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/messes/:messId/documents — Paginated list of mess documents
documentRouter.get(
  '/',
  validateRequest({ query: getDocumentsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const userId = req.user!.id;
      const { category, entityType, entityId, status, search, page, limit } = req.query as any;

      const result = await DocumentService.getDocuments({
        messId,
        userId,
        category,
        entityType,
        entityId,
        status,
        search,
        page,
        limit,
      });

      sendSuccess(
        res,
        {
          items: result.data,
          pagination: result.pagination,
        },
        200,
        'Documents retrieved successfully'
      );
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/messes/:messId/documents/analytics — Storage usage analytics
documentRouter.get(
  '/analytics',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const analytics = await DocumentService.getStorageAnalytics(messId);
      sendSuccess(res, analytics, 200, 'Storage analytics retrieved');
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/messes/:messId/documents/orphans — Detect orphaned files (Manager/Owner only)
documentRouter.get(
  '/orphans',
  requirePermission('SETTINGS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const report = await DocumentService.detectOrphans(messId);
      sendSuccess(res, report, 200, 'Orphan files detection report');
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/messes/:messId/documents/entities/:entityType/:entityId — Documents for a specific entity
documentRouter.get(
  '/entities/:entityType/:entityId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const userId = req.user!.id;
      const { entityType, entityId } = req.params;

      const result = await DocumentService.getDocuments({
        messId,
        userId,
        entityType: entityType.toUpperCase(),
        entityId,
      });

      sendSuccess(res, result.data, 200, 'Entity documents retrieved');
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/messes/:messId/documents/:id — Single document detail
documentRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const userId = req.user!.id;
      const documentId = req.params.id;

      const doc = await DocumentService.getDocumentById(documentId, messId, userId);
      sendSuccess(res, doc, 200, 'Document retrieved');
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/messes/:messId/documents/:id/download — Secure download redirect
documentRouter.get(
  '/:id/download',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const userId = req.user!.id;
      const documentId = req.params.id;

      const doc = await DocumentService.getDocumentById(documentId, messId, userId);
      res.redirect(doc.downloadUrl);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/messes/:messId/documents/:id/replace — Replace an existing document
documentRouter.post(
  '/:id/replace',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new BadRequestError('No replacement file provided');
      }

      const messId = req.params.messId;
      const userId = req.user!.id;
      const documentId = req.params.id;

      const replacement = await DocumentService.replaceDocument(documentId, messId, userId, {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      sendSuccess(res, replacement, 200, 'Document replaced successfully');
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/messes/:messId/documents/:id/archive — Archive document
documentRouter.post(
  '/:id/archive',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const userId = req.user!.id;
      const documentId = req.params.id;

      const archived = await DocumentService.archiveDocument(documentId, messId, userId);
      sendSuccess(res, archived, 200, 'Document archived successfully');
    } catch (err) {
      next(err);
    }
  }
);
