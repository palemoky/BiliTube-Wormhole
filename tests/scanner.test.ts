import { describe, test, expect, beforeEach } from 'bun:test';
import { UserScanner } from '../src/workflows/scanner';
import type { BilibiliUser, ScanResult } from '../types';

describe('UserScanner', () => {
  const mockBiliApi = {
    getHotRankings: async (): Promise<BilibiliUser[]> => [
      { uid: '111', name: 'User1', face: 'avatar1.jpg', sign: 'bio1', follower: 10000, level: 6 },
      { uid: '222', name: 'User2', face: 'avatar2.jpg', sign: 'bio2', follower: 20000, level: 6 },
    ],
    getMustWatchList: async (): Promise<BilibiliUser[]> => [
      { uid: '333', name: 'User3', face: 'avatar3.jpg', sign: 'bio3', follower: 30000, level: 6 },
      { uid: '444', name: 'User4', face: 'avatar4.jpg', sign: 'bio4', follower: 40000, level: 6 },
    ],
    getTop100Creators: async (): Promise<BilibiliUser[]> => [
      { uid: '555', name: 'User5', face: 'avatar5.jpg', sign: 'bio5', follower: 100000, level: 6 },
      { uid: '666', name: 'User6', face: 'avatar6.jpg', sign: 'bio6', follower: 200000, level: 6 },
    ],
  } as any;

  let scanner: UserScanner;

  beforeEach(() => {
    scanner = new UserScanner(mockBiliApi);
  });

  describe('scanHotRankings', () => {
    test('should return scan result from hot rankings', async () => {
      const result = await scanner.scanHotRankings();

      expect(result.type).toBe('hot');
      expect(result.totalScanned).toBe(2);
      expect(result.scannedAt).toBeDefined();
      expect(Array.isArray(result.users)).toBe(true);
    });
  });

  describe('scanMustWatchList', () => {
    test('should return scan result from must-watch list', async () => {
      const result = await scanner.scanMustWatchList();

      expect(result.type).toBe('must-watch');
      expect(result.totalScanned).toBe(2);
      expect(result.scannedAt).toBeDefined();
      expect(Array.isArray(result.users)).toBe(true);
    });
  });

  describe('scanTop100', () => {
    test('should return scan result from top 100 creators', async () => {
      const result = await scanner.scanTop100();

      expect(result.type).toBe('top-100');
      expect(result.totalScanned).toBe(2);
      expect(result.scannedAt).toBeDefined();
      expect(Array.isArray(result.users)).toBe(true);
    });
  });

  describe('deduplicateUsers', () => {
    test('should remove duplicate users', () => {
      const results: ScanResult[] = [
        {
          type: 'hot',
          users: [
            { uid: '111', name: 'User1', face: 'avatar1.jpg', sign: 'bio1', follower: 10000, level: 6 },
            { uid: '222', name: 'User2', face: 'avatar2.jpg', sign: 'bio2', follower: 20000, level: 6 },
          ],
          scannedAt: '2024-01-01T00:00:00.000Z',
          totalScanned: 2,
          newUsers: 2,
        },
        {
          type: 'must-watch',
          users: [
            { uid: '111', name: 'User1', face: 'avatar1.jpg', sign: 'bio1', follower: 10000, level: 6 }, // duplicate
            { uid: '333', name: 'User3', face: 'avatar3.jpg', sign: 'bio3', follower: 30000, level: 6 },
          ],
          scannedAt: '2024-01-01T00:00:00.000Z',
          totalScanned: 2,
          newUsers: 2,
        },
      ];

      const deduplicated = scanner.deduplicateUsers(results);

      expect(deduplicated).toHaveLength(3);
      expect(deduplicated.map(u => u.uid)).toEqual(['111', '222', '333']);
    });

    test('should handle empty array', () => {
      const deduplicated = scanner.deduplicateUsers([]);
      expect(deduplicated).toHaveLength(0);
    });
  });

  describe('runDailyScan', () => {
    test('should scan hot rankings when not cold start', async () => {
      const results = await scanner.runDailyScan({ coldStart: false, maxUsers: 100, delayMs: 1000 });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.type).toBe('hot');
      expect(results[0]!.totalScanned).toBeGreaterThan(0);
    });

    test('should scan must-watch and top 100 on cold start', async () => {
      const results = await scanner.runDailyScan({ coldStart: true, maxUsers: 100, delayMs: 1000 });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0]!.type).toBe('top-100');
      expect(results[1]!.type).toBe('must-watch');
    });
  });
});
