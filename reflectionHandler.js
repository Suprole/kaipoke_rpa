//やること
// userIdの取得をここでしたい。もしくはcontentScriptで管理のほうがいい?


const baseUrl = chrome.runtime.getURL('');

const { wait, debugLog, getCurrentUrl, waitForElement, waitForModal, waitForModalClose } = await import(baseUrl + 'utils.js');
// 対象ユーザーをプルダウンから選択する
async function changePulldownUser(userId) {
    return new Promise((resolve, reject) => {
      const select = document.querySelector('.pulldownUser select');
      if (!select) {
        reject(new Error('ユーザー選択プルダウンが見つかりません。'));
        return;
      }

      // 値を変更し、changeイベントを発火
      select.value = userId;
      select.dispatchEvent(new Event('change'));

      resolve();
    });
}

function checkSelectedUser(userId) {
    const selectedOption = document.querySelector('.pulldownUser select.form-control option:checked');
    return { 
        isMatched: selectedOption ? selectedOption.value === userId : false 
    };
}
  

  
function checkInsuranceCategory() {
    const careSpan = document.querySelector('.icon-care');
    const medicalSpan = document.querySelector('.icon-medical');
    
    if (careSpan && careSpan.textContent.trim() === "介") {
      return { result: "介" };
    } else if (medicalSpan && medicalSpan.textContent.trim() === "医") {
      return { result: "医" };
    } else if (!careSpan && !medicalSpan) {
      return { result: "なし" };
    } else {
      return { result: "不明" };
    }
}

// 解除を実行する関数。popup.jsから呼ばれる
async function cancelReflection(userId) {
    try {
      // 現在のurlを取得
      const currentUrl = await getCurrentUrl();
      console.log(`[DEBUG] cancelReflection started for userId: ${userId}, current URL: ${currentUrl}`);
  
      // 月間管理ページじゃなかったらエラー吐く
      if (!currentUrl.includes('monthlyShiftsList')) {
        throw new Error('月間管理ページではないところで実行しようとしています。');
      }
  
      // 
    //   const targetUrl = "https://r.kaipoke.biz/kaipokebiz/business/plan_actual";
      
      
  
      // 予定実績管理ページへのリンクを見つける
      const link = await waitForElement('#submitLinkToHNC097102');
      if (!link) {
        throw new Error('予定実績管理へのリンクが見つかりません');
      }
      // リンクをクリック
      link.click();
  
      // ナビゲーション完了を待つ
    //   await waitForNavigation();
  
      // 以降の処理（実績解除ボタンのクリックなど）
    //   return await continueReflectionCancel(userId);


  
    } catch (error) {
        console.error(`[ERROR] ユーザーID ${userId} の予実反映解除中にエラーが発生しました:`, error);
        return { success: false, message: `予実反映の解除中にエラーが発生しました: ${error.message}` };
    }
  }
  

// let navigationCheckInterval = null;

// async function waitForNavigation() {
//   console.log('[DEBUG] waitForNavigation started');
//   return new Promise((resolve) => {
//     let checkCount = 0;
//     const maxChecks = 50; // 5秒間のタイムアウト（100ms * 50）

//     function checkState() {
//       chrome.runtime.sendMessage({action: "checkCancelReflectionState"}, (response) => {
//         console.log('[DEBUG] Current state:', response.state);
//         checkCount++;

//         if (response.state === "ready") {
//           console.log('[DEBUG] Navigation ready');
//           clearInterval(navigationCheckInterval);
//           resolve();
//         } else if (checkCount >= maxChecks) {
//           console.log('[DEBUG] Navigation timeout');
//           clearInterval(navigationCheckInterval);
//           resolve(); // タイムアウトしても処理を続行
//         }
//       });
//     }

//     navigationCheckInterval = setInterval(checkState, 100);
//   });
// }

// 予定実績管理ページ遷移後の解除動作を行う関数
async function continueReflectionCancel(userId) {
    try {
        console.log(`[DEBUG] continueReflectionCancel started for userId: ${userId}`);
        
        debugLog('実績解除ボタンのクリックを開始');
        await clickCancelButton();
        debugLog('実績解除ボタンのクリック完了');
        
        debugLog('サービス内容の削除を開始');
        await deleteServiceContents();
        debugLog('サービス内容の削除完了');
        
        // ここ遷移の方法を変えて、予実反映ページに遷移するのと同じようにする
        // debugLog('元のページへの遷移を開始');
        // await Navigation.navigateBack();
        // debugLog('元のページへの遷移完了');
        
        debugLog(`ユーザーID ${userId} の予実反映を解除完了`);
        return { success: true, message: '予実反映の解除が完了しました。' };
    } catch (error) {
        console.error(`[ERROR] ユーザーID ${userId} の予実反映解除中にエラーが発生しました:`, error);
        console.error('エラーのスタックトレース:', error.stack);
        return { success: false, message: `予実反映の解除中にエラーが発生しました: ${error.message}` };
    }
  }

// 実績解除ボタンをクリックする関数
async function clickCancelButton() {
    const button = await waitForElement('#form\\:removeActual');
    if (!button) {
      throw new Error('実績解除ボタンが見つかりません');
    }
    button.click();
    await wait(1)
  }
  
// サービス内容を削除する関数
async function deleteServiceContents() {
    const serviceLinks = document.querySelectorAll('a.link03');
    for (const link of serviceLinks) {
      await deleteService(link);
    }
  }
  
// サービス内容を削除する関数の実行部分
async function deleteService(link) {
    link.click();
    await wait(1)
    await waitForModal();
    
    const deleteButton = document.querySelector('formPopup\\:delete');
    if (!deleteButton) {
      throw new Error('削除ボタンが見つかりません');
    }
    deleteButton.click();
    await wait(1)
    await waitForModalClose();
}



export { cancelReflection, continueReflectionCancel, changePulldownUser, checkInsuranceCategory, checkSelectedUser};