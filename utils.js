const baseUrl = chrome.runtime.getURL('');

// 月間管理ページかどうかチェックする関数
// function isMonthlySchedulePage() {
//     return window.location.href.startsWith('https://r.kaipoke.biz/bizhnc/monthlyShiftsList/');
// }
  
// デバッグメッセージ用関数
function debugLog(message) {
    console.log(`[DEBUG ${new Date().toISOString()}] ${message}`);
}

// 現在のURLを取得する関数
async function getCurrentUrl() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({action: "getCurrentUrl"}, (response) => {
        resolve(response.url);
      });
    });
}
  
// 特定の要素の出現を待ち、見つける関数
function waitForElement(selector, timeout = 10000) {
    debugLog(`waitForElement 開始: セレクタ=${selector}, タイムアウト=${timeout}ms`);
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      function checkElement() {
        const element = document.querySelector(selector);
        if (element) {
          debugLog(`要素が見つかりました: ${selector}`);
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          debugLog(`タイムアウト: 要素 ${selector} が見つかりませんでした`);
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        } else {
          setTimeout(checkElement, 100);
        }
      }
      
      checkElement();
    });
}

// モーダルを表示させ、出現を待つ関数
function waitForModal() {
    return new Promise(resolve => {
      const observer = new MutationObserver(mutations => {
        const modal = document.getElementById('servicePoppup_layout');
        if (modal && window.getComputedStyle(modal).display !== 'none') {
          observer.disconnect();
          resolve();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      });
    });
}
  
// モーダルを閉じる関数
function waitForModalClose() {
    return new Promise(resolve => {
      const observer = new MutationObserver(mutations => {
        const modal = document.getElementById('servicePoppup_layout');
        if (!modal || window.getComputedStyle(modal).display === 'none') {
          observer.disconnect();
          resolve();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      });
    });
}

export { debugLog, waitForElement, getCurrentUrl, waitForModal, waitForModalClose};