// ==UserScript==
// @name        Right Click Enable
// @namespace   http://tampermonkey.net/
// @version     1.1
// @grant       none
// @run-at      document-start
// ==/UserScript==

(function() {
    'use strict';

    const block = (e) => e.stopImmediatePropagation();
    const opts = { capture: true };

    // contextmenu を強制的に通す
    document.addEventListener('contextmenu', block, opts);

    // 選択・コピー系
    ['copy', 'cut', 'paste', 'selectstart', 'dragstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, block, opts);
    });

    // oncontextmenu 属性の除去（DOM構築後）
    document.addEventListener('DOMContentLoaded', () => {
        document.body?.removeAttribute('oncontextmenu');
        document.documentElement.removeAttribute('oncontextmenu');
    });

    // canvas への contextmenu を許可する（キャプチャ前に通す）
    window.addEventListener('contextmenu', (e) => {
        e.stopImmediatePropagation();
    }, true);
})();
