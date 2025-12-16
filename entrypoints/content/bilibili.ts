/// <reference types="wxt/browser" />

import { mappingClient } from '@/utils/mapping-client';

export default defineContentScript({
  matches: ['https://www.bilibili.com/*', 'https://space.bilibili.com/*'],
  main() {
    console.log('BiliTube-Wormhole: Bilibili content script loaded');

    // Extract Bilibili UID from URL
    function getBilibiliUid(): string | null {
      const match = window.location.href.match(/space\.bilibili\.com\/(\d+)/);
      return match?.[1] ?? null;
    }

    // Create YouTube logo button
    function createYouTubeLogo(youtubeChannelId: string, channelName: string): HTMLElement {
      const container = document.createElement('div');
      container.className = 'bilitube-youtube-link';
      container.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10000;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
      `;

      container.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 12px; color: #666;">在 YouTube 观看</span>
          <span style="font-size: 14px; font-weight: 500; color: #333;">${channelName}</span>
        </div>
      `;

      container.addEventListener('mouseenter', () => {
        container.style.transform = 'translateY(-2px)';
        container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      });

      container.addEventListener('mouseleave', () => {
        container.style.transform = 'translateY(0)';
        container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      });

      container.addEventListener('click', () => {
        window.open(`https://www.youtube.com/channel/${youtubeChannelId}`, '_blank');
      });

      return container;
    }

    // Check for mapping and show YouTube logo
    async function checkAndShowMapping() {
      const uid = getBilibiliUid();
      if (!uid) return;

      try {
        const mapping = await mappingClient.getMappingByBiliUid(uid);
        if (mapping) {
          console.log('Found YouTube mapping:', mapping);
          
          // Remove existing logo if any
          const existing = document.querySelector('.bilitube-youtube-link');
          if (existing) {
            existing.remove();
          }

          // Add YouTube logo
          const logo = createYouTubeLogo(mapping.youtubeChannelId, mapping.youtubeChannelName);
          document.body.appendChild(logo);
        }
      } catch (error) {
        console.error('Failed to check mapping:', error);
      }
    }

    // Run on page load
    checkAndShowMapping();

    // Re-run on navigation (for SPA)
    let lastUrl = window.location.href;
    new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        checkAndShowMapping();
      }
    }).observe(document.body, { childList: true, subtree: true });
  },
});
