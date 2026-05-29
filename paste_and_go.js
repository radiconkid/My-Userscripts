// ==UserScript==
// @name         Paste and Go
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Read a URL from the clipboard and navigate the current page to it.
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const isUrl = (text) => {
        try {
            const url = new URL(text.trim());
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (e) {
            return false;
        }
    };

    const openClipboardUrlInCurrentPage = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) {
                alert('クリップボードにテキストがありません。');
                return;
            }
            const trimmed = text.trim();
            if (!isUrl(trimmed)) {
                alert('クリップボードに有効なURLが含まれていません。');
                return;
            }
            location.href = trimmed;
        } catch (error) {
            console.error('Clipboard read failed:', error);
            alert('クリップボードの読み取りに失敗しました。ブラウザの許可設定を確認してください。');
        }
    };

    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyV' && event.shiftKey && event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            openClipboardUrlInCurrentPage();
        }
    });
})();
