// 実行と解除に関する関数をまとめたファイル

const MAX_ATTEMPTS = 5;
const RETRY_DELAY = 300;

// ユーティリティ関数: 要素が見つかるまで待機
async function waitForElement(selector, maxAttempts = MAX_ATTEMPTS) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkElement = () => {
      attempts++;
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (attempts < maxAttempts) {
        setTimeout(checkElement, RETRY_DELAY);
      } else {
        reject(new Error(`Element ${selector} not found after ${maxAttempts} attempts`));
      }
    };
    checkElement();
  });
}


// 実績確定ボタンをクリックする関数
async function clickFixActualButton() {
  try {
    const buttonConfirm = await waitForElement('#form\\:btnFixActual');
    //buttonConfirm.click();
    console.log("実績確定ボタンをクリックした");
    return { status: 'fixActual', message: '実績確定ボタンを正常にクリックしました。' };
  } catch (error) {
    const buttonRemove = await waitForElement('#form\\:removeActual').catch(() => null);
    if (buttonRemove) {
      return { status: 'alreadyFixed', message: 'すでに実績が確定されている状態です。' };
    } else {
      return { status: 'notExistActual', message: '反映されている実績はありません。にもかかわらず予定管理に遷移してしまっています。' };
    }
  }
}

// 実績を反映させるボタンをクリック
async function clickReflectActualButton() {
  try {
    const button = await waitForElement('button[onclick="confirmReflectPlanActual(\'02\')"]');
    if (button.hasAttribute('disabled')) {
      return { status: 'buttonDisabled', message: '実績を反映ボタンは無効です' };
    } else {
      //button.click();
      console.log("実績反映ボタンをクリックした");
      return { status: 'reflectedActual', message: '実績を反映ボタンを押しました' };
    }
  } catch (error) {
    throw new Error('実績を反映ボタンが見つかりません。');
  }
}

// 算定するボタンをクリック
async function clickEnableAutoEstimateButton() {
  try {
    // ボタンの要素を待機して取得
    const button = await waitForElement('#form\\:btnEnableAutoEstimate');
    console.log(button);

    // ボタンが無効か確認（'disabled' 属性があるかどうか）
    if (!button) {
      throw new Error('算定するボタンが見つかりません。');
    }


    // ボタンが無効か確認（'disabled' 属性があるかどうか）
    if (button.hasAttribute('disabled')) {
      return { status: 'buttonDisabled', message: '算定するボタンは無効です' };
    } else {
      // ボタンをクリック
      //button.click();
      console.log("算定するボタンをクリックした");
      return { status: 'enabled', message: '算定するボタンを押しました' };
    }
  } catch (error) {
    throw new Error(error.message || '算定するボタンが見つかりません。');
  }
}

// レセプト作成ボタンをクリック
async function clickEnableAutoRezeptButton() {
  try {
    // ボタンの要素を待機して取得
    const button = await waitForElement('#form\\:btnEnableReceiptCheck');
    console.log(button);
    // ボタンが無効か確認（'disabled' 属性があるかどうか）
    if (button.hasAttribute('disabled')) {
      return { status: 'buttonDisabled', message: 'レセプト作成ボタンは無効です' };
    } else {
      // ボタンをクリック
      //button.click();
      console.log("レセプト作成ボタンをクリックした");
      return { status: 'enabled', message: 'レセプト作成ボタンを押しました' };
    }
  } catch (error) {
    throw new Error('レセプト作成ボタンが見つかりません。');
  }
}

// レセプト削除ボタンをクリック
async function clickEnableAutoCancelRezeptButton() {
  try {
    // ボタンの要素を待機して取得
    const button = await waitForElement('#form\\:btnCancelReceiptCheck');
    console.log(button);
    // ボタンが無効か確認（'disabled' 属性があるかどうか）
    if (button.hasAttribute('disabled')) {
      return { status: 'buttonDisabled', message: 'レセプト削除ボタンは無効です' };
    } else {
      // ボタンをクリック
      //button.click();
      console.log("レセプト削除ボタンをクリックした")
      return { status: 'enabled', message: 'レセプト削除ボタンを押しました' };
    }
  } catch (error) {
    throw new Error('レセプト削除ボタンが見つかりません。');
  }
}




