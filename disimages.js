// ==UserScript==
// @name         Disable Images
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hide all images on every page by removing <img> elements and disabling background images.
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const css = `
        img, picture, svg, [style*="background-image"] {
            display: none !important;
            visibility: hidden !important;
            background-image: none !important;
        }
        * {
            background-image: none !important;
        }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head?.appendChild(style);

    const removeImages = () => {
        document.querySelectorAll('img, picture, svg').forEach(node => {
            node.style.display = 'none';
            node.style.visibility = 'hidden';
        });
    };

    removeImages();
    new MutationObserver(removeImages).observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
})();
