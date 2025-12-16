import { describe, test, expect, mock } from 'bun:test';
import { UserVerifier } from '../src/workflows/verifier';
import type { BilibiliUser, YouTubeChannel } from '../types';

describe('UserVerifier', () => {
  // Mock API clients
  const mockBiliApi = {
    getUserInfo: mock(
      async (uid: string): Promise<BilibiliUser> => ({
        uid,
        name: 'TestUser',
        face: 'https://example.com/avatar.jpg',
        sign: 'Test bio',
        follower: 10000,
        level: 6,
      })
    ),
    getUserVideos: mock(async () => [
      {
        bvid: 'BV1',
        aid: 1,
        title: 'Test Video 1',
        pic: 'pic1.jpg',
        author: 'TestUser',
        mid: '123',
        created: 1234567890,
        length: '10:00',
        play: 1000,
        danmaku: 100,
      },
    ]),
  } as any;

  const mockYtApi = {
    getChannel: mock(
      async (id: string): Promise<YouTubeChannel> => ({
        id,
        title: 'Test Channel',
        description: 'Test description',
        customUrl: '@testchannel',
        thumbnails: {
          default: 'thumb-default.jpg',
          medium: 'thumb-medium.jpg',
          high: 'thumb-high.jpg',
        },
        subscriberCount: 5000,
        videoCount: 100,
        verified: false,
      })
    ),
    getChannelVideos: mock(async () => [
      {
        id: 'vid1',
        title: 'Test Video 1',
        description: 'desc',
        channelId: 'UCtest',
        channelTitle: 'Test',
        publishedAt: '2024-01-01T00:00:00Z',
        thumbnails: {
          default: 'thumb.jpg',
          medium: 'thumb.jpg',
          high: 'thumb.jpg',
        },
        duration: 'PT10M',
        viewCount: 1000,
      },
    ]),
    isChannelVerified: mock(async () => false),
  } as any;

  describe('verify - Level 1 (YouTube Verified + Name Match)', () => {
    test('should verify with high confidence when YouTube is verified and names match', async () => {
      const verifier = new UserVerifier(mockBiliApi, mockYtApi);

      // Mock verified channel with matching name
      mockYtApi.getChannel.mockResolvedValueOnce({
        id: 'UCtest',
        title: 'TestUser',
        description: 'Test',
        customUrl: '@test',
        thumbnails: { default: '', medium: '', high: '' },
        subscriberCount: 5000,
        videoCount: 100,
        verified: true,
      });

      const result = await verifier.verify('123456', 'UCtest');

      expect(result.success).toBe(true);
      expect(result.level).toBe(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.metadata?.youtubeVerified).toBe(true);
    });

    test('should not verify as Level 1 if names do not match', async () => {
      const verifier = new UserVerifier(mockBiliApi, mockYtApi);

      mockYtApi.getChannel.mockResolvedValueOnce({
        id: 'UCtest',
        title: 'CompletelyDifferentName',
        description: 'Test',
        customUrl: '@test',
        thumbnails: { default: '', medium: '', high: '' },
        subscriberCount: 5000,
        videoCount: 100,
        verified: true,
      });

      const result = await verifier.verify('123456', 'UCtest');

      expect(result.level).not.toBe(1);
    });
  });

  describe('verify - Level 2 (Bio Match)', () => {
    test('should verify when Bilibili bio mentions YouTube', async () => {
      const verifier = new UserVerifier(mockBiliApi, mockYtApi);

      mockBiliApi.getUserInfo.mockResolvedValueOnce({
        uid: '123456',
        name: 'TestUser',
        face: 'avatar.jpg',
        sign: 'Check out my YouTube channel: UCtest123',
        follower: 10000,
        level: 6,
      });

      mockYtApi.getChannel.mockResolvedValueOnce({
        id: 'UCtest123',
        title: 'Test Channel',
        description: 'Test',
        customUrl: '@test',
        thumbnails: { default: '', medium: '', high: '' },
        subscriberCount: 5000,
        videoCount: 100,
        verified: false,
      });

      const result = await verifier.verify('123456', 'UCtest123');

      expect(result.success).toBe(true);
      expect(result.level).toBe(2);
      expect(result.confidence).toBe(0.85);
      expect(result.metadata?.bioMatch).toBe(true);
    });

    test('should verify when YouTube description mentions Bilibili', async () => {
      const verifier = new UserVerifier(mockBiliApi, mockYtApi);

      mockBiliApi.getUserInfo.mockResolvedValueOnce({
        uid: '123456',
        name: 'TestUser',
        face: 'avatar.jpg',
        sign: 'Regular bio',
        follower: 10000,
        level: 6,
      });

      mockYtApi.getChannel.mockResolvedValueOnce({
        id: 'UCtest',
        title: 'Test Channel',
        description: 'Follow me on Bilibili: 123456',
        customUrl: '@test',
        thumbnails: { default: '', medium: '', high: '' },
        subscriberCount: 5000,
        videoCount: 100,
        verified: false,
      });

      const result = await verifier.verify('123456', 'UCtest');

      expect(result.success).toBe(true);
      expect(result.level).toBe(2);
      expect(result.metadata?.bioMatch).toBe(true);
    });
  });

  describe('verify - Level 3 (Similarity-based)', () => {
    test('should verify with sufficient similarity scores', async () => {
      const verifier = new UserVerifier(mockBiliApi, mockYtApi);

      mockBiliApi.getUserInfo.mockResolvedValueOnce({
        uid: '123456',
        name: 'TestUser',
        face: 'avatar.jpg',
        sign: 'Regular bio',
        follower: 10000,
        level: 6,
      });

      mockYtApi.getChannel.mockResolvedValueOnce({
        id: 'UCtest',
        title: 'TestUser',
        description: 'Regular description',
        customUrl: '@testuser',
        thumbnails: { default: '', medium: '', high: '' },
        subscriberCount: 8000,
        videoCount: 100,
        verified: false,
      });

      mockBiliApi.getUserVideos.mockResolvedValueOnce([
        {
          bvid: 'BV1',
          aid: 1,
          title: 'My First Video',
          pic: '',
          author: 'TestUser',
          mid: '123456',
          created: 0,
          length: '10:00',
          play: 1000,
          danmaku: 100,
        },
        {
          bvid: 'BV2',
          aid: 2,
          title: 'Second Video',
          pic: '',
          author: 'TestUser',
          mid: '123456',
          created: 0,
          length: '10:00',
          play: 1000,
          danmaku: 100,
        },
        {
          bvid: 'BV3',
          aid: 3,
          title: 'Third Video',
          pic: '',
          author: 'TestUser',
          mid: '123456',
          created: 0,
          length: '10:00',
          play: 1000,
          danmaku: 100,
        },
      ]);

      mockYtApi.getChannelVideos.mockResolvedValueOnce([
        {
          id: 'v1',
          title: 'My First Video',
          description: '',
          channelId: 'UCtest',
          channelTitle: 'TestUser',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnails: { default: '', medium: '', high: '' },
          duration: 'PT10M',
          viewCount: 1000,
        },
        {
          id: 'v2',
          title: 'Second Video',
          description: '',
          channelId: 'UCtest',
          channelTitle: 'TestUser',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnails: { default: '', medium: '', high: '' },
          duration: 'PT10M',
          viewCount: 1000,
        },
        {
          id: 'v3',
          title: 'Third Video',
          description: '',
          channelId: 'UCtest',
          channelTitle: 'TestUser',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnails: { default: '', medium: '', high: '' },
          duration: 'PT10M',
          viewCount: 1000,
        },
      ]);

      const result = await verifier.verify('123456', 'UCtest');

      expect(result.success).toBe(true);
      expect(result.level).toBe(3);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.metadata?.matchingVideos).toBeGreaterThanOrEqual(3);
    });
  });

  describe('verify - Level 4 (Manual Review)', () => {
    test('should require manual review when confidence is low', async () => {
      const verifier = new UserVerifier(mockBiliApi, mockYtApi);

      mockBiliApi.getUserInfo.mockResolvedValueOnce({
        uid: '123456',
        name: 'TestUser',
        face: 'avatar.jpg',
        sign: 'Regular bio',
        follower: 10000,
        level: 6,
      });

      mockYtApi.getChannel.mockResolvedValueOnce({
        id: 'UCtest',
        title: 'CompletelyDifferentName',
        description: 'No mentions',
        customUrl: '@different',
        thumbnails: { default: '', medium: '', high: '' },
        subscriberCount: 100000,
        videoCount: 100,
        verified: false,
      });

      mockBiliApi.getUserVideos.mockResolvedValueOnce([
        {
          bvid: 'BV1',
          aid: 1,
          title: 'Unrelated Video',
          pic: '',
          author: 'TestUser',
          mid: '123456',
          created: 0,
          length: '10:00',
          play: 1000,
          danmaku: 100,
        },
      ]);

      mockYtApi.getChannelVideos.mockResolvedValueOnce([
        {
          id: 'v1',
          title: 'Different Content',
          description: '',
          channelId: 'UCtest',
          channelTitle: 'Different',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnails: { default: '', medium: '', high: '' },
          duration: 'PT10M',
          viewCount: 1000,
        },
      ]);

      const result = await verifier.verify('123456', 'UCtest');

      expect(result.success).toBe(false);
      expect(result.level).toBe(4);
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('error handling', () => {
    test('should handle API errors gracefully', async () => {
      const verifier = new UserVerifier(mockBiliApi, mockYtApi);

      mockBiliApi.getUserInfo.mockRejectedValueOnce(new Error('API Error'));

      const result = await verifier.verify('123456', 'UCtest');

      expect(result.success).toBe(false);
      expect(result.level).toBe(4);
      expect(result.confidence).toBe(0);
      expect(result.reasons[0]).toContain('Verification failed');
    });
  });
});
