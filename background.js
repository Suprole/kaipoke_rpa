// 拡張機能のバックエンドファイル
// ページ更新とかに関係なく常駐している
// 自動操作の進行管理はここで行う


// 変数定義
let currentUrl = '';
let currentTabId = null;
let isLoadedContentScript = false; 
let progressStatus = { completed: 0, total: 0 };
let errorLog = [];

// 選択されたユーザー全体に対する確定実行管理関数
async function manageFixReflection(userIds, isDeductionTarget) {
  try {
    if (!currentUrl.startsWith('https://r.kaipoke.biz/bizhnc/monthlyShiftsList')){
      console.log('月間スケジュール管理ページ以外で行おうとしています。')
      throw new Error('月間スケジュール管理ページ以外で行おうとしています。')
    }

    progressStatus = { completed: 0, total: userIds.length };
    errorLog = [];
    updatePopup();

    for (const userId of userIds) {
      try {
        const result = await fixProcessUser(userId, isDeductionTarget);
        progressStatus.completed++;
        if (result.resultCare && result.resultCare.status !== 'success') {
          errorLog.push({ userId, message: result.resultCare.result.message });
        }
        if (result.resultMedical && result.resultMedical.status !== 'success') {
          errorLog.push({ userId, message: result.resultMedical.result.message });
        }
      } catch (error) {
        throw new Error(`Error for user ${userId}: ${error.message}`);
      }
      await waitForTabUpdate(currentTabId);
      await sendMessageWithRetry(currentTabId, { action: "uncheckUserCheckbox", userId: userId });
      await waitForTabUpdate(currentTabId);
      await updatePopup();
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

    progressStatus = { completed: 0, total: userIds.length };
    errorLog = [];
    updatePopup();

    for (const userId of userIds) {
      try {
        await cancelProcessUser(userId);
        progressStatus.completed++;
      } catch (error) {
        errorLog.push({ userId, message: error.message });
      }
      await waitForTabUpdate(currentTabId);
      await sendMessageWithRetry(currentTabId, { action: "uncheckUserCheckbox", userId: userId });
      await waitForTabUpdate(currentTabId);
      await updatePopup();
    }


    return { success: true, message: "予実反映の解除が完了しました。" };
  } catch (error) {
    console.error("Error in manageCancelReflection:", error);
    return { success: false, message: `予実反映の解除中にエラーが発生しました: ${error.message}` };
  }
}
// test commit
// 一つのuserIdに対する解除の管理関数
async function fixProcessUser(userId, isDeductionTarget) {
  try {
    let resultCare = null;
    let resultMedical = null;
    console.log('isDeductionTarget: ', isDeductionTarget)


    await new Promise(resolve => setTimeout(resolve, 100));
    // await new Promise(resolve => setTimeout(resolve, 1000));
    await waitForTabUpdate(currentTabId);
    console.log(0)

    
    // プルダウンからユーザーを変更する
    console.log(`Changing user to ${userId}`);
    await sendMessageWithRetry(currentTabId, { action: "changePulldownUser", userId: userId });
    console.log('User changed, waiting for page to stabilize');

    
    // await new Promise(resolve => setTimeout(resolve, 1000));
    // await waitForContentScript();
    await waitForNavigation(currentTabId);
    console.log(1)
    
    
    // 保険区分をチェック
    const responseInsuranceCategory = await sendMessageWithRetry(currentTabId, { action: "checkInsuranceCategory" });
    console.log(responseInsuranceCategory.result);

    
    // 「介」以外の場合は次のユーザーへスキップ
    if (!['介', '医', '両'].includes(responseInsuranceCategory.result.result)){
      console.log('次のユーザーへスキップします。');
      return { 
        status: 'success',
        message: 'スキップしたユーザーです。'
      };
    }
    
    await waitForTabUpdate(currentTabId);
    console.log(2)


    // 「介」と「両」に対して行う
    if (['介', '両'].includes(responseInsuranceCategory.result.result)){
      // 訪問内容テキストを取得
      const responseServiceContents = await sendMessageWithRetry(currentTabId, { action: "getServiceContentsAndClickAdditionButton" });
      console.log(responseServiceContents.result)
      const careServiceContents = responseServiceContents.result.careServiceContents;
      const medicalServiceContents = responseServiceContents.result.medicalServiceContents;
      
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await waitForTabUpdate(currentTabId);
      console.log(22);
      
      // 加算処理
      if (careServiceContents.length !== 0 && medicalServiceContents.length === 0) {
        // 「介」のみの場合の加算処理
        const responseSelectCareAddition = await sendMessageWithRetry(
          currentTabId,
          { 
            action: "selectCareAddition",
            isDeductionTarget: isDeductionTarget,
            serviceContents: careServiceContents
          }
        );
        console.log(222, responseSelectCareAddition.result);
        // await waitForContentScript();
        await waitForNavigation(currentTabId);
  
      } 
      else if(careServiceContents.length === 0 && medicalServiceContents.length !== 0) {
        // 「医」のみの場合の加算処理（今後処理が増えたとき用）
        // 登録するボタンをクリック
        const responseClickFixAddition = await sendMessageWithRetry(currentTabId, { action: "clickFixAdditionButton" });

        console.log(2222, responseClickFixAddition.result);
        await waitForNavigation(currentTabId);
      }
      else if(careServiceContents.length !== 0 && medicalServiceContents.length !== 0) {
  
        // 「介」「医」両方ある場合の加算処理
        const responseSelectCareAddition = await sendMessageWithRetry(
          currentTabId,
          { 
            action: "selectCareAddition",
            isDeductionTarget: isDeductionTarget,
            serviceContents: careServiceContents
          }
        );
        console.log(222, responseSelectCareAddition.result);
        await waitForNavigation(currentTabId);
  
      } else {
        // 両方ない場合の処理（これはなんか不具合あるからエラー吐いたほうがいいかも）
      }
      
    }

    

    // 「介」「両」に対して行う
    if (['介', '両'].includes(responseInsuranceCategory.result.result)) {
      try {
        // ボタンをクリックして予定管理に実績を反映させる
        const responseClickReflectionActualButton = await sendMessageWithRetry(currentTabId, { action: "clickReflectActualButton", });
        console.log(responseClickReflectionActualButton.result)
        
        if (responseClickReflectionActualButton.result.status === 'buttonDisabled') {
          await waitForTabUpdate(currentTabId);
          console.log(3)
        } else {
          await new Promise(resolve => setTimeout(resolve, 100));
          await waitForNavigation(currentTabId);
          console.log(3)
        }
  
      } catch (error) {
        console.error('Error occurred while clicking cancel button:', error);
        await waitForContentScript();
        console.log(4)
      }
    }


    

    // リンクをクリックして予定実績管理ページへ遷移
    await sendMessageWithRetry(currentTabId, { action: "clickPlanActualLink", });
    
    // if (['介', '両'].includes(responseInsuranceCategory.result.result)){
    //   await new Promise(resolve => setTimeout(resolve, 1000));
    // }
    // await waitForContentScript();
    await waitForNavigation(currentTabId);
    console.log(5)


    // 1年減算があるかどうかをチェック
    if (['介', '両'].includes(responseInsuranceCategory.result.result)) {
      const responseCheckIsYearDeduction = await sendMessageWithRetry(currentTabId, { action: "checkIsYearDeduction" });
      console.log('1年減算対象かどうか:', responseCheckIsYearDeduction.result);
      
      // 1年減算対象の場合別フローを追加
      if (responseCheckIsYearDeduction.result.isYearDeductionUser) {
        // リンクをクリックして月間スケジュール管理ページへ遷移
        await sendMessageWithRetry(currentTabId, { action: "clickMonthlyScheduleLink", });
  
        // ページ遷移後の安定を待つ
        await waitForNavigation(currentTabId);
        console.log(8);  
  
  
        // 訪問内容テキストを取得
        const responseServiceContents = await sendMessageWithRetry(currentTabId, { action: "getServiceContentsAndClickAdditionButton" });
        console.log(responseServiceContents.result)
        const careServiceContents = responseServiceContents.result.careServiceContents;
        
        
        // await new Promise(resolve => setTimeout(resolve, 1000));
        await waitForTabUpdate(currentTabId);
        console.log(22);
  
        
        // 1年減算にチェックを入れて確定
        const responseSelectYearDeduction = await sendMessageWithRetry(
            currentTabId,
            { 
              action: "selectYearDeduction",
              isDeductionTarget: isDeductionTarget,
              serviceContents: careServiceContents
            }
        );
  
  
        
        console.log(222, responseSelectYearDeduction.result);
        await waitForNavigation(currentTabId);
  
  
        try {
          // ボタンをクリックして予定管理に実績を反映させる
          const responseClickReflectionActualButton = await sendMessageWithRetry(currentTabId, { action: "clickReflectActualButton", });
          console.log(responseClickReflectionActualButton.result)
          
          if (responseClickReflectionActualButton.result.status === 'buttonDisabled') {
            await waitForTabUpdate(currentTabId);
            console.log(3)
          } else {
            await new Promise(resolve => setTimeout(resolve, 100));
            await waitForContentScript();
            console.log(3)
          }
  
        } catch (error) {
          console.error('Error occurred while clicking cancel button:', error);
          await waitForContentScript();
          console.log(4)
        }
  
  
        // リンクをクリックして予定実績管理ページへ遷移
        await sendMessageWithRetry(currentTabId, { action: "clickPlanActualLink", });
        
        
        // await new Promise(resolve => setTimeout(resolve, 1000));
        await waitForNavigation(currentTabId);
        console.log(5)
      }
    }
    
    
    if (['介', '両'].includes(responseInsuranceCategory.result.result)) {
      // 実績確定ボタンをおしつつ状態を確認
      const fixResult = await sendMessageWithRetry(currentTabId, { action: "clickFixActualButton", });
      console.log(fixResult)
  
  
      if (fixResult.result.status === 'fixActual'){
        await waitForNavigation(currentTabId);
        console.log(6)
      } else {
        await waitForTabUpdate(currentTabId);
        console.log(6)
      }
  
      //確認ログから実行結果を取得
      resultCare = await sendMessageWithRetry(currentTabId, { action: "fetchFixResult" });
      console.log(resultCare.result)
      
      await waitForTabUpdate(currentTabId);
      console.log(7)
    }

    if (['医', '両'].includes(responseInsuranceCategory.result.result)) {
      // 算定ボタンをおす
      const calculateResult = await sendMessageWithRetry(currentTabId, { action: "clickCalculateButton", });
      console.log(calculateResult.result)

      if(calculateResult.result.status === 'clicked'){
        // await new Promise(resolve => setTimeout(resolve, 1000));
        await waitForNavigation(currentTabId);
        console.log(9)
      }else{
        await waitForTabUpdate(currentTabId);
        console.log(9)
      }
      
      
      // await new Promise(resolve => setTimeout(resolve, 100));
      // レセプト作成ボタンをおす
      const makeReceiptResult = await sendMessageWithRetry(currentTabId, { action: "clickMakeReceiptButton", });
      console.log(makeReceiptResult.result)
  
      if(makeReceiptResult.result.status === 'cilcked'){
        // await new Promise(resolve => setTimeout(resolve, 1000));
        await waitForNavigation(currentTabId);
        console.log(9)
      }else{
        await waitForTabUpdate(currentTabId);
        console.log(9)
      }
  
      //確認ログから実行結果を取得
      resultMedical = await sendMessageWithRetry(currentTabId, { action: "fetchFixResult" });
      console.log(resultMedical.result)
      
      await waitForTabUpdate(currentTabId);
      console.log(11)
    }



    // リンクをクリックして月間スケジュール管理ページへ遷移
    await sendMessageWithRetry(currentTabId, { action: "clickMonthlyScheduleLink", });

    // ページ遷移後の安定を待つ
    await waitForNavigation(currentTabId);
    console.log(12)    


    return {resultCare: resultCare, resultMedical: resultMedical};

  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
    throw error;
  }
}


// 一つのuserIdに対する解除の管理関数
async function cancelProcessUser(userId) {
  try {
    await new Promise(resolve => setTimeout(resolve, 100));
    await waitForTabUpdate(currentTabId);
    console.log(0)    
    
    
    // 一致しない場合はプルダウンから変更し、遷移を待つ
    console.log(`Changing user to ${userId}`);
    await sendMessageWithRetry(currentTabId, { action: "changePulldownUser", userId: userId });
    console.log('User changed, waiting for page to stabilize');
    
    // ページ遷移後の安定を待つ
    // await new Promise(resolve => setTimeout(resolve, 1000));
    // await waitForContentScript();
    await waitForNavigation(currentTabId);
    console.log(1)   
    
    // 保険区分をチェック
    const responseInsuranceCategory = await sendMessageWithRetry(currentTabId, { action: "checkInsuranceCategory", });
    console.log(responseInsuranceCategory.result.result);
    
    // 「介」以外の場合は次のユーザーへスキップ
    if (!['介', '両', '医'].includes(responseInsuranceCategory.result.result)){
      console.log('保険適用者ではありません。次のユーザーへスキップします。');
      return;
    }

    // // 全ての加算チェックボックスを削除
    // // 訪問内容テキストを取得
    // const responseServiceContents = await sendMessageWithRetry(currentTabId, { action: "getServiceContentsAndClickAdditionButton" });
    // console.log(responseServiceContents.result)
    // const careServiceContents = responseServiceContents.result.careServiceContents;
    // const medicalServiceContents = responseServiceContents.result.medicalServiceContents;
    
    
    // await new Promise(resolve => setTimeout(resolve, 1000));
    // await waitForTabUpdate(currentTabId);
    // console.log(22);
    
    // // 加算処理
    // if (careServiceContents.length !== 0 && medicalServiceContents.length === 0) {
    //   // 「介」のみの場合の加算処理
    //   // 全てのチェックボックスを外す
    //   // const responseRemoveAdditionCheckbox = await sendMessageWithRetry( currentTabId, { action: "removeAdditionCheckbox" });
      
    //   // console.log(222, responseRemoveAdditionCheckbox.result);
    //   // await new Promise(resolve => setTimeout(resolve, 500));
    //   // await waitForTabUpdate(currentTabId);

    //   // 登録するボタンをクリック
    //   const responseClickFixAddition = await sendMessageWithRetry(currentTabId, { action: "clickFixAdditionButton" });

    //   console.log(2222, responseClickFixAddition.result);
    //   await waitForNavigation(currentTabId);

    // } else if(careServiceContents.length === 0 && medicalServiceContents.length !== 0) {
    //   // 「医」のみの場合の加算処理
    //   // 登録するボタンをクリック
    //   const responseClickFixAddition = await sendMessageWithRetry(currentTabId, { action: "clickFixAdditionButton" });

    //   console.log(2222, responseClickFixAddition.result);
    //   await waitForNavigation(currentTabId);

    // } else if(careServiceContents.length !== 0 && medicalServiceContents.length !== 0) {
    //   // 「介」「医」両方ある場合の加算処理
    //    // 全てのチェックボックスを外す
    //   // const responseRemoveAdditionCheckbox = await sendMessageWithRetry( currentTabId, { action: "removeAdditionCheckbox" });

    //   // console.log(222, responseRemoveAdditionCheckbox.result);
    //   // await waitForTabUpdate(currentTabId);

    //   // 登録するボタンをクリック
    //   const responseClickFixAddition = await sendMessageWithRetry(currentTabId, { action: "clickFixAdditionButton" });

    //   console.log(222, responseClickFixAddition.result);
    //   await waitForNavigation(currentTabId);
    // } else {
    //   // 両方ない場合の処理（これはなんか不具合あるからエラー吐いたほうがいいかも）
    // }


    // if (['介', '両'].includes(responseInsuranceCategory.result.result)) {
    //   try {
    //     // ボタンをクリックして予定管理に実績を反映させる
    //     const responseClickReflectionActualButton = await sendMessageWithRetry(currentTabId, { action: "clickReflectActualButton", });
    //     console.log(responseClickReflectionActualButton.result)
        
    //     if (responseClickReflectionActualButton.result.status === 'buttonDisabled') {
    //       await waitForTabUpdate(currentTabId);
    //       console.log(3)
    //     } else {
    //       await new Promise(resolve => setTimeout(resolve, 100));
    //       await waitForNavigation(currentTabId);
    //       console.log(3)
    //     }
  
    //   } catch (error) {
    //     console.error('Error occurred while clicking cancel button:', error);
    //     await waitForContentScript();
    //     console.log(4)
    //   }
    // }


    // リンクをクリックして予定実績管理ページへ遷移
    console.log(`navigate to plan actual page`);
    await sendMessageWithRetry(currentTabId, { action: "clickPlanActualLink", });
    console.log('waiting for page to stabilize');
    
    
    await waitForNavigation(currentTabId);
    console.log(2)    


    if (['介', '両'].includes(responseInsuranceCategory.result.result)){
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
    }

    if (['医', '両'].includes(responseInsuranceCategory.result.result)){
      // レセプト削除ボタンをおす
      const deleteReceiptResult = await sendMessageWithRetry(currentTabId, { action: "clickDeleteReceiptButton", });
      console.log(deleteReceiptResult.result)
  
      if (deleteReceiptResult.result.status === 'clicked'){
        await waitForNavigation(currentTabId);
        console.log(10)
      } else{
        await waitForTabUpdate(currentTabId);
        console.log(10)
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
// ポップアップを更新する関数
async function updatePopup() {
  await sendMessageWithRetry(currentTabId, {
    action: "updateStatus",
    progressStatus,
    errorLog
  });
}

// 実行ボタンがおされると走る
function startAllFixReflectionListener(tabId, userIds, isDeductionTarget) {
  currentTabId = tabId;
  manageFixReflection(userIds, isDeductionTarget)
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
        setTimeout(checkLoadStatus, 100);
      }
    }
    
    checkLoadStatus();
  }).catch(error => {
    console.error('waitForContentScript error:', error);
    throw error; // エラーを再スローして、呼び出し元で捕捉できるようにする
  });
}

// ページ遷移の完了を待機する関数
function waitForNavigation(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const navigationListener = (details) => {
      if (details.tabId === tabId && details.frameId === 0) {
        chrome.webNavigation.onCompleted.removeListener(navigationListener);
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

// undefined対策を含めたsendMessageWithRetry
async function checkExistElementWithRetry(currentTabId, action, maxRetries = 3, retryDelay = 1000) {
  let retries = 0;
  let response;

  while (retries < maxRetries) {
    response = await sendMessageWithRetry(currentTabId, { action: action });
    
    if (response && response.result !== undefined) {
      console.log('1年減算対象かどうか:', response.result);
      return response.result;
    }

    console.log(`試行 ${retries + 1} 失敗。再試行します...`);
    retries++;
    
    if (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  console.error(`${maxRetries}回の試行後も有効な応答を得られませんでした。`);
  return null; // または適切なデフォルト値やエラー処理
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
    startAllFixReflectionListener(sender.tab.id, request.userIds, request.isDeductionTarget)
    sendResponse({success: true});
    return true;
  }

  // 進行状況とエラーログの取得要求を受け取ったとき
  if (request.action === "getStatus") {
    sendResponse({ progressStatus, errorLog });
    return true;
  }

  // ページ読み込み完了を受け取ったとき
  if (request.action === "contentScriptReady") {
    currentTabId = sender.tab.id;
    console.log('currentTabId: ', currentTabId)
    isLoadedContentScript = true;
    return true
  }
});

