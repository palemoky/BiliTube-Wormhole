/// <reference types="wxt/browser" />

export default defineBackground(() => {
  console.log('BiliTube-Wormhole: Background service worker started');

  // Listen for messages from content scripts
  browser.runtime.onMessage.addListener((message: any) => {
    console.log('Received message:', message);

    if (message.type === 'GET_MAPPING') {
      // Handle mapping requests
      // This could be used for caching or analytics
    }

    return true;
  });
});
