import { describe, test, expect } from 'bun:test';
import { MappingClient } from '../src/utils/mapping-client';

describe('MappingClient', () => {
  describe('cache management', () => {
    test('should cache mappings with TTL', async () => {
      const client = new MappingClient();

      // Mock fetch to track calls
      let fetchCallCount = 0;
      const originalFetch = global.fetch;
      global.fetch = (async (url: string | URL | Request) => {
        fetchCallCount++;
        const urlStr = url.toString();

        if (urlStr.includes('index.json')) {
          return new Response(
            JSON.stringify({
              '123456': '12/34/12345678.json',
            }),
            { status: 200 }
          );
        }

        return new Response(
          JSON.stringify({
            bilibiliUid: '123456',
            bilibiliUsername: 'TestUser',
            bilibiliAvatar: 'avatar.jpg',
            youtubeChannelId: 'UCtest',
            youtubeChannelName: 'Test',
            youtubeAvatar: 'yt.jpg',
            verificationLevel: 1,
            verifiedAt: '2024-01-01T00:00:00.000Z',
            verifiedBy: 'auto',
            metadata: {},
          }),
          { status: 200 }
        );
      }) as typeof fetch;

      // First call should fetch
      await client.getMappingByBiliUid('123456');
      const firstCallCount = fetchCallCount;

      // Second call should use cache
      await client.getMappingByBiliUid('123456');
      expect(fetchCallCount).toBe(firstCallCount);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('getMappingByBiliUid', () => {
    test('should return null for non-existent mapping', async () => {
      const client = new MappingClient();

      const originalFetch = global.fetch;
      global.fetch = (async () => {
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch;

      const result = await client.getMappingByBiliUid('nonexistent');
      expect(result).toBeNull();

      global.fetch = originalFetch;
    });

    test('should fetch from CDN first', async () => {
      const client = new MappingClient();

      let cdnCalled = false;
      const originalFetch = global.fetch;
      global.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('cdn.jsdelivr.net')) {
          cdnCalled = true;
        }

        if (urlStr.includes('index.json')) {
          return new Response(
            JSON.stringify({
              '123456': '12/34/12345678.json',
            }),
            { status: 200 }
          );
        }

        return new Response(
          JSON.stringify({
            bilibiliUid: '123456',
            bilibiliUsername: 'TestUser',
            bilibiliAvatar: 'avatar.jpg',
            youtubeChannelId: 'UCtest',
            youtubeChannelName: 'Test',
            youtubeAvatar: 'yt.jpg',
            verificationLevel: 1,
            verifiedAt: '2024-01-01T00:00:00.000Z',
            verifiedBy: 'auto',
            metadata: {},
          }),
          { status: 200 }
        );
      }) as typeof fetch;

      await client.getMappingByBiliUid('123456');
      expect(cdnCalled).toBe(true);

      global.fetch = originalFetch;
    });
  });

  describe('getMappingByYouTubeId', () => {
    test('should return null for non-existent mapping', async () => {
      const client = new MappingClient();

      const originalFetch = global.fetch;
      global.fetch = (async () => {
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch;

      const result = await client.getMappingByYouTubeId('nonexistent');
      expect(result).toBeNull();

      global.fetch = originalFetch;
    });
  });

  describe('error handling', () => {
    test('should return null on network error', async () => {
      const client = new MappingClient();

      const originalFetch = global.fetch;
      global.fetch = (async () => {
        throw new Error('Network error');
      }) as unknown as typeof fetch;

      const result = await client.getMappingByBiliUid('123456');
      expect(result).toBeNull();

      global.fetch = originalFetch;
    });

    test('should return null on invalid JSON', async () => {
      const client = new MappingClient();

      const originalFetch = global.fetch;
      global.fetch = (async () => {
        return new Response('invalid json', { status: 200 });
      }) as unknown as typeof fetch;

      const result = await client.getMappingByBiliUid('123456');
      expect(result).toBeNull();

      global.fetch = originalFetch;
    });
  });

  describe('clearCache', () => {
    test('should clear all caches', async () => {
      const client = new MappingClient();

      const originalFetch = global.fetch;
      let fetchCount = 0;
      global.fetch = (async (url: string | URL | Request) => {
        fetchCount++;
        const urlStr = url.toString();

        if (urlStr.includes('index.json')) {
          return new Response(
            JSON.stringify({
              '123456': '12/34/12345678.json',
            }),
            { status: 200 }
          );
        }

        return new Response(
          JSON.stringify({
            bilibiliUid: '123456',
            bilibiliUsername: 'TestUser',
            bilibiliAvatar: 'avatar.jpg',
            youtubeChannelId: 'UCtest',
            youtubeChannelName: 'Test',
            youtubeAvatar: 'yt.jpg',
            verificationLevel: 1,
            verifiedAt: '2024-01-01T00:00:00.000Z',
            verifiedBy: 'auto',
            metadata: {},
          }),
          { status: 200 }
        );
      }) as typeof fetch;

      // First fetch
      await client.getMappingByBiliUid('123456');
      const firstCount = fetchCount;

      // Clear cache
      client.clearCache();

      // Should fetch again
      await client.getMappingByBiliUid('123456');
      expect(fetchCount).toBeGreaterThan(firstCount);

      global.fetch = originalFetch;
    });
  });
});
