/**
 * Rate limiting utility for Vercel serverless environment
 * 
 * SETUP REQUIRED:
 * 1. Install Vercel KV: npm install @vercel/kv
 * 2. Create KV store in Vercel Dashboard
 * 3. Link to your project (environment variables auto-configured)
 * 
 * Alternative: Replace with Upstash Redis for more control
 */

interface RateLimitResult {
    success: boolean;
    remaining: number;
    reset?: number;
}

/**
 * Simple in-memory rate limiter (Development fallback)
 * WARNING: This will NOT work across serverless function instances
 * Use only for local development
 */
const memoryStore = new Map<string, { count: number; resetTime: number }>();

function cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, value] of memoryStore.entries()) {
        if (now > value.resetTime) {
            memoryStore.delete(key);
        }
    }
}

/**
 * Rate limit using in-memory store (development only)
 */
export function rateLimitMemory(
    identifier: string,
    maxRequests: number,
    windowMs: number
): RateLimitResult {
    cleanupMemoryStore();

    const now = Date.now();
    const record = memoryStore.get(identifier);

    if (!record || now > record.resetTime) {
        memoryStore.set(identifier, { count: 1, resetTime: now + windowMs });
        return { success: true, remaining: maxRequests - 1, reset: now + windowMs };
    }

    if (record.count >= maxRequests) {
        return { success: false, remaining: 0, reset: record.resetTime };
    }

    record.count++;
    return { success: true, remaining: maxRequests - record.count, reset: record.resetTime };
}

/**
 * Rate limit using Vercel KV (production)
 * Uncomment when Vercel KV is set up
 */
/*
import { kv } from '@vercel/kv';

export async function rateLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number
): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `ratelimit:${identifier}`;
    
    try {
        // Use Redis commands via Vercel KV
        const current = await kv.get<number>(key);
        
        if (!current) {
            await kv.set(key, 1, { px: windowMs });
            return { success: true, remaining: maxRequests - 1, reset: now + windowMs };
        }
        
        if (current >= maxRequests) {
            const ttl = await kv.pttl(key);
            return { success: false, remaining: 0, reset: now + ttl };
        }
        
        await kv.incr(key);
        const ttl = await kv.pttl(key);
        return { success: true, remaining: maxRequests - current - 1, reset: now + ttl };
    } catch (error) {
        console.error('Rate limit error:', error);
        // Gracefully degrade - allow request if KV fails
        return { success: true, remaining: maxRequests };
    }
}
*/

/**
 * Current export (using memory for now)
 * TODO: Switch to Vercel KV version above after setup
 */
export const rateLimit = rateLimitMemory;
