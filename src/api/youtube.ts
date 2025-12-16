import type { YouTubeChannel, YouTubeVideo } from '../../types';

/**
 * YouTube Data API v3 client
 */
export class YouTubeAPI {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make API request
   */
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.append('key', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value.toString());
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      throw new Error(`YouTube API error: ${data.error.message}`);
    }

    return data as T;
  }

  /**
   * Get channel information
   */
  async getChannel(channelId: string): Promise<YouTubeChannel> {
    const data = await this.request<any>('channels', {
      part: 'snippet,statistics,status',
      id: channelId,
    });

    if (!data.items || data.items.length === 0) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const item = data.items[0];

    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      customUrl: item.snippet.customUrl,
      thumbnails: {
        default: item.snippet.thumbnails.default.url,
        medium: item.snippet.thumbnails.medium.url,
        high: item.snippet.thumbnails.high.url,
      },
      subscriberCount: parseInt(item.statistics.subscriberCount || '0'),
      videoCount: parseInt(item.statistics.videoCount || '0'),
      verified: item.status?.isLinked || false,
    };
  }

  /**
   * Search channels by keyword
   */
  async searchChannels(query: string, maxResults: number = 10): Promise<YouTubeChannel[]> {
    const data = await this.request<any>('search', {
      part: 'snippet',
      type: 'channel',
      q: query,
      maxResults,
    });

    const channelIds = data.items.map((item: any) => item.id.channelId);

    // Get full channel details
    const channels: YouTubeChannel[] = [];
    for (const channelId of channelIds) {
      try {
        const channel = await this.getChannel(channelId);
        channels.push(channel);
      } catch (error) {
        console.error(`Failed to get channel ${channelId}:`, error);
      }
    }

    return channels;
  }

  /**
   * Get channel's videos
   */
  async getChannelVideos(channelId: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    const data = await this.request<any>('search', {
      part: 'snippet',
      channelId,
      type: 'video',
      order: 'date',
      maxResults,
    });

    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnails: {
        default: item.snippet.thumbnails.default.url,
        medium: item.snippet.thumbnails.medium.url,
        high: item.snippet.thumbnails.high.url,
      },
      duration: '',
      viewCount: 0,
    }));
  }

  /**
   * Get video details
   */
  async getVideo(videoId: string): Promise<YouTubeVideo> {
    const data = await this.request<any>('videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoId,
    });

    if (!data.items || data.items.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const item = data.items[0];

    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnails: {
        default: item.snippet.thumbnails.default.url,
        medium: item.snippet.thumbnails.medium.url,
        high: item.snippet.thumbnails.high.url,
      },
      duration: item.contentDetails.duration,
      viewCount: parseInt(item.statistics.viewCount || '0'),
    };
  }

  /**
   * Get video comments (as danmaku alternative)
   */
  async getVideoComments(videoId: string, maxResults: number = 100): Promise<any[]> {
    try {
      const data = await this.request<any>('commentThreads', {
        part: 'snippet',
        videoId,
        maxResults,
        order: 'time',
      });

      return data.items.map((item: any) => ({
        id: item.id,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
        likeCount: item.snippet.topLevelComment.snippet.likeCount,
      }));
    } catch (error) {
      // Comments may be disabled
      console.error(`Failed to get comments for ${videoId}:`, error);
      return [];
    }
  }

  /**
   * Check if channel is verified
   */
  async isChannelVerified(channelId: string): Promise<boolean> {
    try {
      const channel = await this.getChannel(channelId);
      return channel.verified || false;
    } catch (_error) {
      return false;
    }
  }
}

/**
 * YouTube API quota manager
 * Free tier: 10,000 units/day
 * - search: ~100 units
 * - channels.list: 1 unit
 * - videos.list: 1 unit
 * - commentThreads.list: 1 unit
 */
export class QuotaManager {
  private usedQuota = 0;
  private dailyLimit = 10000;
  private lastReset = new Date();

  /**
   * Track quota usage
   */
  trackUsage(operation: 'search' | 'channels' | 'videos' | 'comments'): void {
    const costs = {
      search: 100,
      channels: 1,
      videos: 1,
      comments: 1,
    };

    this.usedQuota += costs[operation];
    this.checkReset();
  }

  /**
   * Check if quota is available
   */
  hasQuota(operation: 'search' | 'channels' | 'videos' | 'comments'): boolean {
    this.checkReset();

    const costs = {
      search: 100,
      channels: 1,
      videos: 1,
      comments: 1,
    };

    return this.usedQuota + costs[operation] <= this.dailyLimit;
  }

  /**
   * Get remaining quota
   */
  getRemainingQuota(): number {
    this.checkReset();
    return this.dailyLimit - this.usedQuota;
  }

  /**
   * Reset quota if 24 hours have passed
   */
  private checkReset(): void {
    const now = new Date();
    const hoursSinceReset = (now.getTime() - this.lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      this.usedQuota = 0;
      this.lastReset = now;
    }
  }
}
