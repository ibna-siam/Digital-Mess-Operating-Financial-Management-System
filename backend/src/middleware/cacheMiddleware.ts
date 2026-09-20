import { Request, Response, NextFunction } from 'express';

interface CacheItem {
  body: any;
  timestamp: number;
}

const responseCache = new Map<string, CacheItem>();
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Clears the backend response cache.
 * Optionally provide a substring (e.g. messId) to invalidate selectively.
 */
export function invalidateBackendCache(pattern?: string): void {
  if (pattern) {
    for (const key of responseCache.keys()) {
      if (key.includes(pattern)) {
        responseCache.delete(key);
      }
    }
  } else {
    responseCache.clear();
  }
}

/**
 * High-performance in-memory caching middleware for Express read routes.
 * Caches successful 200 GET JSON responses for CACHE_TTL_MS.
 * Automatically clears cache on mutations (POST, PUT, PATCH, DELETE).
 */
export function apiCacheMiddleware(ttlMs: number = CACHE_TTL_MS) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const method = req.method.toUpperCase();

    // Auto-invalidate cache on mutations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const messId = req.params?.messId || req.messId;
      invalidateBackendCache(messId);
      return next();
    }

    if (method !== 'GET') {
      return next();
    }

    // Cache key incorporates user ID (for RBAC isolation) and the full request URL
    const userId = req.user?.id || 'public';
    const cacheKey = `${userId}:${req.originalUrl}`;

    const cached = responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < ttlMs)) {
      res.setHeader('X-Response-Cache', 'HIT');
      res.json(cached.body);
      return;
    }

    // Intercept res.json to populate cache
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        responseCache.set(cacheKey, {
          body,
          timestamp: Date.now(),
        });
      }
      res.setHeader('X-Response-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}
