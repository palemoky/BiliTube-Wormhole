import type { BilibiliUser, ScanResult, ScannerConfig } from '../../types';
import { BilibiliAPI, RateLimiter } from '../api/bilibili';
import { createShardManagers } from '../storage/shard-manager';

/**
 * Bilibili user scanner for automated discovery
 */
export class UserScanner {
  private biliApi: BilibiliAPI;
  private rateLimiter: RateLimiter;
  private shardManagers;

  constructor(biliApi: BilibiliAPI, delayMs: number = 1000) {
    this.biliApi = biliApi;
    this.rateLimiter = new RateLimiter(delayMs);
    this.shardManagers = createShardManagers();
  }

  /**
   * Check if this is a cold start (no existing mappings)
   */
  async isColdStart(): Promise<boolean> {
    const b2yIndex = await this.shardManagers.b2y.readIndex();
    const y2bIndex = await this.shardManagers.y2b.readIndex();

    return !b2yIndex && !y2bIndex;
  }

  /**
   * Scan must-watch list (入站必刷榜)
   */
  async scanMustWatchList(): Promise<ScanResult> {
    console.log('Scanning must-watch list...');

    const users = await this.rateLimiter.execute(() => this.biliApi.getMustWatchList());
    const newUsers = await this.filterNewUsers(users);

    return {
      type: 'must-watch',
      users: newUsers,
      scannedAt: new Date().toISOString(),
      totalScanned: users.length,
      newUsers: newUsers.length,
    };
  }

  /**
   * Scan hot rankings
   */
  async scanHotRankings(): Promise<ScanResult> {
    console.log('Scanning hot rankings...');

    const users = await this.rateLimiter.execute(() => this.biliApi.getHotRankings());
    const newUsers = await this.filterNewUsers(users);

    return {
      type: 'hot',
      users: newUsers,
      scannedAt: new Date().toISOString(),
      totalScanned: users.length,
      newUsers: newUsers.length,
    };
  }

  /**
   * Scan top 100 creators (百大Up主)
   */
  async scanTop100(): Promise<ScanResult> {
    console.log('Scanning top 100 creators...');

    const users = await this.rateLimiter.execute(() => this.biliApi.getTop100Creators());
    const newUsers = await this.filterNewUsers(users);

    return {
      type: 'top-100',
      users: newUsers,
      scannedAt: new Date().toISOString(),
      totalScanned: users.length,
      newUsers: newUsers.length,
    };
  }

  /**
   * Filter out users that already have mappings
   */
  private async filterNewUsers(users: BilibiliUser[]): Promise<BilibiliUser[]> {
    const newUsers: BilibiliUser[] = [];

    for (const user of users) {
      const hasMapping = await this.shardManagers.b2y.hasMapping(user.uid);
      if (!hasMapping) {
        newUsers.push(user);
      }
    }

    return newUsers;
  }

  /**
   * Run daily scan
   */
  async runDailyScan(config: ScannerConfig): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    if (config.coldStart) {
      console.log('Cold start detected - scanning top 100 and must-watch list');

      // Cold start: scan top 100 first
      const top100Result = await this.scanTop100();
      results.push(top100Result);

      // Then scan must-watch list
      const mustWatchResult = await this.scanMustWatchList();
      results.push(mustWatchResult);
    } else {
      console.log('Regular scan - scanning hot rankings');

      // Regular scan: only hot rankings
      const hotResult = await this.scanHotRankings();
      results.push(hotResult);
    }

    return results;
  }

  /**
   * Deduplicate users across multiple scan results
   */
  deduplicateUsers(results: ScanResult[]): BilibiliUser[] {
    const seenUids = new Set<string>();
    const uniqueUsers: BilibiliUser[] = [];

    for (const result of results) {
      for (const user of result.users) {
        if (!seenUids.has(user.uid)) {
          seenUids.add(user.uid);
          uniqueUsers.push(user);
        }
      }
    }

    return uniqueUsers;
  }
}

/**
 * Main scanner entry point for GitHub Actions
 */
export async function main() {
  const sessdata = process.env['BILIBILI_SESSDATA'];
  const biliApi = new BilibiliAPI(sessdata);
  const scanner = new UserScanner(biliApi);

  // Check if cold start
  const coldStart = await scanner.isColdStart();

  const config: ScannerConfig = {
    coldStart,
    maxUsers: 100,
    delayMs: 1000,
  };

  console.log(`Running scanner (cold start: ${coldStart})`);

  const results = await scanner.runDailyScan(config);
  const uniqueUsers = scanner.deduplicateUsers(results);

  console.log(`Scanned ${uniqueUsers.length} unique new users`);

  // Output results for GitHub Actions
  const output = {
    coldStart,
    results,
    uniqueUsers: uniqueUsers.map(u => ({
      uid: u.uid,
      name: u.name,
      follower: u.follower,
    })),
  };

  // Write to file for next workflow step
  await Bun.write('./scan-results.json', JSON.stringify(output, null, 2));

  console.log('Scan complete. Results written to scan-results.json');
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
