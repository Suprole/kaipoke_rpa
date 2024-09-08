// ページ更新とかに関係なく常駐している
// 自動操作の進行管理はここで行う


// 変数定義
let currentUrl = '';
let currentTabId = null;
let isLoadedContentScript = false; 

// 選択されたユーザー全体に対する確定実行管理関数
async function manageFixReflection(userIds) {
  try {
    if (!currentUrl.startsWith('https://r.kaipoke.biz/bizhnc/monthlyShiftsList')){
      console.log('月間スケジュール管理ページ以外で行おうとしています。')
      throw new Error('月間スケジュール管理ページ以外で行おうとしています。')
    }

    for (const userId of userIds) {
      await fixProcessUser(userId);
    }
    return { success: true, message: "予実反映の確定が完了しました。" };
  } catch (error) {
    console.error("Error in manageFixReflection:", error);
    return { success: false, message: `予実反映の確定中にエラーが発生しました: ${error.message}` };
  }
}

// 選択されたユーザー全体に対する確定実行管理関数
async function manageCancelReflection(userIds) {
  try {
    if (!currentUrl.startsWith('https://r.kaipoke.biz/bizhnc/monthlyShiftsList')){
      console.log('月間スケジュール管理ページ以外で行おうとしています。')
      throw new Error('月間スケジュール管理ページ以外で行おうとしています。')
    }

    for (const userId of userIds) {
      await cancelProcessUser(userId);
    }
    return { success: true, message: "予実反映の解除が完了しました。" };
  } catch (error) {
    console.error("Error in manageCancelReflection:", error);
    return { success: false, message: `予実反映の解除中にエラーが発生しました: ${error.message}` };
  }
}

//医療保険追加版
async function fixProcessUser(userId) {
  try {
    await waitForTabUpdate(currentTabId);
    console.log(`Processing user: ${userId}`);

    // プルダウンからユーザーを変更する
    console.log(`Changing user to ${userId}`);
    await sendMessageWithRetry(currentTabId, { action: "changePulldownUser", userId: userId });
    console.log('User changed, waiting for page to stabilize');

    //これしないと「医」でも「介」で取られる時がある
    await waitForNavigation(currentTabId);

    // 保険区分をチェック
    const responseInsuranceCategory = await sendMessageWithRetry(currentTabId, { action: "checkInsuranceCategory" });
    console.log(`Insurance category for user ${userId}: ${responseInsuranceCategory.result.result}`);

    switch(responseInsuranceCategory.result.result) {
      case '介':
        await processNursingCareUser(userId);
        break;
      case '医':
        await processMedicalUser(userId);
        break;
      default:
        console.log(`Skipping user ${userId} due to unsupported insurance category: ${responseInsuranceCategory.result.result}`);
    }

  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
    throw error;
  }
}

async function processNursingCareUser(userId) {
  console.log(`Processing nursing care user: ${userId}`);
  try {
    // ボタンをクリックして予定管理に実績を反映させる
    console.log("Clicking reflect Actual Button");
    const responseClickReflectionActualButton = await sendMessageWithRetry(currentTabId, { action: "clickReflectActualButton" });
    console.log(responseClickReflectionActualButton.result);

    if (responseClickReflectionActualButton.result.status === 'buttonDisabled') {
      await waitForTabUpdate(currentTabId);
    } else {
      await new Promise(resolve => setTimeout(resolve, 100));
      await waitForContentScript();
    }

    // リンクをクリックして予定実績管理ページへ遷移
    console.log(`Navigating to plan actual page`);
    await sendMessageWithRetry(currentTabId, { action: "clickPlanActualLink" });
    console.log('Waiting for page to stabilize');

    await waitForContentScript();

    // 実績確定ボタンをおしつつ状態を確認
    const fixResult = await sendMessageWithRetry(currentTabId, { action: "clickFixActualButton" });
    console.log("Fix result:", fixResult);

    if (fixResult.result.status === 'fixActual'){
      await waitForContentScript();
    } else {
      await waitForTabUpdate(currentTabId);
    }

    // リンクをクリックして月間スケジュール管理ページへ遷移
    console.log(`Navigating to monthly schedule page`);
    await sendMessageWithRetry(currentTabId, { action: "clickMonthlyScheduleLink" });
    console.log('Waiting for page to stabilize');

    // ページ遷移後の安定を待つ
    await waitForContentScript();

  } catch (error) {
    console.error(`Error processing nursing care user ${userId}:`, error);
    throw error;
  }
}

//waitForNavigationで安定化x
async function processMedicalUser(userId) {
  console.log(`Processing medical user: ${userId}`);
  try {
    // 1. 「予定実績管理へ」をクリック
    console.log(`Clicking plan actual link for user ${userId}`);
    await sendMessageWithRetry(currentTabId, { action: "clickPlanActualLink" });

    await waitForNavigation(currentTabId);

    // 2. 「算定する」ボタンを押す
    console.log(`Clicking calculate button for user ${userId}`);
    await sendMessageWithRetry(currentTabId, { action: "clickCalculateButton" });

    await waitForNavigation(currentTabId);

    // 3. 「レセプト作成する」ボタンを押す
    console.log(`Clicking create receipt button for user ${userId}`);
    await sendMessageWithRetry(currentTabId, { action: "clickCreateReceiptButton" });

    await waitForNavigation(currentTabId);

    // 4. 元のページに戻る
    console.log(`Returning to monthly schedule page for user ${userId}`);
    await sendMessageWithRetry(currentTabId, { action: "clickMonthlyScheduleLink" });

    await waitForNavigation(currentTabId);

  } catch (error) {
    console.error(`Error processing medical user ${userId}:`, error);
    throw error;
  }
}

