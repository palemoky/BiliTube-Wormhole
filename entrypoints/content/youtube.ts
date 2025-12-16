/// <reference types="wxt/client" />

import { mappingClient } from '@/utils/mapping-client';
import type { BilibiliDanmaku } from '../../types';

export default defineContentScript({
  matches: ['https://www.youtube.com/*'],
  main() {
    console.log('BiliTube-Wormhole: YouTube content script loaded');

    // Extract YouTube channel ID from page
    function getYouTubeChannelId(): string | null {
      // Try from URL
      const urlMatch = window.location.href.match(/youtube\.com\/(channel|c|user|@)([\w-]+)/);
      if (urlMatch && urlMatch[2]) {
        return urlMatch[2];
      }

      // Try from page metadata
      const linkTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (linkTag) {
        const match = linkTag.href.match(/youtube\.com\/channel\/(UC[\w-]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }

      return null;
    }

    // Get current video ID
    function getVideoId(): string | null {
      const match = window.location.href.match(/[?&]v=([^&]+)/);
      return (match && match[1]) ? match[1] : null;
    }

    // Create Bilibili logo button
    function createBilibiliLogo(biliUid: string, username: string): HTMLElement {
      const container = document.createElement('div');
      container.className = 'bilitube-bilibili-link';
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#00A1D6">
          <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/>
        </svg>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 12px; color: #666;">在 Bilibili 观看</span>
          <span style="font-size: 14px; font-weight: 500; color: #333;">${username}</span>
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
        window.open(`https://space.bilibili.com/${biliUid}`, '_blank');
      });

      return container;
    }

    // Inject danmaku container
    function injectDanmakuContainer(): HTMLElement {
      const video = document.querySelector('video');
      if (!video) {
        throw new Error('Video element not found');
      }

      const container = document.createElement('div');
      container.id = 'bilitube-danmaku-container';
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
        z-index: 100;
      `;

      const videoContainer = video.parentElement;
      if (videoContainer) {
        videoContainer.style.position = 'relative';
        videoContainer.appendChild(container);
      }

      return container;
    }

    // Render danmaku item (currently unused - placeholder for future implementation)
    // @ts-expect-error - Function will be used when danmaku rendering is implemented
    function renderDanmaku(danmaku: BilibiliDanmaku, container: HTMLElement, _videoWidth: number, videoHeight: number) {
      const item = document.createElement('div');
      item.className = 'bilitube-danmaku-item';
      item.textContent = danmaku.content;
      
      // Bilibili-style danmaku
      const fontSize = danmaku.size || 25;
      const color = `#${danmaku.color.toString(16).padStart(6, '0')}`;
      
      item.style.cssText = `
        position: absolute;
        white-space: nowrap;
        font-size: ${fontSize}px;
        color: ${color};
        font-family: "Microsoft YaHei", "SimHei", sans-serif;
        font-weight: bold;
        text-shadow: 
          1px 0 1px #000,
          0 1px 1px #000,
          0 -1px 1px #000,
          -1px 0 1px #000;
        pointer-events: none;
        z-index: 100;
      `;

      // Position based on type
      if (danmaku.type === 1) {
        // Scrolling danmaku
        const top = Math.random() * (videoHeight * 0.8);
        item.style.top = `${top}px`;
        item.style.right = `-${item.offsetWidth}px`;
        item.style.animation = 'bilitube-scroll 10s linear';
      } else if (danmaku.type === 4) {
        // Bottom danmaku
        item.style.bottom = '50px';
        item.style.left = '50%';
        item.style.transform = 'translateX(-50%)';
        item.style.animation = 'bilitube-fade 3s ease-out';
      } else if (danmaku.type === 5) {
        // Top danmaku
        item.style.top = '50px';
        item.style.left = '50%';
        item.style.transform = 'translateX(-50%)';
        item.style.animation = 'bilitube-fade 3s ease-out';
      }

      container.appendChild(item);

      // Remove after animation
      setTimeout(() => {
        item.remove();
      }, 10000);
    }

    // Inject CSS animations
    function injectStyles() {
      if (document.getElementById('bilitube-styles')) return;

      const style = document.createElement('style');
      style.id = 'bilitube-styles';
      style.textContent = `
        @keyframes bilitube-scroll {
          from { right: -100%; }
          to { right: 100%; }
        }
        @keyframes bilitube-fade {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Check for mapping and show Bilibili logo
    async function checkAndShowMapping() {
      const channelId = getYouTubeChannelId();
      if (!channelId) return;

      try {
        const mapping = await mappingClient.getMappingByYouTubeId(channelId);
        if (mapping) {
          console.log('Found Bilibili mapping:', mapping);
          
          // Remove existing logo if any
          const existing = document.querySelector('.bilitube-bilibili-link');
          if (existing) {
            existing.remove();
          }

          // Add Bilibili logo
          const logo = createBilibiliLogo(mapping.bilibiliUid, mapping.bilibiliUsername);
          document.body.appendChild(logo);

          // Load danmaku if on video page
          const videoId = getVideoId();
          if (videoId) {
            loadDanmaku(mapping.bilibiliUid, videoId);
          }
        }
      } catch (error) {
        console.error('Failed to check mapping:', error);
      }
    }

    // Load and display danmaku (placeholder for future implementation)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async function loadDanmaku(_biliUid: string, _youtubeVideoId: string) {
      try {
        injectStyles();
        injectDanmakuContainer();
        const video = document.querySelector('video');
        if (!video) return;

        // TODO: Implement video matching and danmaku loading
        // This would require finding the corresponding Bilibili video
        // and fetching its danmaku
        console.log('Danmaku loading not yet implemented');
      } catch (error) {
        console.error('Failed to load danmaku:', error);
      }
    }

    // Run on page load
    checkAndShowMapping();

    // Re-run on navigation
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
