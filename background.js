// 拡張機能のバックエンドファイル
// ページ更新とかに関係なく常駐している
// 自動操作の進行管理はここで行う


// 変数定義
let currentUrl = '';
let currentTabId = null;

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

// 一つのuserIdに対する解除の管理関数
async function fixProcessUser(userId) {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await waitForTabUpdate(currentTabId);
    console.log(0, 'タブの更新が完了しました')

    
    const responseMatchedUser = await new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, { action: "checkSelectedUser", userId: userId }, resolve);
    });
    console.log(1, responseMatchedUser.result);
    
    // 一致しない場合はプルダウンから変更し、遷移を待つ
    if (!responseMatchedUser.result.isMatched) {
      console.log(`Changing user to ${userId}`);
      await new Promise((resolve) => {
        chrome.tabs.sendMessage(currentTabId, { action: "changePulldownUser", userId: userId }, resolve);
      });
      console.log('User changed, waiting for page to stabilize');
      
      // ページ遷移後の安定を待つ
      await new Promise(resolve => setTimeout(resolve, 1300));
      await waitForTabUpdate(currentTabId);
      console.log(1, 'タブの更新が完了しました')
    }
    
    // 保険区分をチェック
    const responseInsuranceCategory = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(currentTabId, { action: "checkInsuranceCategory" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    console.log(responseInsuranceCategory.result);
    
    // 「介」以外の場合は次のユーザーへスキップ
    if (responseInsuranceCategory.result.result !== '介'){
      console.log('介護保険適用者ではありません。次のユーザーへスキップします。');
      return;
    }
    

    // 1秒待機で安定を待つ
    await new Promise(resolve => setTimeout(resolve, 1000));
    await waitForTabUpdate(currentTabId);
    // await waitForTabUpdateAndContentScript(currentTabId);
    console.log(2, 'タブの更新が完了しました')


    try {
      // ボタンをクリックして予定管理に実績を反映させる
      console.log("click reflect Actual Button");
      await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(currentTabId, { action: "clickReflectActualButton" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      // ページ遷移後の安定を待つ
      console.log('waiting for page to stabilize');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await waitForTabUpdate(currentTabId);
      console.log(3, 'タブの更新が完了しました')

    } catch (error) {
      console.error('Error occurred while clicking cancel button:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await waitForTabUpdate(currentTabId);
      console.log(4, 'タブの更新が完了しました')
    }

    

    // リンクをクリックして予定実績管理ページへ遷移
    console.log(`navigate to plan actual page`);
    await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(currentTabId, { action: "clickPlanActualLink" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    console.log('waiting for page to stabilize');
    
    // ページ遷移後の安定を待つ
    await new Promise(resolve => setTimeout(resolve, 1000));
    await waitForTabUpdate(currentTabId);
    console.log(5, 'タブの更新が完了しました')


    // 実績確定ボタンをおしつつ状態を確認
    const fixResult = await new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, { action: "clickFixActualButton" }, resolve);
    });
    console.log(1, fixResult)

    // ページ遷移後の安定を待つ
    await new Promise(resolve => setTimeout(resolve, 1500));
    await waitForTabUpdate(currentTabId);
    console.log(6, 'タブの更新が完了しました')


    // リンクをクリックして月間スケジュール管理ページへ遷移
    console.log(`navigate to monthly schedule page`);
    await new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, { action: "clickMonthlyScheduleLink"}, resolve);
    });
    console.log('waiting for page to stabilize');

    // ページ遷移後の安定を待つ
    await new Promise(resolve => setTimeout(resolve, 2000));
    await waitForTabUpdate(currentTabId);
    console.log(7, 'タブの更新が完了しました')    


  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
    throw error;
  }
}


// 選択されたユーザー全体に対する解除実行管理関数
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

// 一つのuserIdに対する解除の管理関数
async function cancelProcessUser(userId) {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await waitForTabUpdate(currentTabId);
    // await waitForTabUpdateAndContentScript(currentTabId);
    console.log(0, 'タブの更新が完了しました')
    

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
      await new Promise(resolve => setTimeout(resolve, 1000));
      await waitForTabUpdate(currentTabId);
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    await waitForTabUpdate(currentTabId);


    // 実績管理ページの実績が完全になくなるまで以下を繰り返す
    console.log(`Attempting to click cancel Actual Button`);
    let cancelStatus = '';

    while (cancelStatus !== 'notExistActual') {
      try {
        // 1秒待機で安定を待つ
        console.log(1)
        await new Promise(resolve => setTimeout(resolve, 1000));
        await waitForTabUpdate(currentTabId);
        // await waitForTabUpdateAndContentScript(currentTabId);

        // 実績ボタンを解除しつつ状態を確認
        console.log(2)
        const cancelResult = await new Promise((resolve) => {
          chrome.tabs.sendMessage(currentTabId, { action: "clickCancelActualButton" }, resolve);
        });
        console.log(5, cancelResult)
        
        // 1秒待機で安定を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        await waitForTabUpdate(currentTabId);

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
        await waitForTabUpdate(currentTabId);


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
    await new Promise(resolve => setTimeout(resolve, 2000));
    await waitForTabUpdate(currentTabId);


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

  // 全体の確定開始の通知を受け取ったとき
  if (request.action === "startAllFixReflection") {
    currentTabId = sender.tab.id;
    startAllFixReflectionListener(sender.tab.id, request.userIds)
    sendResponse({success: true});
    return true;
  }
});