// 一つのuserIdに対する解除の管理関数
async function cancelProcessUser(userId) {
  try {
    await waitForTabUpdate(currentTabId);
    console.log(0)

    // 一致しない場合はプルダウンから変更し、遷移を待つ
    console.log(`Changing user to ${userId}`);
    await sendMessageWithRetry(currentTabId, { action: "changePulldownUser", userId: userId });
    console.log('User changed, waiting for page to stabilize');

    // ページ遷移後の安定を待つ
    await waitForContentScript();
    console.log(1)

    // 保険区分をチェック
    const responseInsuranceCategory = await sendMessageWithRetry(currentTabId, { action: "checkInsuranceCategory", });
    console.log(responseInsuranceCategory.result.result);

    // 「介」以外の場合は次のユーザーへスキップ
    if (responseInsuranceCategory.result.result !== '介'){
      console.log('介護保険適用者ではありません。次のユーザーへスキップします。');
      return;
    }

    // リンクをクリックして予定実績管理ページへ遷移
    console.log(`navigate to plan actual page`);
    await sendMessageWithRetry(currentTabId, { action: "clickPlanActualLink", });
    console.log('waiting for page to stabilize');

    await waitForContentScript();
    console.log(2)


    // 実績管理ページの実績が完全になくなるまで以下を繰り返す
    console.log(`Attempting to click cancel Actual Button`);
    let cancelStatus = '';

    while (cancelStatus !== 'notExistActual') {
      try {
        await waitForTabUpdate(currentTabId);
        console.log(3)

        // 実績ボタンを解除しつつ状態を確認
        const cancelResult = await sendMessageWithRetry(currentTabId, { action: "clickCancelActualButton" });
        console.log(5, cancelResult)

        if(cancelResult.result.status === 'canceldActual'){
          await waitForContentScript();
          console.log(4)
        } else {
          await waitForTabUpdate(currentTabId);
          console.log(4)
        }

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
        await sendMessageWithRetry(currentTabId, { action: "deleteServiceContent", });

        await waitForContentScript();
        console.log(5)


      } catch (error) {
        console.error('Error occurred while clicking cancel button:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }


    // リンクをクリックして月間スケジュール管理ページへ遷移
    console.log(`navigate to monthly schedule page`);
    await sendMessageWithRetry(currentTabId, { action: "clickMonthlyScheduleLink", });
    console.log('waiting for page to stabilize');

    await waitForContentScript();
    console.log(6)


  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
    throw error;
  }
}


// 関数定義
// 実行ボタンがおされると走る
function startAllFixReflectionListener(tabId, userIds) {
  currentTabId = tabId;
  manageFixReflection(userIds)
}

// 解除ボタンがおされると走る
function startAllCancelReflectionListener(tabId, userIds) {
  currentTabId = tabId;
  manageCancelReflection(userIds)
}

// タブの更新完了を待機する関数
function waitForTabUpdate(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (tab.status === 'complete') {
        resolve(tab);
      } else {
        const listener = (updatedTabId, changeInfo, tab) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(tab);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      }
    });
  });
}

// ページ遷移の完了を待機する関数
function waitForNavigation(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const navigationListener = (details) => {
      if (details.tabId === tabId && details.frameId === 0) {
        chrome.webNavigation.onCompleted.removeListener(navigationListener);
        console.log("遷移完了")
        resolve(details.url);
      }
    };

    const timeoutId = setTimeout(() => {
      chrome.webNavigation.onCompleted.removeListener(navigationListener);
      reject(new Error("Navigation timeout"));
    }, timeout);

    chrome.webNavigation.onCompleted.addListener(navigationListener);

    // タブが存在しない場合のエラーハンドリング
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        clearTimeout(timeoutId);
        chrome.webNavigation.onCompleted.removeListener(navigationListener);
        reject(new Error(`Tab ${tabId} does not exist`));
      }
    });
  });

}

// タブの状態を確認して必要に応じてリロードする
async function ensureTabIsActive(tabId) {
  const tab = await new Promise(resolve => chrome.tabs.get(tabId, resolve));
  if (tab.status !== 'complete') {
    await new Promise(resolve => chrome.tabs.reload(tabId, {}, resolve));
    await waitForTabUpdate(tabId);
  }
}

// コンテントスクリプトの読み込みを待機する関数
function waitForContentScript(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function checkLoadStatus() {
      if (isLoadedContentScript) {
        isLoadedContentScript = false;
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error("Content script load timeout"));
      } else {
        setTimeout(checkLoadStatus, 100); // 100ミリ秒ごとに再チェック
      }
    }

    checkLoadStatus();
  });
}

// sendMessageを安定して送るための関数
async function sendMessageWithRetry(tabId, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    }
  }
}


// ブラウザ動作関連
// タブの更新を監視。独立して動作する
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
  console.log(request.action)

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

  // 全体の確定開始の通知を受け取ったとき
  if (request.action === "startAllFixReflection") {
    currentTabId = sender.tab.id;
    startAllFixReflectionListener(sender.tab.id, request.userIds)
    sendResponse({success: true});
    return true;
  }

  // ページ読み込み完了を受け取ったとき
  if (request.action === "contentScriptReady") {
    currentTabId = sender.tab.id;
    isLoadedContentScript = true;
    return true
  }
});
