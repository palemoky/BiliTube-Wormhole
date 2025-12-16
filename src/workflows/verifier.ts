import type {
  BilibiliUser,
  YouTubeChannel,
  VerificationResult,
  VerificationMetadata,
} from '../../types';
import { BilibiliAPI } from '../api/bilibili';
import { YouTubeAPI } from '../api/youtube';

/**
 * String similarity using Levenshtein distance
 */
function stringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    if (matrix[0]) {
      matrix[0][j] = j;
    }
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const prevRow = matrix[i - 1];
      const currRow = matrix[i];
      const prevCell = currRow?.[j - 1];
      const diagCell = prevRow?.[j - 1];
      const prevRowCell = prevRow?.[j];

      if (
        currRow &&
        prevRow &&
        prevCell !== undefined &&
        diagCell !== undefined &&
        prevRowCell !== undefined
      ) {
        currRow[j] = Math.min(prevRowCell + 1, prevCell + 1, diagCell + cost);
      }
    }
  }

  const lastRow = matrix[len1];
  const distance = lastRow?.[len2];
  if (distance === undefined) return 0;

  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Normalize username for comparison
 */
function normalizeUsername(username: string): string {
  return username
    .toLowerCase()
    .replace(/[_\-\s]/g, '')
    .replace(/official|频道|channel/gi, '');
}

/**
 * Check if bio contains cross-platform link
 */
function checkBioMatch(
  biliSign: string,
  ytDescription: string,
  biliUid: string,
  ytChannelId: string
): boolean {
  const biliLower = biliSign.toLowerCase();
  const ytLower = ytDescription.toLowerCase();

  // Check if Bilibili bio mentions YouTube
  const ytPatterns = [ytChannelId.toLowerCase(), 'youtube.com', 'youtu.be'];

  const biliMentionsYt = ytPatterns.some(pattern => biliLower.includes(pattern));

  // Check if YouTube description mentions Bilibili
  const biliPatterns = [biliUid, 'bilibili.com', 'b站', 'b站空间'];

  const ytMentionsBili = biliPatterns.some(pattern => ytLower.includes(pattern));

  return biliMentionsYt || ytMentionsBili;
}

/**
 * Multi-level user verification
 */
export class UserVerifier {
  private biliApi: BilibiliAPI;
  private ytApi: YouTubeAPI;

  constructor(biliApi: BilibiliAPI, ytApi: YouTubeAPI) {
    this.biliApi = biliApi;
    this.ytApi = ytApi;
  }

  /**
   * Verify user mapping with multi-level confidence scoring
   */
  async verify(biliUid: string, ytChannelId: string): Promise<VerificationResult> {
    try {
      // Fetch user data from both platforms
      const biliUser = await this.biliApi.getUserInfo(biliUid);
      const ytChannel = await this.ytApi.getChannel(ytChannelId);

      const metadata: VerificationMetadata = {
        bilibiliFollowers: biliUser.follower,
        ...(ytChannel.subscriberCount !== undefined && {
          youtubeSubscribers: ytChannel.subscriberCount,
        }),
      };

      // Level 1: YouTube verified + name match
      if (ytChannel.verified) {
        const nameSimilarity = stringSimilarity(
          normalizeUsername(biliUser.name),
          normalizeUsername(ytChannel.title)
        );
        metadata.usernameSimilarity = nameSimilarity;
        metadata.youtubeVerified = true;

        if (nameSimilarity >= 0.8) {
          return {
            success: true,
            level: 1,
            confidence: 0.95 + nameSimilarity * 0.05,
            reasons: [
              'YouTube channel is verified',
              `Username similarity: ${(nameSimilarity * 100).toFixed(1)}%`,
            ],
            metadata,
            mapping: this.createMapping(biliUser, ytChannel, 1, metadata),
          };
        }
      }

      // Level 2: Cross-platform bio mentions
      const bioMatch = checkBioMatch(biliUser.sign, ytChannel.description, biliUid, ytChannelId);
      metadata.bioMatch = bioMatch;

      if (bioMatch) {
        const nameSimilarity = stringSimilarity(
          normalizeUsername(biliUser.name),
          normalizeUsername(ytChannel.title)
        );
        metadata.usernameSimilarity = nameSimilarity;

        return {
          success: true,
          level: 2,
          confidence: 0.85,
          reasons: [
            'Cross-platform bio mentions detected',
            bioMatch ? 'Bio contains platform link' : '',
          ].filter(Boolean),
          metadata,
          mapping: this.createMapping(biliUser, ytChannel, 2, metadata),
        };
      }

      // Level 3: Similarity-based verification
      const nameSimilarity = stringSimilarity(
        normalizeUsername(biliUser.name),
        normalizeUsername(ytChannel.title)
      );
      metadata.usernameSimilarity = nameSimilarity;

      // Get recent videos for comparison
      const biliVideos = await this.biliApi.getUserVideos(biliUid, 1, 10);
      const ytVideos = await this.ytApi.getChannelVideos(ytChannelId, 10);

      let matchingVideos = 0;
      for (const biliVideo of biliVideos) {
        for (const ytVideo of ytVideos) {
          const titleSimilarity = stringSimilarity(
            biliVideo.title.toLowerCase(),
            ytVideo.title.toLowerCase()
          );
          if (titleSimilarity >= 0.7) {
            matchingVideos++;
            break;
          }
        }
      }
      metadata.matchingVideos = matchingVideos;

      // Check follower ratio
      const followerRatio = ytChannel.subscriberCount! / biliUser.follower;
      const followerRatioValid = followerRatio >= 0.5 && followerRatio <= 2.0;

      // Calculate confidence score
      let confidence = 0;
      const reasons: string[] = [];

      if (nameSimilarity >= 0.8) {
        confidence += 0.4;
        reasons.push(`High username similarity: ${(nameSimilarity * 100).toFixed(1)}%`);
      } else if (nameSimilarity >= 0.6) {
        confidence += 0.2;
        reasons.push(`Moderate username similarity: ${(nameSimilarity * 100).toFixed(1)}%`);
      }

      if (matchingVideos >= 3) {
        confidence += 0.3;
        reasons.push(`${matchingVideos} matching video titles`);
      } else if (matchingVideos >= 1) {
        confidence += 0.15;
        reasons.push(`${matchingVideos} matching video title(s)`);
      }

      if (followerRatioValid) {
        confidence += 0.15;
        reasons.push('Follower count ratio is reasonable');
      }

      // Level 3 requires confidence >= 0.7
      if (confidence >= 0.7) {
        return {
          success: true,
          level: 3,
          confidence,
          reasons,
          metadata,
          mapping: this.createMapping(biliUser, ytChannel, 3, metadata),
        };
      }

      // Level 4: Manual review required
      return {
        success: false,
        level: 4,
        confidence,
        reasons: [
          'Insufficient confidence for automatic verification',
          ...reasons,
          'Manual review required',
        ],
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        level: 4,
        confidence: 0,
        reasons: [`Verification failed: ${error}`],
        metadata: {},
      };
    }
  }

  /**
   * Create user mapping from verification result
   */
  private createMapping(
    biliUser: BilibiliUser,
    ytChannel: YouTubeChannel,
    level: 1 | 2 | 3 | 4,
    metadata: VerificationMetadata
  ) {
    return {
      bilibiliUid: biliUser.uid,
      bilibiliUsername: biliUser.name,
      bilibiliAvatar: biliUser.face,
      youtubeChannelId: ytChannel.id,
      youtubeChannelName: ytChannel.title,
      youtubeAvatar: ytChannel.thumbnails.high,
      verificationLevel: level,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'auto' as const,
      metadata,
    };
  }
}
