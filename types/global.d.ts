/**
 * Global type declarations for browser APIs and third-party libraries
 */

/// <reference types="chrome" />
/// <reference types="bun-types" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const value: any;
  export default value;
}

/**
 * WXT framework globals
 */
declare module 'wxt/browser' {
  export * from 'webextension-polyfill';
}

/**
 * Environment variables
 */
interface ImportMetaEnv {
  readonly VITE_GITHUB_TOKEN?: string;
  readonly VITE_YOUTUBE_API_KEY?: string;
  readonly VITE_CDN_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Browser extension storage
 */
interface StorageArea {
  get(keys?: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }>;
  set(items: { [key: string]: any }): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Chrome storage API
 */
declare namespace chrome {
  namespace storage {
    const local: StorageArea;
    const sync: StorageArea;
  }
}
