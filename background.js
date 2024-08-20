let currentUrl = '';
let currentTabId = null;
let currentUserId = null;
let shouldFireOnCompleted = false;


// 関数
// 自動遷移の場合に実行される
function startNavigationListener(tabId, userId) {
  currentTabId = tabId;
  currentUserId = userId;
  shouldFireOnCompleted = true; // フラグをtrueに設定
}

// 自動遷移かつ実績管理ページへの遷移で発火し、解除のロジックを実行する
chrome.webNavigation.onCompleted.addListener((details) => {
  if (shouldFireOnCompleted && details.tabId === currentTabId && details.url.includes('plan_actual')) {
    setTimeout(() => {
      chrome.tabs.sendMessage(currentTabId, { action: "continueCancelReflection", userId: currentUserId });
      shouldFireOnCompleted = false; // リセット
    }, 1000);
  }
});

// タブの更新を監視
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://r.kaipoke.biz/')) {
    currentUrl = tab.url;
    console.log('Current URL updated:', currentUrl);
  }
});


// 拡張機能がクリックされると、フローティングポップアップを表示する
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.startsWith('https://r.kaipoke.biz/')) {
    chrome.tabs.sendMessage(tab.id, {action: "showFloatingPopup"});
  } else {
    console.log('Extension clicked on non-Kaipoke page or undefined URL');
    // オプション: ユーザーに通知を表示
    chrome.action.setPopup({popup: "This extension only works on Kaipoke pages."});
  }
});



// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // url取得
  if (request.action === "getCurrentUrl") {
    sendResponse({url: currentUrl});
    return true;  // 非同期レスポンスのために true を返す
  }

  // 解除開始
  if (request.action === "startCancelReflection") {
    currentTabId = sender.tab.id;
    startNavigationListener(sender.tab.id, request.userId);
    sendResponse({success: true});
    return true;
  }
  
  
});



// // csp対策
// chrome.webRequest.onHeadersReceived.addListener(function(detail){
//   const headers = detail.responseHeaders.filter(e => e.name !== "content-security-policy")
//   return {responseHeaders: headers}
// }, {urls: ["<all_urls>"]}, ["blocking", "responseHeaders"])