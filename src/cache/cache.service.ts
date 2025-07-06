import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    /**
     * Set a value in the cache
     * @param key The cache key
     * @param value The value to store
     * @param ttl Time to live in seconds (optional)
     */
    async set(key: string, value: string, ttl?: number): Promise<void> {
        try {
            await this.cacheManager.set(key, value, ttl);
            this.logger.debug(`Cache set: ${key}`);
        } catch (error) {
            this.logger.error(`Failed to set cache: ${error.message}`, error.stack);
        }
    }

    /**
     * Get a value from the cache
     * @param key The cache key
     * @returns The cached value or null if not found
     */
    async get(key: string): Promise<string | null> {
        try {
            const value = await this.cacheManager.get<string>(key);
            this.logger.debug(`Cache ${value ? 'hit' : 'miss'}: ${key}`);
            return value || null;
        } catch (error) {
            this.logger.error(`Failed to get from cache: ${error.message}`, error.stack);
            return null;
        }
    }

    /**
     * Delete a value from the cache
     * @param key The cache key
     */
    async del(key: string): Promise<void> {
        try {
            await this.cacheManager.del(key);
            this.logger.debug(`Cache deleted: ${key}`);
        } catch (error) {
            this.logger.error(`Failed to delete from cache: ${error.message}`, error.stack);
        }
    }

    /**
     * Reset the entire cache
     */
    async reset(): Promise<void> {
        try {
            await this.cacheManager.reset();
            this.logger.debug('Cache reset');
        } catch (error) {
            this.logger.error(`Failed to reset cache: ${error.message}`, error.stack);
        }
    }
} 