import type { MappingIndex, UserMapping } from '../../types';

/**
 * CDN base URL (jsDelivr)
 */
const CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/palemoky/BiliTube-Wormhole@main/data';

/**
 * Fallback to GitHub raw content
 */
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/palemoky/BiliTube-Wormhole/main/data';

/**
 * Cache TTL in milliseconds (1 hour)
 */
const CACHE_TTL = 3600000;

/**
 * Cached mapping data
 */
interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Mapping client for browser extension
 */
export class MappingClient {
  private b2yIndex: CachedData<MappingIndex> | null = null;
  private y2bIndex: CachedData<MappingIndex> | null = null;
  private mappingCache: Map<string, CachedData<UserMapping>> = new Map();

  /**
   * Fetch with fallback
   */
  private async fetchWithFallback(path: string): Promise<any> {
    try {
      const cdnUrl = `${CDN_BASE_URL}/${path}`;
      const response = await fetch(cdnUrl);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('CDN fetch failed, trying GitHub raw:', error);
    }

    // Fallback to GitHub raw
    const githubUrl = `${GITHUB_RAW_URL}/${path}`;
    const response = await fetch(githubUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid<T>(cached: CachedData<T> | null): boolean {
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_TTL;
  }

  /**
   * Get B2Y index
   */
  private async getB2YIndex(): Promise<MappingIndex> {
    if (this.isCacheValid(this.b2yIndex)) {
      return this.b2yIndex!.data;
    }

    const index = await this.fetchWithFallback('b2y/index.json');
    this.b2yIndex = { data: index, timestamp: Date.now() };
    return index;
  }

  /**
   * Get Y2B index
   */
  private async getY2BIndex(): Promise<MappingIndex> {
    if (this.isCacheValid(this.y2bIndex)) {
      return this.y2bIndex!.data;
    }

    const index = await this.fetchWithFallback('y2b/index.json');
    this.y2bIndex = { data: index, timestamp: Date.now() };
    return index;
  }

  /**
   * Get mapping by Bilibili UID
   */
  async getMappingByBiliUid(uid: string): Promise<UserMapping | null> {
    // Check cache
    const cacheKey = `b2y:${uid}`;
    const cached = this.mappingCache.get(cacheKey) || null;
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      const index = await this.getB2YIndex();
      const shardPath = index[uid];
      if (!shardPath) {
        return null;
      }

      const mapping = await this.fetchWithFallback(`b2y/${shardPath}`);
      this.mappingCache.set(cacheKey, { data: mapping, timestamp: Date.now() });
      return mapping;
    } catch (error) {
      console.error(`Failed to get mapping for Bilibili UID ${uid}:`, error);
      return null;
    }
  }

  /**
   * Get mapping by YouTube channel ID
   */
  async getMappingByYouTubeId(channelId: string): Promise<UserMapping | null> {
    // Check cache
    const cacheKey = `y2b:${channelId}`;
    const cached = this.mappingCache.get(cacheKey) || null;
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      const index = await this.getY2BIndex();
      const shardPath = index[channelId];
      if (!shardPath) {
        return null;
      }

      const mapping = await this.fetchWithFallback(`y2b/${shardPath}`);
      this.mappingCache.set(cacheKey, { data: mapping, timestamp: Date.now() });
      return mapping;
    } catch (error) {
      console.error(`Failed to get mapping for YouTube channel ${channelId}:`, error);
      return null;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.b2yIndex = null;
    this.y2bIndex = null;
    this.mappingCache.clear();
  }
}

/**
 * Singleton instance
 */
export const mappingClient = new MappingClient();
