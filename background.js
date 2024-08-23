// 拡張機能のバックエンドファイル
// ページ更新とかに関係なく常駐している
// 自動操作の進行管理はここで行う


// 変数定義
let currentUrl = '';
let currentTabId = null;


// 選択されたユーザー全体に対する解除実行管理関数
async function manageCancelReflection(userIds) {
  try {
    if (!currentUrl.startsWith('https://r.kaipoke.biz/bizhnc/monthlyShiftsList')){
      console.log('月間スケジュール管理ページ以外で行おうとしています。')
      throw new Error('月間スケジュール管理ページ以外で行おうとしています。')
    }

    for (const userId of userIds) {
      await processUser(userId);
    }
    return { success: true, message: "予実反映の解除が完了しました。" };
  } catch (error) {
    console.error("Error in manageCancelReflection:", error);
    return { success: false, message: `予実反映の解除中にエラーが発生しました: ${error.message}` };
  }
}

// 一つのuserIdに対する解除の管理関数
async function processUser(userId) {
  try {
    // プルダウンの選択ユーザーと処理ユーザーが一致するか
    const responseMatchedUser = await new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, { action: "checkSelectedUser", userId: userId }, resolve);
    });
    console.log(1, responseMatchedUser.result.isMatched);
    
    // 一致しない場合はプルダウンから変更し、遷移を待つ
    if (!responseMatchedUser.result.isMatched) {
      console.log(`Changing user to ${userId}`);
      new Promise((resolve) => {
        chrome.tabs.sendMessage(currentTabId, { action: "changePulldownUser", userId: userId }, resolve);
      });
      console.log('User changed, waiting for page to stabilize');
      
      // ページ遷移後の安定を待つ
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 保険区分をチェック
    const responseInsuranceCategory = await new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, {action: "checkInsuranceCategory"}, resolve);
    });
    console.log(responseInsuranceCategory.result.result);
    
    // 「介」以外の場合は次のユーザーへスキップ
    if (responseInsuranceCategory.result.result !== '介'){
      console.log('介護保険適用者ではありません。次のユーザーへスキップします。');
      return;
    }

    // リンクをクリックして予定実績管理ページへ遷移
    console.log(`navigate to plan actual page`);
    new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, { action: "clickPlanActualLink"}, resolve);
    });
    console.log('waiting for page to stabilize');
    
    // ページ遷移後の安定を待つ
    await new Promise(resolve => setTimeout(resolve, 2000));



    // 実績管理ページの実績が完全になくなるまで以下を繰り返す
    console.log(`Attempting to click cancel Actual Button`);
    let cancelStatus = '';

    while (cancelStatus !== 'notExistActual') {
      try {
        // 1秒待機で安定を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 実績ボタンを解除しつつ状態を確認
        const cancelResult = await new Promise((resolve) => {
          chrome.tabs.sendMessage(currentTabId, { action: "clickCancelActualButton" }, resolve);
        });
        console.log(5, cancelResult)
        
        // 1秒待機で安定を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 解除の進行状況を保存
        cancelStatus = cancelResult.result.status;
        console.log(6, cancelStatus)
        console.log(`Cancel status: ${cancelStatus}, Message: ${cancelResult.result.message}`);
        
        // 全ての実績がない状態になればwhileをbreak
        if (cancelStatus === 'notExistActual') {
          break;
        }
        
        // サービス内容の削除処理
        console.log(`delete Service Contents`);
        await new Promise((resolve) => {
          chrome.tabs.sendMessage(currentTabId, { action: "deleteServiceContent"}, resolve);
        });
        
        // アラートのユーザーアクションを待つ
        console.log('waiting for page to stabilize');
        await new Promise(resolve => setTimeout(resolve, 1000));


      } catch (error) {
        console.error('Error occurred while clicking cancel button:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }


    // リンクをクリックして月間スケジュール管理ページへ遷移
    console.log(`navigate to monthly schedule page`);
    new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, { action: "clickMonthlyScheduleLink"}, resolve);
    });
    console.log('waiting for page to stabilize');

    // ページ遷移後の安定を待つ
    await new Promise(resolve => setTimeout(resolve, 1000));


  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
    throw error;
  }
}


// 関数定義
// 解除ボタンがおされると走る
function startAllCancelReflectionListener(tabId, userIds) {
  currentTabId = tabId;
  manageCancelReflection(userIds)
}



// ブラウザ動作関連
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
});



// // csp対策
// // 今の規格やとエラー吐く
// chrome.webRequest.onHeadersReceived.addListener(function(detail){
//   const headers = detail.responseHeaders.filter(e => e.name !== "content-security-policy")
//   return {responseHeaders: headers}
// }, {urls: ["<all_urls>"]}, ["blocking", "responseHeaders"])