import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

let supabaseClient: SupabaseClient | null = null;
const storageKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
if (env.SUPABASE_URL && storageKey) {
  try {
    supabaseClient = createClient(env.SUPABASE_URL, storageKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    logger.info(`📦 Supabase Storage client initialized successfully (${env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role' : 'Anon Key'})`);
  } catch (err: any) {
    logger.warn(`Failed to initialize Supabase client: ${err.message}`);
  }
}

// Local fallback directory for offline development or resilient fallback
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'storage_fallback');
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

export class StorageService {
  /**
   * Upload binary buffer to Supabase Storage with local resilient fallback.
   */
  static async upload(
    bucket: string,
    filePath: string,
    buffer: Buffer,
    contentType: string
  ): Promise<{ path: string; bucket: string; isFallback?: boolean }> {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.storage
          .from(bucket)
          .upload(filePath, buffer, {
            contentType,
            upsert: true,
          });

        if (!error && data) {
          logger.debug(`[SupabaseStorage] Uploaded ${filePath} to ${bucket}`);
          return { path: data.path, bucket };
        } else if (error) {
          logger.warn(`[SupabaseStorage] Upload error: ${error.message}. Attempting resilient fallback.`);
        }
      } catch (err: any) {
        logger.warn(`[SupabaseStorage] Network upload failed: ${err.message}. Using resilient fallback.`);
      }
    }

    // Local resilient fallback
    const targetDir = path.join(LOCAL_STORAGE_DIR, bucket, path.dirname(filePath));
    fs.mkdirSync(targetDir, { recursive: true });
    const localPath = path.join(LOCAL_STORAGE_DIR, bucket, filePath);
    fs.writeFileSync(localPath, buffer);
    logger.debug(`[LocalStorageFallback] Saved file to ${localPath}`);

    return { path: filePath, bucket, isFallback: true };
  }

  /**
   * Download binary buffer from Supabase Storage or fallback.
   */
  static async download(bucket: string, filePath: string): Promise<Buffer> {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.storage.from(bucket).download(filePath);
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch {
        // Fallback below
      }
    }

    // Local fallback check
    const localPath = path.join(LOCAL_STORAGE_DIR, bucket, filePath);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }

    throw new Error(`File not found in storage: ${bucket}/${filePath}`);
  }

  /**
   * Generates a secure, temporary signed URL for private files (default 15 minutes).
   */
  static async getSignedUrl(
    bucket: string,
    filePath: string,
    expiresInSeconds = 900
  ): Promise<string> {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresInSeconds);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (err: any) {
        logger.warn(`Failed to create Supabase signed URL: ${err.message}`);
      }
    }

    // Fallback: direct streaming endpoint
    return `/api/v1/messes/documents/stream?bucket=${bucket}&path=${encodeURIComponent(filePath)}`;
  }

  /**
   * Retrieves public URL for public bucket (e.g. mess-images).
   */
  static getPublicUrl(bucket: string, filePath: string): string {
    if (supabaseClient) {
      const { data } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
      return data.publicUrl;
    }
    return `/storage/${bucket}/${filePath}`;
  }

  /**
   * Delete object from storage.
   */
  static async delete(bucket: string, filePath: string): Promise<void> {
    if (supabaseClient) {
      try {
        await supabaseClient.storage.from(bucket).remove([filePath]);
      } catch (err: any) {
        logger.warn(`Storage delete error: ${err.message}`);
      }
    }

    const localPath = path.join(LOCAL_STORAGE_DIR, bucket, filePath);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }

  /**
   * List files in a bucket with prefix for orphan detection.
   */
  static async list(bucket: string, prefix = ''): Promise<string[]> {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.storage.from(bucket).list(prefix, {
          limit: 1000,
        });
        if (!error && data) {
          return data.map((item: any) => (prefix ? `${prefix}/${item.name}` : item.name));
        }
      } catch {
        // Fallback
      }
    }

    return [];
  }
}
