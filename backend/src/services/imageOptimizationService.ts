import sharp from 'sharp';
import crypto from 'crypto';
import { BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface OptimizedFileResult {
  buffer: Buffer;
  mimeType: string;
  fileExtension: string;
  originalFileSize: number;
  compressedFileSize: number;
  width?: number;
  height?: number;
  checksum: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DOC_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export class ImageOptimizationService {
  /**
   * Validates file signature (magic bytes) to ensure file content matches safe allowed formats.
   */
  static validateMagicBytes(buffer: Buffer, clientMime: string): void {
    if (buffer.length < 4) {
      throw new BadRequestError('Uploaded file is corrupted or empty');
    }

    const header = buffer.subarray(0, 4);

    const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
    const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46; // %PDF
    const isWebP =
      buffer.length >= 12 &&
      header.toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    if (!isJpeg && !isPng && !isPdf && !isWebP) {
      throw new BadRequestError(
        'Invalid or unsupported file format. Allowed formats: JPEG, PNG, WebP, PDF.'
      );
    }

    // Verify claimed MIME type against detected format
    if (isPdf && clientMime !== 'application/pdf') {
      throw new BadRequestError('MIME type mismatch: Expected application/pdf');
    }
  }

  /**
   * Validates file size limits.
   */
  static validateSize(size: number, isPdf: boolean): void {
    const limit = isPdf ? MAX_DOC_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (size > limit) {
      const limitMb = limit / (1024 * 1024);
      throw new BadRequestError(`File size exceeds maximum allowed limit of ${limitMb}MB`);
    }
  }

  /**
   * Processes, resizes, and optimizes uploaded file.
   * Compresses images into WebP (quality 80) while preserving aspect ratio and receipt readability.
   */
  static async processFile(
    buffer: Buffer,
    originalFilename: string,
    clientMime: string,
    options: { maxWidth?: number; maxHeight?: number; isAvatar?: boolean } = {}
  ): Promise<OptimizedFileResult> {
    const isPdf = clientMime === 'application/pdf' || originalFilename.toLowerCase().endsWith('.pdf');

    // 1. Validate size & magic bytes
    this.validateSize(buffer.length, isPdf);
    this.validateMagicBytes(buffer, clientMime);

    const originalFileSize = buffer.length;
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. If PDF, do not compress blindly; preserve vector/text fidelity
    if (isPdf) {
      return {
        buffer,
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        originalFileSize,
        compressedFileSize: originalFileSize,
        checksum,
      };
    }

    // 3. Image Optimization Pipeline via Sharp
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      const maxWidth = options.isAvatar ? 800 : options.maxWidth || 1920;
      const maxHeight = options.isAvatar ? 800 : options.maxHeight || 1920;

      let pipeline = image.rotate(); // Auto-orient based on EXIF

      // Resize if larger than maximum bounds, preserving aspect ratio
      if (
        (metadata.width && metadata.width > maxWidth) ||
        (metadata.height && metadata.height > maxHeight)
      ) {
        pipeline = pipeline.resize({
          width: maxWidth,
          height: maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to WebP with balanced compression (quality 80 retains crisp receipt text)
      const optimizedBuffer = await pipeline
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      const optimizedMeta = await sharp(optimizedBuffer).metadata();

      logger.debug(
        `[ImageOptimization] Processed ${originalFilename}: ${originalFileSize} bytes -> ${optimizedBuffer.length} bytes (-${Math.round(
          ((originalFileSize - optimizedBuffer.length) / originalFileSize) * 100
        )}%)`
      );

      return {
        buffer: optimizedBuffer,
        mimeType: 'image/webp',
        fileExtension: 'webp',
        originalFileSize,
        compressedFileSize: optimizedBuffer.length,
        width: optimizedMeta.width || metadata.width,
        height: optimizedMeta.height || metadata.height,
        checksum,
      };
    } catch (err: any) {
      logger.warn(`[ImageOptimization] Sharp processing failed: ${err.message}. Preserving original.`);
      return {
        buffer,
        mimeType: clientMime,
        fileExtension: originalFilename.split('.').pop()?.toLowerCase() || 'jpg',
        originalFileSize,
        compressedFileSize: originalFileSize,
        checksum,
      };
    }
  }
}
