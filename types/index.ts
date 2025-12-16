/**
 * Core type definitions for BiliTube-Wormhole
 */

/**
 * User mapping between Bilibili and YouTube
 */
export interface UserMapping {
  /** Bilibili user ID */
  bilibiliUid: string;
  /** Bilibili username */
  bilibiliUsername: string;
  /** Bilibili avatar URL */
  bilibiliAvatar?: string;
  /** YouTube channel ID */
  youtubeChannelId: string;
  /** YouTube channel name */
  youtubeChannelName: string;
  /** YouTube channel avatar URL */
  youtubeAvatar?: string;
  /** Verification confidence level (1=highest, 4=manual review) */
  verificationLevel: 1 | 2 | 3 | 4;
  /** Timestamp when verified */
  verifiedAt: string;
  /** How the mapping was verified */
  verifiedBy: 'auto' | 'manual';
  /** Additional metadata for verification */
  metadata?: VerificationMetadata;
}

/**
 * Metadata collected during verification
 */
export interface VerificationMetadata {
  /** Bilibili follower count */
  bilibiliFollowers?: number;
  /** YouTube subscriber count */
  youtubeSubscribers?: number;
  /** Avatar similarity score (0-1) */
  avatarSimilarity?: number;
  /** Username similarity score (0-1) */
  usernameSimilarity?: number;
  /** Whether bio contains cross-platform link */
  bioMatch?: boolean;
  /** Whether YouTube channel is verified */
  youtubeVerified?: boolean;
  /** Number of matching video titles */
  matchingVideos?: number;
  /** GitHub issue number if submitted by user */
  issueNumber?: number;
}

/**
 * Bilibili user information
 */
export interface BilibiliUser {
  uid: string;
  name: string;
  face: string;
  sign: string;
  follower: number;
  level: number;
  official?: {
    type: number;
    desc: string;
  };
}

/**
 * Bilibili video information
 */
export interface BilibiliVideo {
  bvid: string;
  aid: number;
  title: string;
  pic: string;
  author: string;
  mid: number;
  created: number;
  length: string;
  play: number;
  danmaku: number;
}

/**
 * Bilibili danmaku item
 */
export interface BilibiliDanmaku {
  /** Timestamp in seconds */
  time: number;
  /** Type: 1=scroll, 4=bottom, 5=top */
  type: 1 | 4 | 5;
  /** Font size */
  size: number;
  /** Color (decimal) */
  color: number;
  /** Timestamp when sent */
  timestamp: number;
  /** Danmaku pool */
  pool: number;
  /** User hash */
  userHash: string;
  /** Danmaku ID */
  id: string;
  /** Content */
  content: string;
}

/**
 * YouTube channel information
 */
export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
  };
  subscriberCount?: number;
  videoCount?: number;
  verified?: boolean;
}

/**
 * YouTube video information
 */
export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
  };
  duration: string;
  viewCount?: number;
}

/**
 * Shard configuration
 */
export interface ShardConfig {
  /** Number of characters to use for first-level directory */
  level1Length: number;
  /** Number of characters to use for second-level directory */
  level2Length: number;
  /** Total hash length */
  hashLength: number;
}

/**
 * Mapping index for fast lookup
 */
export interface MappingIndex {
  /** Map of user ID to shard path */
  [userId: string]: string;
}

/**
 * User submission request
 */
export interface UserSubmissionRequest {
  bilibiliUid: string;
  youtubeChannelId: string;
  submitterEmail?: string;
  notes?: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  success: boolean;
  level: 1 | 2 | 3 | 4;
  confidence: number;
  reasons: string[];
  metadata: VerificationMetadata;
  mapping?: UserMapping;
}

/**
 * Scanner configuration
 */
export interface ScannerConfig {
  /** Whether this is a cold start */
  coldStart: boolean;
  /** Maximum users to scan per run */
  maxUsers: number;
  /** Delay between API calls (ms) */
  delayMs: number;
}

/**
 * Hot ranking types
 */
export type HotRankingType = 'must-watch' | 'hot' | 'top-100';

/**
 * Scan result
 */
export interface ScanResult {
  type: HotRankingType;
  users: BilibiliUser[];
  scannedAt: string;
  totalScanned: number;
  newUsers: number;
}
