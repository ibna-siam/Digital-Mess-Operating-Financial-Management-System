import { syncEvents } from './syncEvents.js';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  code: string;
  statusCode: number;
  fields?: Record<string, string[]>;

  constructor(statusCode: number, code: string, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export interface ApiClientOptions extends RequestInit {
  skipCache?: boolean;
  cacheTtlMs?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_CACHE_TTL_MS = 0; // Disable stale response caching to ensure fresh authoritative data
const apiCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Clears the client-side API cache.
 * Optionally provide a prefix to clear only matching endpoints.
 */
export function clearApiCache(prefix?: string): void {
  if (prefix) {
    for (const key of apiCache.keys()) {
      if (key.includes(prefix)) {
        apiCache.delete(key);
      }
    }
  } else {
    apiCache.clear();
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('messmate_token');

  // Invalidate cache on mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    clearApiCache();
  }

  const cacheKey = `${method}:${endpoint}`;
  const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  // 1. In-memory cache hit only if explicit ttl > 0 is provided
  if (method === 'GET' && !options.skipCache && ttl > 0) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }
  }

  // 2. Request deduplication: reuse identical in-flight GET requests
  if (method === 'GET') {
    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        const err = data.error || {};
        throw new ApiError(
          response.status,
          err.code || 'UNKNOWN_ERROR',
          err.message || 'An unexpected error occurred',
          err.fields
        );
      }

      const result = data.data as T;

      // Dispatch real-time cross-page sync event on successful mutation
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        if (endpoint.includes('/expenses')) {
          syncEvents.emit('expenses', result);
          syncEvents.emit('dashboard', result);
        } else if (endpoint.includes('/meals')) {
          syncEvents.emit('meals', result);
          syncEvents.emit('dashboard', result);
        } else if (endpoint.includes('/bazar')) {
          syncEvents.emit('bazar', result);
          syncEvents.emit('dashboard', result);
        } else if (endpoint.includes('/members') || endpoint.includes('/rooms')) {
          syncEvents.emit('members', result);
          syncEvents.emit('dashboard', result);
        } else if (endpoint.includes('/bills') || endpoint.includes('/utilities')) {
          syncEvents.emit('bills', result);
          syncEvents.emit('utilities', result);
          syncEvents.emit('dashboard', result);
        } else if (endpoint.includes('/settlements') || endpoint.includes('/payments') || endpoint.includes('/periods')) {
          syncEvents.emit('settlements', result);
          syncEvents.emit('ledger', result);
          syncEvents.emit('dashboard', result);
        } else if (endpoint.includes('/documents')) {
          syncEvents.emit('documents', result);
        } else if (endpoint.includes('/notifications')) {
          syncEvents.emit('notifications', result);
        }
      }

      // Store successful GET in cache
      if (method === 'GET' && !options.skipCache) {
        apiCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }

      return result;
    } finally {
      if (method === 'GET') {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (method === 'GET' && !options.skipCache) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}