// サービス内容を削除する関数
async function deleteServiceContent() {
  try {
    const link = await waitForElement('#form\\:j_id_jsp_75758182_306\\:0\\:j_id_jsp_75758182_328');
    console.log("サービス内容を削除ボタンをクリックした");
    //link.click();

    const deleteButton = await waitForElement('#formPopup\\:delete');
    //deleteButton.click();
    console.log("サービス内容を削除する")

    return { status: 'removeOne', message: 'サービス内容の一つを削除しました。' };
  } catch (error) {
    if (error.message.includes('not found after')) {
      return { status: 'clearAll', message: 'サービス内容リンクはありません。' };
    }
    throw error;
  }
}


// 実績解除ボタンをクリックする関数
async function clickCancelActualButton() {
  try {
    const buttonRemove = await waitForElement('#form\\:removeActual');
    //buttonRemove.click();
    console.log("実績解除ボタンをクリックした");
    return { status: 'canceldActual', message: '実績解除ボタンを正常にクリックしました。' };
  } catch (error) {
    try {
      const buttonConfirm = await waitForElement('#form\\:btnFixActual');
      return { status: 'stillNotFixed', message: 'まだ実績が確定されていない状態です。' };
    } catch {
      return { status: 'notExistActual', message: '反映されている実績はありません。' };
    }
  }
}

// リンクをクリックして月間スケジュール管理ページへ遷移する
async function clickMonthlyScheduleLink() {
  try {
    //const link = await waitForElement('a[onclick*="bizFunction(\'j_id_jsp_75758182_188\')"]');
    const link = await waitForElement('a[onclick*="j_id_jsp_75758182_188"]');
    link.click();

    return { status: 'success', message: '月間スケジュール管理ページへ遷移しました。' };
  } catch (error) {
    throw new Error('月間スケジュール管理ページへのリンクが見つかりません。');
  }
}

// リンクをクリックして実績管理ページへ遷移する
async function clickPlanActualLink() {
  try {
    const link = await waitForElement('#submitLinkToHNC097102');
    link.click();
    return { status: 'success', message: '予定実績管理ページへ遷移しました。' };
  } catch (error) {
    throw new Error('予定実績管理へのリンクが見つかりません。');
  }
}


// 対象ユーザーをプルダウンから選択する
async function changePulldownUser(userId) {
  try {
    const select = await waitForElement('.pulldownUser select');
    select.value = userId;
    select.dispatchEvent(new Event('change'));
    return { status: 'success', message: 'ユーザーを変更しました。' };
  } catch (error) {
    throw new Error('ユーザー選択プルダウンが見つかりません。');
  }
}

// プルダウンで選択されているユーザーが引数のユーザーと一致するかチェック
async function checkSelectedUser(userId) {
  try {
    const selectedOption = await waitForElement('.pulldownUser select.form-control option:checked');
    return {
      isMatched: selectedOption.value === userId,
      status: 'success',
      message: '選択されているユーザーをチェックしました。'
    };
  } catch (error) {
    throw new Error('選択されているユーザーの確認に失敗しました。');
  }
}


// 現在ページに表示されているユーザーの保険区分をチェックして返す  
async function checkInsuranceCategory() {
  try {
    const careSpan = await waitForElement('.icon-care').catch(() => null);

    if (careSpan && careSpan.textContent.trim() === "介") {
      return { result: "介", status: 'success', message: '保険区分をチェックしました。' };
    }
    const medicalSpan = await waitForElement('.icon-medical').catch(() => null);
    if (medicalSpan && medicalSpan.textContent.trim() === "医") {
      return { result: "医", status: 'success', message: '保険区分をチェックしました。' };
    } else if (!careSpan && !medicalSpan) {
      return { result: "なし", status: 'success', message: '保険区分をチェックしました。' };
    } else {
      return { result: "不明", status: 'success', message: '保険区分をチェックしました。' };
    }
  } catch (error) {
    throw new Error('保険区分の確認に失敗しました。');
  }
}



export {
  clickFixActualButton,
  clickReflectActualButton,
  clickEnableAutoEstimateButton,
  clickEnableAutoRezeptButton,
  clickEnableAutoCancelRezeptButton,
  deleteServiceContent,
  clickCancelActualButton,
  clickMonthlyScheduleLink,
  clickPlanActualLink,
  changePulldownUser,
  checkInsuranceCategory,
  checkSelectedUser
};