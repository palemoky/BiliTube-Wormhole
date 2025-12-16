import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ShardManager } from '../src/storage/shard-manager';
import type { UserMapping } from '../types';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

describe('ShardManager', () => {
  const testDataDir = './test-data';
  let shardManager: ShardManager;

  beforeEach(async () => {
    // Clean up test directory
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true });
    }
    await mkdir(testDataDir, { recursive: true });

    // Use correct constructor: new ShardManager(baseDir: string, config?: ShardConfig)
    shardManager = new ShardManager(testDataDir);
  });

  afterEach(async () => {
    // Clean up after tests
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true });
    }
  });

  describe('hash', () => {
    test('should generate consistent SHA-256 hash', () => {
      const hash1 = (shardManager as any).hash('test123');
      const hash2 = (shardManager as any).hash('test123');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8); // Default hashLength is 8
    });

    test('should generate different hashes for different inputs', () => {
      const hash1 = (shardManager as any).hash('test123');
      const hash2 = (shardManager as any).hash('test456');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getShardPath', () => {
    test('should generate correct shard path', () => {
      const uid = '123456';
      const path = shardManager.getShardPath(uid);
      
      // Should be in format: ab/cd/abcdef12.json
      const parts = path.split('/');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(2);
      expect(parts[1]).toHaveLength(2);
      expect(parts[2]).toEndWith('.json');
    });

    test('should generate consistent paths for same UID', () => {
      const uid = '123456';
      const path1 = shardManager.getShardPath(uid);
      const path2 = shardManager.getShardPath(uid);
      expect(path1).toBe(path2);
    });
  });

  describe('writeMapping and readMapping', () => {
    test('should write and read mapping successfully', async () => {
      const uid = '123456';
      const mapping: UserMapping = {
        bilibiliUid: uid,
        bilibiliUsername: 'TestUser',
        bilibiliAvatar: 'https://example.com/avatar.jpg',
        youtubeChannelId: 'UCtest123',
        youtubeChannelName: 'Test Channel',
        youtubeAvatar: 'https://example.com/yt-avatar.jpg',
        verificationLevel: 1,
        verifiedAt: '2024-01-01T00:00:00.000Z',
        verifiedBy: 'auto',
        metadata: {
          bilibiliFollowers: 10000,
          youtubeSubscribers: 5000,
        },
      };

      await shardManager.writeMapping(uid, mapping);
      const retrieved = await shardManager.readMapping(uid);

      expect(retrieved).toEqual(mapping);
    });

    test('should return null for non-existent mapping', async () => {
      const retrieved = await shardManager.readMapping('nonexistent');
      expect(retrieved).toBeNull();
    });

    test('should overwrite existing mapping', async () => {
      const uid = '123456';
      const mapping1: UserMapping = {
        bilibiliUid: uid,
        bilibiliUsername: 'User1',
        bilibiliAvatar: 'avatar1.jpg',
        youtubeChannelId: 'UC1',
        youtubeChannelName: 'Channel1',
        youtubeAvatar: 'yt1.jpg',
        verificationLevel: 1,
        verifiedAt: '2024-01-01T00:00:00.000Z',
        verifiedBy: 'auto',
        metadata: {},
      };

      const mapping2: UserMapping = {
        ...mapping1,
        bilibiliUsername: 'User2',
      };

      await shardManager.writeMapping(uid, mapping1);
      await shardManager.writeMapping(uid, mapping2);
      
      const retrieved = await shardManager.readMapping(uid);
      expect(retrieved?.bilibiliUsername).toBe('User2');
    });
  });

  describe('deleteMapping', () => {
    test('should delete existing mapping', async () => {
      const uid = '123456';
      const mapping: UserMapping = {
        bilibiliUid: uid,
        bilibiliUsername: 'TestUser',
        bilibiliAvatar: 'avatar.jpg',
        youtubeChannelId: 'UCtest',
        youtubeChannelName: 'Test',
        youtubeAvatar: 'yt.jpg',
        verificationLevel: 1,
        verifiedAt: '2024-01-01T00:00:00.000Z',
        verifiedBy: 'auto',
        metadata: {},
      };

      await shardManager.writeMapping(uid, mapping);
      const exists1 = await shardManager.hasMapping(uid);
      expect(exists1).toBe(true);

      await shardManager.deleteMapping(uid);
      
      // After deletion, file should be empty or not exist
      const retrieved = await shardManager.readMapping(uid);
      expect(retrieved).toBeNull();
    });

    test('should handle deleting non-existent mapping gracefully', async () => {
      // deleteMapping should complete without error even if file doesn't exist
      await shardManager.deleteMapping('nonexistent');
      // If we get here, it didn't throw
      expect(true).toBe(true);
    });
  });

  describe('hasMapping', () => {
    test('should return true for existing mapping', async () => {
      const uid = '123456';
      const mapping: UserMapping = {
        bilibiliUid: uid,
        bilibiliUsername: 'TestUser',
        bilibiliAvatar: 'avatar.jpg',
        youtubeChannelId: 'UCtest',
        youtubeChannelName: 'Test',
        youtubeAvatar: 'yt.jpg',
        verificationLevel: 1,
        verifiedAt: '2024-01-01T00:00:00.000Z',
        verifiedBy: 'auto',
        metadata: {},
      };

      await shardManager.writeMapping(uid, mapping);
      expect(await shardManager.hasMapping(uid)).toBe(true);
    });

    test('should return false for non-existent mapping', async () => {
      expect(await shardManager.hasMapping('nonexistent')).toBe(false);
    });
  });

  describe('buildIndex', () => {
    test('should build index with all mappings', async () => {
      const mappings = [
        { uid: '111', name: 'User1', ytId: 'UC1' },
        { uid: '222', name: 'User2', ytId: 'UC2' },
        { uid: '333', name: 'User3', ytId: 'UC3' },
      ];

      for (const { uid, name, ytId } of mappings) {
        await shardManager.writeMapping(uid, {
          bilibiliUid: uid,
          bilibiliUsername: name,
          bilibiliAvatar: 'avatar.jpg',
          youtubeChannelId: ytId,
          youtubeChannelName: 'Channel',
          youtubeAvatar: 'yt.jpg',
          verificationLevel: 1,
          verifiedAt: '2024-01-01T00:00:00.000Z',
          verifiedBy: 'auto',
          metadata: {},
        });
      }

      const index = await shardManager.buildIndex();
      
      // Index should have entries for both directions
      expect(Object.keys(index).length).toBeGreaterThanOrEqual(3);
      expect(index['111']).toBeDefined();
      expect(index['UC1']).toBeDefined();
    });
  });

  describe('batchWrite', () => {
    test('should write multiple mappings efficiently', async () => {
      const mappings = [
        {
          userId: '111',
          mapping: {
            bilibiliUid: '111',
            bilibiliUsername: 'User1',
            bilibiliAvatar: 'avatar1.jpg',
            youtubeChannelId: 'UC1',
            youtubeChannelName: 'Channel1',
            youtubeAvatar: 'yt1.jpg',
            verificationLevel: 1 as const,
            verifiedAt: '2024-01-01T00:00:00.000Z',
            verifiedBy: 'auto' as const,
            metadata: {},
          },
        },
        {
          userId: '222',
          mapping: {
            bilibiliUid: '222',
            bilibiliUsername: 'User2',
            bilibiliAvatar: 'avatar2.jpg',
            youtubeChannelId: 'UC2',
            youtubeChannelName: 'Channel2',
            youtubeAvatar: 'yt2.jpg',
            verificationLevel: 2 as const,
            verifiedAt: '2024-01-01T00:00:00.000Z',
            verifiedBy: 'auto' as const,
            metadata: {},
          },
        },
      ];

      await shardManager.batchWrite(mappings);

      expect(await shardManager.hasMapping('111')).toBe(true);
      expect(await shardManager.hasMapping('222')).toBe(true);
      
      const mapping1 = await shardManager.readMapping('111');
      expect(mapping1?.bilibiliUsername).toBe('User1');
    });
  });
});
