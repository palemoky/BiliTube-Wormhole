import { describe, test, expect } from 'bun:test';

/**
 * String similarity tests
 */
describe('String Similarity', () => {
  // Helper function to calculate Levenshtein distance
  function stringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Handle empty strings
    if (len1 === 0 && len2 === 0) return 1.0;
    if (len1 === 0 || len2 === 0) return 0;
    
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

        if (currRow && prevRow && prevCell !== undefined && diagCell !== undefined && prevRowCell !== undefined) {
          currRow[j] = Math.min(
            prevRowCell + 1,
            prevCell + 1,
            diagCell + cost
          );
        }
      }
    }

    const lastRow = matrix[len1];
    const distance = lastRow?.[len2];
    if (distance === undefined) return 0;

    const maxLen = Math.max(len1, len2);
    return 1 - distance / maxLen;
  }

  test('should return 1.0 for identical strings', () => {
    expect(stringSimilarity('test', 'test')).toBe(1.0);
    expect(stringSimilarity('hello world', 'hello world')).toBe(1.0);
  });

  test('should return 0.0 for completely different strings', () => {
    const similarity = stringSimilarity('abc', 'xyz');
    expect(similarity).toBeLessThan(0.1);
  });

  test('should return high similarity for similar strings', () => {
    const similarity = stringSimilarity('TestUser', 'TestUser123');
    expect(similarity).toBeGreaterThan(0.7);
  });

  test('should handle empty strings', () => {
    // Two empty strings are identical
    expect(stringSimilarity('', '')).toBe(1.0);
    
    // Empty string vs non-empty should be 0
    expect(stringSimilarity('test', '')).toBe(0);
    expect(stringSimilarity('', 'test')).toBe(0);
  });

  test('should be case-sensitive', () => {
    const similarity = stringSimilarity('Test', 'test');
    expect(similarity).toBeLessThan(1.0);
  });
});

/**
 * Username normalization tests
 */
describe('Username Normalization', () => {
  function normalizeUsername(username: string): string {
    return username
      .toLowerCase()
      .replace(/[_\-\s]/g, '')
      .replace(/official|频道|channel/gi, '');
  }

  test('should convert to lowercase', () => {
    expect(normalizeUsername('TestUser')).toBe('testuser');
  });

  test('should remove underscores and hyphens', () => {
    expect(normalizeUsername('test_user-name')).toBe('testusername');
  });

  test('should remove spaces', () => {
    expect(normalizeUsername('test user name')).toBe('testusername');
  });

  test('should remove "official" keyword', () => {
    expect(normalizeUsername('TestUserOfficial')).toBe('testuser');
  });

  test('should remove Chinese "频道" keyword', () => {
    expect(normalizeUsername('测试用户频道')).toBe('测试用户');
  });

  test('should remove "channel" keyword', () => {
    expect(normalizeUsername('TestUserChannel')).toBe('testuser');
  });

  test('should handle combined transformations', () => {
    expect(normalizeUsername('Test_User-Official Channel')).toBe('testuser');
  });
});

/**
 * Bio matching tests
 */
describe('Bio Matching', () => {
  function checkBioMatch(biliSign: string, ytDescription: string, biliUid: string, ytChannelId: string): boolean {
    const biliLower = biliSign.toLowerCase();
    const ytLower = ytDescription.toLowerCase();

    const ytPatterns = [
      ytChannelId.toLowerCase(),
      'youtube.com',
      'youtu.be',
    ];

    const biliMentionsYt = ytPatterns.some(pattern => biliLower.includes(pattern));

    const biliPatterns = [
      biliUid,
      'bilibili.com',
      'b站',
      'b站空间',
    ];

    const ytMentionsBili = biliPatterns.some(pattern => ytLower.includes(pattern));

    return biliMentionsYt || ytMentionsBili;
  }

  test('should match when Bilibili bio mentions YouTube channel ID', () => {
    const result = checkBioMatch(
      'Check out my YouTube: UCtest123',
      'Regular description',
      '123456',
      'UCtest123'
    );
    expect(result).toBe(true);
  });

  test('should match when Bilibili bio mentions youtube.com', () => {
    const result = checkBioMatch(
      'Follow me on youtube.com/@test',
      'Regular description',
      '123456',
      'UCtest'
    );
    expect(result).toBe(true);
  });

  test('should match when YouTube description mentions Bilibili UID', () => {
    const result = checkBioMatch(
      'Regular bio',
      'Follow me on Bilibili: 123456',
      '123456',
      'UCtest'
    );
    expect(result).toBe(true);
  });

  test('should match when YouTube description mentions bilibili.com', () => {
    const result = checkBioMatch(
      'Regular bio',
      'Check out bilibili.com/123456',
      '123456',
      'UCtest'
    );
    expect(result).toBe(true);
  });

  test('should match when YouTube description mentions B站', () => {
    const result = checkBioMatch(
      'Regular bio',
      '欢迎来B站找我',
      '123456',
      'UCtest'
    );
    expect(result).toBe(true);
  });

  test('should not match when no mentions exist', () => {
    const result = checkBioMatch(
      'Regular bio',
      'Regular description',
      '123456',
      'UCtest'
    );
    expect(result).toBe(false);
  });

  test('should be case-insensitive', () => {
    const result = checkBioMatch(
      'Check out YOUTUBE.COM',
      'Regular description',
      '123456',
      'UCtest'
    );
    expect(result).toBe(true);
  });
});
