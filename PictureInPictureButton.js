// ==UserScript==
// @name         ピクチャーインピクチャー (PiP) ボタン
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  再生中の動画をワンクリックでピクチャーインピクチャー表示する
// @author       UserScript
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ── 設定 ──────────────────────────────────────────────
  const BTN_SIZE = 44;    // ボタンサイズ (px)
  const OFFSET   = 10;    // 動画右上からの余白 (px)
  const Z_INDEX  = 2147483647;
  // ──────────────────────────────────────────────────────

  // ボタンのスタイルを <head> に直接注入（shadow DOM 外でも確実に効く）
  const styleEl = document.createElement('style');
  styleEl.id = 'pip-userscript-style';
  styleEl.textContent = `
    #pip-floating-btn {
      all: initial !important;
      position: fixed !important;
      width: ${BTN_SIZE}px !important;
      height: ${BTN_SIZE}px !important;
      border-radius: 50% !important;
      border: none !important;
      cursor: pointer !important;
      z-index: ${Z_INDEX} !important;
      background: rgba(0,0,0,0.70) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0 !important;
      transition: opacity 0.18s, transform 0.14s, background 0.14s !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: 0 2px 10px rgba(0,0,0,0.45) !important;
      pointer-events: auto !important;
      box-sizing: border-box !important;
    }
    #pip-floating-btn.pip-visible {
      opacity: 1 !important;
    }
    #pip-floating-btn.pip-active {
      background: rgba(37,99,235,0.90) !important;
      opacity: 1 !important;
    }
    #pip-floating-btn:hover {
      background: rgba(37,99,235,0.90) !important;
      transform: scale(1.12) !important;
      opacity: 1 !important;
    }
    #pip-floating-btn svg {
      width: 24px !important;
      height: 24px !important;
      fill: #fff !important;
      display: block !important;
      pointer-events: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(styleEl);

  // ── ボタン生成（body に一個だけ置く）──────────────────
  const btn = document.createElement('button');
  btn.id = 'pip-floating-btn';
  btn.title = 'ピクチャーインピクチャー';
  btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0
     2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-8-7h7v5h-7v-5z"/>
  </svg>`;
  document.body.appendChild(btn);

  // ── 状態管理 ──────────────────────────────────────────
  let currentVideo  = null;   // ホバー中 or PiP 対象の video
  let hideTimer     = null;
  let rafId         = null;
  let lastRect      = null;

  // ── ボタン位置をビデオ右上に追従 ──────────────────────
  function positionBtn(video) {
    const r = video.getBoundingClientRect();
    // ビューポート外・非表示なら隠す
    if (r.width < 80 || r.height < 50 || r.bottom < 0 || r.top > window.innerHeight) {
      btn.classList.remove('pip-visible');
      return;
    }
    const x = r.right  - BTN_SIZE - OFFSET;
    const y = r.top    + OFFSET;
    btn.style.left = `${x}px`;
    btn.style.top  = `${y}px`;
    btn.classList.add('pip-visible');
  }

  function startTracking(video) {
    stopTracking();
    currentVideo = video;
    function loop() {
      if (!currentVideo) return;
      const r = currentVideo.getBoundingClientRect();
      // 位置が変わったときだけ更新（パフォーマンス配慮）
      if (!lastRect ||
          lastRect.top !== r.top || lastRect.left !== r.left ||
          lastRect.width !== r.width || lastRect.height !== r.height) {
        lastRect = r;
        positionBtn(currentVideo);
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  function stopTracking() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    lastRect = null;
  }

  // ── ページ内で最適な動画を探す ────────────────────────
  // 再生中 → 最大面積 → 先頭、の優先順で選ぶ
  function findBestVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (!videos.length) return null;
    const candidates = videos.filter(v => {
      const r = v.getBoundingClientRect();
      return r.width >= 80 && r.height >= 50;
    });
    if (!candidates.length) return videos[0];
    // 再生中を優先
    const playing = candidates.filter(v => !v.paused && !v.ended);
    const pool = playing.length ? playing : candidates;
    // 面積最大を返す
    return pool.reduce((best, v) => {
      const r = v.getBoundingClientRect();
      const br = best.getBoundingClientRect();
      return r.width * r.height > br.width * br.height ? v : best;
    });
  }

  // ── disablePictureInPicture 属性を除去 ────────────────
  function unlockVideo(video) {
    if (video.hasAttribute('disablePictureInPicture') ||
        video.disablePictureInPicture === true) {
      video.removeAttribute('disablePictureInPicture');
      video.disablePictureInPicture = false;
    }
  }

  // ── ビデオへのホバー検出（mouseover / mouseout）────────
  function onMouseOver(e) {
    const video = e.target.closest
      ? e.target.closest('video')
      : (e.target.tagName === 'VIDEO' ? e.target : null);
    if (!video) return;

    clearTimeout(hideTimer);

    // PiP 中の動画は常に追従済みなので上書きしない
    if (document.pictureInPictureElement && document.pictureInPictureElement !== video) return;

    unlockVideo(video);
    startTracking(video);
  }

  function onMouseOut(e) {
    // PiP 中なら消さない
    if (document.pictureInPictureElement) return;
    // ボタン自体へ移動した場合も消さない
    if (e.relatedTarget === btn) return;

    hideTimer = setTimeout(() => {
      if (!document.pictureInPictureElement) {
        btn.classList.remove('pip-visible');
        stopTracking();
        currentVideo = null;
      }
    }, 300);
  }

  // ボタンからビデオに戻っても消えないよう
  btn.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  btn.addEventListener('mouseleave', () => {
    if (!document.pictureInPictureElement) {
      hideTimer = setTimeout(() => {
        btn.classList.remove('pip-visible');
        stopTracking();
        currentVideo = null;
      }, 300);
    }
  });

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout',  onMouseOut,  true);

  // ── PiP 切り替え ──────────────────────────────────────
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!document.pictureInPictureEnabled) {
      alert('このブラウザはピクチャーインピクチャーをサポートしていません。');
      return;
    }

    // currentVideo が取れていない場合、ページ内で最適な動画を探す
    const target = currentVideo
      || document.pictureInPictureElement
      || findBestVideo();
    if (!target) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        unlockVideo(target);
        await target.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('[PiP UserScript]', err);
    }
  });

  // ── PiP 開始 / 終了イベント ────────────────────────────
  document.addEventListener('enterpictureinpicture', (e) => {
    currentVideo = e.target;
    startTracking(currentVideo);
    btn.classList.add('pip-active');
    btn.title = 'ピクチャーインピクチャーを終了';
  });

  document.addEventListener('leavepictureinpicture', () => {
    btn.classList.remove('pip-active', 'pip-visible');
    btn.title = 'ピクチャーインピクチャー';
    stopTracking();
    currentVideo = null;
  });

  // ── スクロール・リサイズ時も位置を即時更新 ────────────
  window.addEventListener('scroll', () => {
    if (currentVideo) positionBtn(currentVideo);
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (currentVideo) positionBtn(currentVideo);
  }, { passive: true });

})();
