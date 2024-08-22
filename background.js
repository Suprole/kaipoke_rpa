let currentUrl = '';
let currentTabId = null;
let currentUserId = null;
let shouldFireOnCompleted = false;
let clickedCancelButton = false;



// 解除実行管理
async function manageCancelReflection(userIds) {
  try {
    for (const userId of userIds) {
      await processUser(userId);
    }
    return { success: true, message: "予実反映の解除が完了しました。" };
  } catch (error) {
    console.error("Error in manageCancelReflection:", error);
    return { success: false, message: `予実反映の解除中にエラーが発生しました: ${error.message}` };
  }
}

async function processUser(userId) {
  try {
    const responseMatchedUser = await new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, { action: "checkSelectedUser", userId: userId }, resolve);
    });
    console.log(1, responseMatchedUser.result.isMatched);
    
    if (!responseMatchedUser.result.isMatched) {
      console.log(`Changing user to ${userId}`);
      new Promise((resolve) => {
        chrome.tabs.sendMessage(currentTabId, { action: "changePulldownUser", userId: userId }, resolve);
      });
      console.log('User changed, waiting for page to stabilize');
      
      // ページ遷移後の安定を待つ
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const responseInsuranceCategory = await new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, {action: "checkInsuranceCategory"}, resolve);
    });
    console.log(responseInsuranceCategory.result);
    
  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
    throw error;
  }
}


// 関数
// 解除開始メッセージを受けたときに実行される
function startNavigationListener(tabId, userId) {
  currentTabId = tabId;
  currentUserId = userId;
  shouldFireOnCompleted = true; // フラグをtrueに設定
}

// 実績解除ボタンが押されたときに実行される
function clickedCancelButtonListener(tabId, userId) {
  currentTabId = tabId;
  currentUserId = userId;
  clickedCancelButton = true; // フラグをtrueに設定
}

function startAllCancelReflectionListener(tabId, userIds) {
  currentTabId = tabId;
  manageCancelReflection(userIds)
}


// 遷移管理
// 自動遷移かつ実績管理ページへの遷移で発火し、解除のロジックを実行する
chrome.webNavigation.onCompleted.addListener((details) => {
  if (shouldFireOnCompleted && details.tabId === currentTabId && details.url.includes('plan_actual')) {
    setTimeout(() => {
      chrome.tabs.sendMessage(currentTabId, { action: "continueCancelReflection", userId: currentUserId });
      shouldFireOnCompleted = false; // リセット
    }, 1000);
  }
  if (clickedCancelButton && details.tabId === currentTabId && details.url.includes('plan_actual')) {
    setTimeout(() => {
      chrome.tabs.sendMessage(currentTabId, { action: "", userId: currentUserId });
      clickedCancelButton = false; // リセット
    }, 1000);
  }
  
});

// タブの更新を監視
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://r.kaipoke.biz/')) {
    currentUrl = tab.url;
    currentTabId = tab.id
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

  // 全体の解除開始の通知を受け取ったとき
  if (request.action === "startAllCancelReflection") {
    currentTabId = sender.tab.id;
    startAllCancelReflectionListener(sender.tab.id, request.userIds)
    sendResponse({success: true});
    return true;
  }

  // 個人の解除開始の通知を受けとったとき
  if (request.action === "startCancelReflection") {
    currentTabId = sender.tab.id;
    startNavigationListener(sender.tab.id, request.userId);
    sendResponse({success: true});
    return true;
  }
  
  // 実績解除ボタンが押された通知
  if (request.action === "clickedCancelButton") {
    currentTabId = sender.tab.id;
    clickedCancelButtonListener(sender.tab.id, request.userId);
    sendResponse({success: true});
    return true;
  }


});



// // csp対策
// chrome.webRequest.onHeadersReceived.addListener(function(detail){
//   const headers = detail.responseHeaders.filter(e => e.name !== "content-security-policy")
//   return {responseHeaders: headers}
// }, {urls: ["<all_urls>"]}, ["blocking", "responseHeaders"])