import crypto from 'crypto';
import type { ShardConfig, MappingIndex, UserMapping } from '../../types';

/**
 * Default shard configuration
 * Uses Git-style 2-level directory structure: ab/cd/abcdef123.json
 */
const DEFAULT_SHARD_CONFIG: ShardConfig = {
  level1Length: 2,
  level2Length: 2,
  hashLength: 8,
};

/**
 * Shard manager for Git-style distributed user mapping storage
 */
export class ShardManager {
  private config: ShardConfig;
  private baseDir: string;

  constructor(baseDir: string, config: ShardConfig = DEFAULT_SHARD_CONFIG) {
    this.baseDir = baseDir;
    this.config = config;
  }

  /**
   * Generate hash for a user ID
   */
  private hash(userId: string): string {
    return crypto
      .createHash('sha256')
      .update(userId)
      .digest('hex')
      .substring(0, this.config.hashLength);
  }

  /**
   * Get shard path for a user ID
   * @example getShardPath('12345') => 'ab/cd/abcdef12.json'
   */
  getShardPath(userId: string): string {
    const hash = this.hash(userId);
    const level1 = hash.substring(0, this.config.level1Length);
    const level2 = hash.substring(
      this.config.level1Length,
      this.config.level1Length + this.config.level2Length
    );
    return `${level1}/${level2}/${hash}.json`;
  }

  /**
   * Get full file path for a user ID
   */
  getFullPath(userId: string): string {
    return `${this.baseDir}/${this.getShardPath(userId)}`;
  }

  /**
   * Get directory path for a shard
   */
  getShardDir(userId: string): string {
    const hash = this.hash(userId);
    const level1 = hash.substring(0, this.config.level1Length);
    const level2 = hash.substring(
      this.config.level1Length,
      this.config.level1Length + this.config.level2Length
    );
    return `${this.baseDir}/${level1}/${level2}`;
  }

  /**
   * Read mapping from shard
   */
  async readMapping(userId: string): Promise<UserMapping | null> {
    const filePath = this.getFullPath(userId);
    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return null;
      }
      const data = await file.json();
      return data as UserMapping;
    } catch (error) {
      console.error(`Failed to read mapping for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Write mapping to shard
   */
  async writeMapping(userId: string, mapping: UserMapping): Promise<void> {
    const filePath = this.getFullPath(userId);
    const dirPath = this.getShardDir(userId);

    try {
      // Ensure directory exists
      await Bun.write(dirPath + '/.gitkeep', '');

      // Write mapping
      await Bun.write(filePath, JSON.stringify(mapping, null, 2));
    } catch (error) {
      console.error(`Failed to write mapping for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete mapping from shard
   */
  async deleteMapping(userId: string): Promise<void> {
    const filePath = this.getFullPath(userId);
    try {
      await Bun.write(filePath, ''); // Bun doesn't have unlink, so we empty the file
    } catch (error) {
      console.error(`Failed to delete mapping for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if mapping exists
   */
  async hasMapping(userId: string): Promise<boolean> {
    const filePath = this.getFullPath(userId);
    const file = Bun.file(filePath);
    return await file.exists();
  }

  /**
   * Build index of all mappings for fast lookup
   */
  async buildIndex(): Promise<MappingIndex> {
    const index: MappingIndex = {};
    const glob = new Bun.Glob('**/*.json');

    for await (const filePath of glob.scan(this.baseDir)) {
      if (filePath === 'index.json') continue;

      try {
        const file = Bun.file(`${this.baseDir}/${filePath}`);
        const mapping = (await file.json()) as UserMapping;

        // Add both directions to index
        index[mapping.bilibiliUid] = filePath;
        index[mapping.youtubeChannelId] = filePath;
      } catch (error) {
        console.error(`Failed to process ${filePath}:`, error);
      }
    }

    return index;
  }

  /**
   * Write index file
   */
  async writeIndex(index: MappingIndex): Promise<void> {
    const indexPath = `${this.baseDir}/index.json`;
    await Bun.write(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Read index file
   */
  async readIndex(): Promise<MappingIndex | null> {
    const indexPath = `${this.baseDir}/index.json`;
    try {
      const file = Bun.file(indexPath);
      if (!(await file.exists())) {
        return null;
      }
      return (await file.json()) as MappingIndex;
    } catch (error) {
      console.error('Failed to read index:', error);
      return null;
    }
  }

  /**
   * Batch write mappings
   */
  async batchWrite(mappings: Array<{ userId: string; mapping: UserMapping }>): Promise<void> {
    const writes = mappings.map(({ userId, mapping }) => this.writeMapping(userId, mapping));
    await Promise.all(writes);
  }
}

/**
 * Create shard managers for both directions
 */
export function createShardManagers(dataDir: string = './data') {
  return {
    b2y: new ShardManager(`${dataDir}/b2y`),
    y2b: new ShardManager(`${dataDir}/y2b`),
  };
}
