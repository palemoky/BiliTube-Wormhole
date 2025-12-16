import crypto from 'crypto';
import type { BilibiliUser, BilibiliVideo, BilibiliDanmaku } from '../../types';

/**
 * Bilibili API client
 * Reference: https://github.com/Nemo2011/bilibili-api
 */
export class BilibiliAPI {
  private baseUrl = 'https://api.bilibili.com';
  private wbiKeys: { imgKey: string; subKey: string } | null = null;
  private sessdata: string | null = null;

  constructor(sessdata?: string) {
    this.sessdata = sessdata || null;
  }

  /**
   * Get WBI signature keys
   */
  private async getWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
    if (this.wbiKeys) {
      return this.wbiKeys;
    }

    const response = await fetch('https://api.bilibili.com/x/web-interface/nav');
    const data = await response.json();
    
    const imgUrl = data.data.wbi_img.img_url;
    const subUrl = data.data.wbi_img.sub_url;
    
    const imgKey = imgUrl.split('/').pop().split('.')[0];
    const subKey = subUrl.split('/').pop().split('.')[0];
    
    this.wbiKeys = { imgKey, subKey };
    return this.wbiKeys;
  }

  /**
   * Generate WBI signature for authenticated requests
   */
  private async signWbi(params: Record<string, any>): Promise<string> {
    const { imgKey, subKey } = await this.getWbiKeys();
    const mixinKey = (imgKey + subKey).slice(0, 32);
    
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const wts = Math.floor(Date.now() / 1000);
    const toSign = `${sortedParams}&wts=${wts}${mixinKey}`;
    const wRid = crypto.createHash('md5').update(toSign).digest('hex');
    
    return `${sortedParams}&wts=${wts}&w_rid=${wRid}`;
  }

  /**
   * Make authenticated request
   * If SESSDATA is not provided, will attempt anonymous access without WBI signature
   */
  private async request<T>(url: string, params: Record<string, any> = {}): Promise<T> {
    let fullUrl: string;
    
    // Only use WBI signature if SESSDATA is available
    if (this.sessdata) {
      const signedParams = await this.signWbi(params);
      fullUrl = `${url}?${signedParams}`;
    } else {
      // Anonymous request without WBI signature
      const queryParams = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      fullUrl = queryParams ? `${url}?${queryParams}` : url;
    }
    
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://www.bilibili.com',
    };
    
    if (this.sessdata) {
      headers['Cookie'] = `SESSDATA=${this.sessdata}`;
    }
    
    const response = await fetch(fullUrl, { headers });
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`Bilibili API error: ${data.message}`);
    }
    
    return data.data as T;
  }

  /**
   * Get user information
   */
  async getUserInfo(uid: string): Promise<BilibiliUser> {
    const data = await this.request<any>(`${this.baseUrl}/x/space/acc/info`, { mid: uid });
    
    return {
      uid: data.mid.toString(),
      name: data.name,
      face: data.face,
      sign: data.sign,
      follower: data.follower,
      level: data.level,
      official: data.official?.type >= 0 ? {
        type: data.official.type,
        desc: data.official.desc,
      } : undefined,
    };
  }

  /**
   * Get user's video list
   */
  async getUserVideos(uid: string, page: number = 1, pageSize: number = 30): Promise<BilibiliVideo[]> {
    const data = await this.request<any>(`${this.baseUrl}/x/space/arc/search`, {
      mid: uid,
      ps: pageSize,
      pn: page,
    });
    
    return data.list.vlist.map((v: any) => ({
      bvid: v.bvid,
      aid: v.aid,
      title: v.title,
      pic: v.pic,
      author: v.author,
      mid: v.mid,
      created: v.created,
      length: v.length,
      play: v.play,
      danmaku: v.video_review,
    }));
  }

  /**
   * Get video danmaku
   */
  async getDanmaku(cid: number): Promise<BilibiliDanmaku[]> {
    const url = `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`;
    const response = await fetch(url);
    const xml = await response.text();
    
    // Parse XML danmaku
    const danmakuList: BilibiliDanmaku[] = [];
    const regex = /<d p="([^"]+)">([^<]+)<\/d>/g;
    let match;
    
    while ((match = regex.exec(xml)) !== null) {
      const params = match[1]?.split(',');
      const content = match[2];
      
      if (!params || params.length < 8) continue;
      
      danmakuList.push({
        time: parseFloat(params[0] || '0'),
        type: parseInt(params[1] || '1') as 1 | 4 | 5,
        size: parseInt(params[2] || '25'),
        color: parseInt(params[3] || '16777215'),
        timestamp: parseInt(params[4] || '0'),
        pool: parseInt(params[5] || '0'),
        userHash: params[6] || '',
        id: params[7] || '',
        content: content || '',
      });
    }
    
    return danmakuList;
  }

  /**
   * Get video info by BV ID
   */
  async getVideoInfo(bvid: string): Promise<any> {
    const data = await this.request<any>(`${this.baseUrl}/x/web-interface/view`, { bvid });
    return data;
  }

  /**
   * Get hot rankings
   */
  async getHotRankings(): Promise<BilibiliUser[]> {
    const response = await fetch('https://api.bilibili.com/x/web-interface/ranking/v2');
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`Failed to get hot rankings: ${data.message}`);
    }
    
    const users: BilibiliUser[] = [];
    const seenUids = new Set<string>();
    
    for (const item of data.data.list) {
      const uid = item.owner.mid.toString();
      if (!seenUids.has(uid)) {
        seenUids.add(uid);
        users.push({
          uid,
          name: item.owner.name,
          face: item.owner.face,
          sign: '',
          follower: 0,
          level: 0,
        });
      }
    }
    
    return users;
  }

  /**
   * Get must-watch list (入站必刷榜)
   */
  async getMustWatchList(): Promise<BilibiliUser[]> {
    const response = await fetch('https://api.bilibili.com/x/web-interface/popular/precious');
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`Failed to get must-watch list: ${data.message}`);
    }
    
    const users: BilibiliUser[] = [];
    const seenUids = new Set<string>();
    
    for (const item of data.data.list) {
      const uid = item.owner.mid.toString();
      if (!seenUids.has(uid)) {
        seenUids.add(uid);
        users.push({
          uid,
          name: item.owner.name,
          face: item.owner.face,
          sign: '',
          follower: 0,
          level: 0,
        });
      }
    }
    
    return users;
  }

  /**
   * Search users by keyword
   */
  async searchUsers(keyword: string, page: number = 1): Promise<BilibiliUser[]> {
    const data = await this.request<any>(`${this.baseUrl}/x/web-interface/search/type`, {
      search_type: 'bili_user',
      keyword,
      page,
    });
    
    return data.result.map((u: any) => ({
      uid: u.mid.toString(),
      name: u.uname,
      face: u.upic,
      sign: u.usign,
      follower: u.fans,
      level: u.level,
      official: u.official_verify?.type >= 0 ? {
        type: u.official_verify.type,
        desc: u.official_verify.desc,
      } : undefined,
    }));
  }

  /**
   * Get top 100 creators (百大Up主)
   * Note: This is a placeholder - actual API endpoint may vary
   */
  async getTop100Creators(): Promise<BilibiliUser[]> {
    // This would need the actual Bilibili Top 100 API endpoint
    // For now, we'll use hot rankings as a fallback
    return this.getHotRankings();
  }
}

/**
 * Rate limiter for API requests
 */
export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private delayMs: number;

  constructor(delayMs: number = 1000) {
    this.delayMs = delayMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        await fn();
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }
    
    this.processing = false;
  }
}
