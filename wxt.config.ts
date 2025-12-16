import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'BiliTube Wormhole',
    description: 'Bridge Bilibili and YouTube with danmaku synchronization',
    version: '0.1.0',
    permissions: ['storage', 'tabs', 'webRequest'],
    host_permissions: [
      'https://www.bilibili.com/*',
      'https://www.youtube.com/*',
      'https://api.bilibili.com/*',
      'https://cdn.jsdelivr.net/*',
      'https://raw.githubusercontent.com/*',
    ],
    web_accessible_resources: [
      {
        resources: ['danmaku-engine.js', 'styles/*.css'],
        matches: ['https://www.youtube.com/*', 'https://www.bilibili.com/*'],
      },
    ],
  },
  webExt: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
    firefoxProfile: 'wxt-dev-profile',
  },
});
