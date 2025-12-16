import { BilibiliAPI } from '../api/bilibili';
import { YouTubeAPI } from '../api/youtube';
import { UserVerifier } from './verifier';
import { createShardManagers } from '../storage/shard-manager';
import type { VerificationResult } from '../../types';

/**
 * Verification workflow entry point
 */
export async function main() {
  const sessdata = process.env['BILIBILI_SESSDATA'];
  const youtubeApiKey = process.env['YOUTUBE_API_KEY'];
  const usersJson = process.env['USERS_JSON'];

  if (!youtubeApiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is required');
  }

  if (!usersJson) {
    throw new Error('USERS_JSON environment variable is required');
  }

  const users = JSON.parse(usersJson);
  
  const biliApi = new BilibiliAPI(sessdata);
  const ytApi = new YouTubeAPI(youtubeApiKey);
  const verifier = new UserVerifier(biliApi, ytApi);
  const shardManagers = createShardManagers();

  const results: Array<VerificationResult & { issueNumber?: number }> = [];

  for (const user of users) {
    console.log(`Verifying ${user.uid} -> ${user.ytChannelId || 'searching...'}`);

    try {
      let ytChannelId = user.ytChannelId;

      // If no YouTube channel ID provided, search for it
      if (!ytChannelId) {
        const biliUser = await biliApi.getUserInfo(user.uid);
        const channels = await ytApi.searchChannels(biliUser.name, 5);

        if (channels.length > 0) {
          // Try to verify each channel
          for (const channel of channels) {
            const result = await verifier.verify(user.uid, channel.id);
            if (result.success && result.level <= 3) {
              ytChannelId = channel.id;
              break;
            }
          }
        }
      }

      if (!ytChannelId) {
        console.log(`No YouTube channel found for ${user.uid}`);
        results.push({
          success: false,
          level: 4,
          confidence: 0,
          reasons: ['No YouTube channel found'],
          metadata: {},
          issueNumber: user.issueNumber,
        });
        continue;
      }

      // Verify the mapping
      const result = await verifier.verify(user.uid, ytChannelId);
      results.push({
        ...result,
        issueNumber: user.issueNumber,
      });

      // Save mapping if successful
      if (result.success && result.mapping) {
        console.log(`✅ Verified: ${result.mapping.bilibiliUsername} -> ${result.mapping.youtubeChannelName} (Level ${result.level})`);

        // Write to both b2y and y2b shards
        await shardManagers.b2y.writeMapping(user.uid, result.mapping);
        await shardManagers.y2b.writeMapping(ytChannelId, result.mapping);
      } else {
        console.log(`❌ Verification failed for ${user.uid}`);
      }

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error verifying ${user.uid}:`, error);
      results.push({
        success: false,
        level: 4,
        confidence: 0,
        reasons: [`Error: ${error}`],
        metadata: {},
        issueNumber: user.issueNumber,
      });
    }
  }

  // Rebuild indexes
  console.log('Rebuilding indexes...');
  const b2yIndex = await shardManagers.b2y.buildIndex();
  const y2bIndex = await shardManagers.y2b.buildIndex();
  await shardManagers.b2y.writeIndex(b2yIndex);
  await shardManagers.y2b.writeIndex(y2bIndex);

  // Write results for GitHub Actions
  await Bun.write('./verify-results.json', JSON.stringify(results, null, 2));

  const successCount = results.filter(r => r.success).length;
  console.log(`Verification complete: ${successCount}/${results.length} successful`);
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
