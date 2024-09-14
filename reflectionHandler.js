// 実行と解除に関する関数をまとめたファイル

const MAX_ATTEMPTS = 5;
const RETRY_DELAY = 200;

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



// ユーティリティ関数: 複数の要素が見つかるまで待機
async function waitForElementAll(selector, maxAttempts = MAX_ATTEMPTS) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const checkElements = () => {
        attempts++;
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          resolve(Array.from(elements));
        } else if (attempts < maxAttempts) {
          setTimeout(checkElements, RETRY_DELAY);
        } else {
          reject(new Error(`${maxAttempts}回の試行後も要素 ${selector} が見つかりませんでした`));
        }
      };
      checkElements();
    });
}

// ユーティリティ関数: str配列のうち、検索文字列を含むindexを返す関数
const findIndicesMatchingAny = (arr, searchStrings) => {
    if (!arr || !Array.isArray(arr)) {
      console.error('Input array is invalid');
      return [];
    }
    // Set を使用して重複を自動的に除去
    const matchingIndices = new Set();
  
    // 配列の各要素をチェック
    arr.forEach((item, index) => {
      // いずれかの検索文字列にマッチした場合、そのインデックスを追加
      if (searchStrings.some(searchString => item.includes(searchString))) {
        matchingIndices.add(index);
      }
    });
  
    // Set を配列に変換して返す
    return Array.from(matchingIndices);
};



// 算定するボタンをクリックする関数
async function clickCalculateButton() {
  try {
      const button = await waitForElement('#form\\:btnEnableAutoEstimate');
      button.click();
      return { status: 'clicked', message: '算定するボタンを正常にクリックしました。' };
  } catch (error) {
      return { status: 'failed', message: '算定するボタンが押せませんでした。' };
  }
}

// レセプト作成ボタンをクリックする関数
async function clickMakeReceiptButton() {
  try {
      const button = await waitForElement('#form\\:btnEnableReceiptCheck');
      button.click();
      return { status: 'clicked', message: 'レセプト作成ボタンを正常にクリックしました。' };
  } catch (error) {
      return { status: 'failed', message: 'レセプト作成ボタンが押せませんでした。' };
  }
}

// レセプト削除ボタンをクリックする関数
async function clickDeleteReceiptButton() {
  try {
      const button = await waitForElement('#form\\:btnCancelReceiptCheck');
      button.click();
      return { status: 'clicked', message: 'レセプト削除ボタンを正常にクリックしました。' };
  } catch (error) {
      return { status: 'failed', message: 'レセプトはまだ作成されていません。' };
  }
}


// １年減算を登録する関数
async function selectYearDeduction(isDeductionTarget, serviceContents) {
    try {
        if (!serviceContents || !Array.isArray(serviceContents)) {
          console.error('serviceContents is undefined or not an array');
          return { status: 'error', message: 'serviceContents is invalid' };
        }

        const searchStrings = ["予訪看Ⅰ５"];
        // 減算対象の訪問を取得
        const indices = findIndicesMatchingAny(serviceContents, searchStrings)
        console.log(indices)

        // リハビリ減算対象の場合は以下を行う
        if (isDeductionTarget) {
            for (const index of indices) {
                try {
                    // チェックボックスを選択
                    const checkbox = await waitForElement(`input[name="adjust-${index+1}-40"]`);
                    // チェックを入れる
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                } catch (error) {
                    console.error(`Error processing index ${index}:`, error);
                }
            }
        } else {
            for (const index of indices) {
                try {
                    // チェックボックスを選択
                    const checkbox = await waitForElement(`input[name="adjust-${index+1}-39"]`);
                    // チェックを入れる
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                } catch (error) {
                    console.error(`Error processing index ${index}:`, error);
                }
            }
        }

        //登録ボタンをクリック
        const registerButton = await waitForElement('#linkAddAdditionPopup');
        registerButton.click();
        
        return { status: 'clicked', message: '正常にクリックしました。', indices: indices };
      } catch (error) {
        throw error;
    }
}

// 1年減算対象ユーザーかどうかをチェック
async function checkIsYearDeduction() {
    // colspan="2"とclass="color-error"を持つtd要素を探す
    const tdElement = await waitForElement('td[colspan="2"].color-error').catch(() => null);;
    let isYearDeductionUser = false;

    if (tdElement) {
      // td要素内に特定のテキストと要素が含まれているか確認
      const containsPreventiveText = tdElement.textContent.includes('予防訪問看護12月超減算');
      const containsBaseYmTooltip = !!tdElement.querySelector('#preventiveRehabSubtractionBaseYmTooltip');
      const containsBaseYmContents = !!tdElement.querySelector('#preventiveRehabSubtractionBaseYmContents');
      
      // すべての条件が満たされているか確認
      isYearDeductionUser = containsPreventiveText && containsBaseYmTooltip && containsBaseYmContents;
      console.log(isYearDeductionUser)
    }
    
    return { status: 'checked', message: 'チェックしました', isYearDeductionUser: isYearDeductionUser};
  }

// 加算の「登録する」ボタンをクリックする関数
async function clickFixAdditionButton() {
    try {
        //登録ボタンをクリック
        const registerButton = await waitForElement('#linkAddAdditionPopup');
        registerButton.click();
        
        return { status: 'clicked', message: '正常にクリックしました。'};
    } catch (error) {
        throw error;
    }
}

// 加算のチェックボックスを全て外す関数
async function removeAdditionCheckbox() {
    try {
        // テーブル内の全てのチェックボックスを選択
        const checkboxes = document.querySelectorAll('#tableContent2 input[type="checkbox"]');
        console.log(checkboxes);
        
        // 各チェックボックスのチェックを外す
        let count = 0;

        for (const checkbox of checkboxes) {
            // 各チェックボックスのチェックを外す
            checkbox.checked = false;
            count++;

            // 100ミリ秒ごとに処理を区切る
            if (count % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return { status: 'removed', message: '正常に全てのチェックボックスを外しました。'};
    } catch (error) {
        throw error;
    }
}


// 加算を登録する関数
async function selectCareAddition(isDeductionTarget, serviceContents) {
    try {
        const searchStrings = ["訪看Ⅰ５", "予訪看Ⅰ５"];
        // 減算対象の訪問を取得
        const indices = findIndicesMatchingAny(serviceContents, searchStrings)

        // リハビリ減算対象の場合は以下を行う
        if (isDeductionTarget) {
            for (const index of indices) {
                try {
                    // チェックボックスを選択
                    const checkbox14 = await waitForElement(`input[name="adjust-${index+1}-14"]`).catch(() => null);
                    const checkbox34 = await waitForElement(`input[name="adjust-${index+1}-34"]`).catch(() => null);
                    // チェックを入れる
                    if (checkbox14) {
                        checkbox14.checked = true;
                    }
                    if (checkbox34) {
                        checkbox34.checked = true;
                    }
                } catch (error) {
                    console.error(`Error processing index ${index}:`, error);
                }
            }
        }

        //登録ボタンをクリック
        const registerButton = await waitForElement('#linkAddAdditionPopup');
        registerButton.click();
        
        return { status: 'clicked', message: '正常にクリックしました。', indices: indices };
      } catch (error) {
        throw error;
    }
}

// 訪問内容テキストを取得し、「加算」ボタンをクリックする関数
async function getServiceContentsAndClickAdditionButton() {
    try {
        // 訪問内容テキストを取得
        const { careServiceContents, medicalServiceContents } = getServiceContents();

        // 加算ボタンをクリック
        const additionButton = await waitForElement('.table.table-bordered.user_table.table-tab1 .achieve-header button[title="加算"][onclick*="div_showAddition"]');
        if (!additionButton) {
            return { 
                status: 'notfound',
                message: 'ボタンが見つかりませんでした。', 
                careServiceContents: careServiceContents, 
                medicalServiceContents: medicalServiceContents
            };
        }
        additionButton.click();
        
        return { 
            status: 'clicked',
            message: '正常にクリックしました。', 
            careServiceContents: careServiceContents, 
            medicalServiceContents: medicalServiceContents
        };

      } catch (error) {
        throw error;
    }
}

// 加算登録に使用する訪問内容テキストを取得する関数
function getServiceContents() {
    // テーブルを取得
    const table = document.querySelector('.table.table-bordered.user_table.table-tab1');
    // tbody内の全ての行を取得
    const rows = table.querySelectorAll('tbody tr');
    // サービス内容を格納する配列
    const careServiceContents = [];
    const medicalServiceContents = [];
    
    // 各行を処理
    rows.forEach(row => {
      // 実績側のセルを取得（10番目のセル、0から数えて9）
      const achievementCell = row.cells[10];
      if (achievementCell) {
        // サービス内容を含む要素を取得
        const careSpan = achievementCell.querySelector('.icon-care');
        const medicalSpan = achievementCell.querySelector('.icon-medical');
        const serviceNameElement = achievementCell.querySelector('.service-name');
        if (careSpan) {
          // テキスト内容を取得し、トリムして配列に追加
          const serviceName = serviceNameElement.textContent.trim();
          careServiceContents.push(serviceName);
        }
        if (medicalSpan) {
          // テキスト内容を取得し、トリムして配列に追加
          const serviceName = serviceNameElement.textContent.trim();
          medicalServiceContents.push(serviceName);
        }
      }
    });
  
    return { careServiceContents: careServiceContents, medicalServiceContents: medicalServiceContents };
  }


// 確定後のログを取得する関数
async function fetchFixResult() {
    try {
        // カイポケのエラーメッセージを取得
        const errorMessageDiv = await waitForElement('div.txt-attend').catch(() => null);

        if(errorMessageDiv) {
            // div 要素内の最初の li 要素を選択
            const liElement = errorMessageDiv.querySelector('li');
            // li 要素のテキストコンテンツを取得
            const text = liElement.textContent;
            return { 
                status: 'failed',
                message: text+'\n'
            };
        }
        
        const resultMessageDiv = await waitForElement('div.box-confirmed').catch(() => null);

        // console.log(resultMessageDiv);

        if (resultMessageDiv) {
            // divタグの中のテキストを取得
            const text = resultMessageDiv.textContent;
            return { 
                status: 'success',
                message: text+'\n'
            };
        }

        return { 
          status: 'nothing',
          message: 'ログがありません。確定できていない可能性があります。'
        };
      } catch (error) {
        throw new Error('ログの取得に失敗しました。');
    }
}


// 実績確定ボタンをクリックする関数
async function clickFixActualButton() {
    try {
        const buttonConfirm = await waitForElement('#form\\:btnFixActual');
        buttonConfirm.click();
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
            button.click();
            return { status: 'reflectedActual', message: '実績を反映ボタンを押しました' };
        }
      } catch (error) {
        throw new Error('実績を反映ボタンが見つかりません。');
    }
}

// サービス内容を削除する関数
async function deleteServiceContent() {
    try {
        const link = await waitForElement('#form\\:j_id_jsp_75758182_306\\:0\\:j_id_jsp_75758182_328');
        link.click();
        
        const deleteButton = await waitForElement('#formPopup\\:delete');
        deleteButton.click();
        
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
        buttonRemove.click();
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
        const link = await waitForElement('a[onclick*="bizFunction(\'j_id_jsp_75758182_188\')"]');
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
        const medicalSpan = await waitForElement('.icon-medical').catch(() => null);
        
        if (medicalSpan && medicalSpan.textContent.trim() === "医" && careSpan && careSpan.textContent.trim() === "介") {
            return { result: "両", status: 'success', message: '保険区分をチェックしました。' };
        }
        if (careSpan && careSpan.textContent.trim() === "介") {
            return { result: "介", status: 'success', message: '保険区分をチェックしました。' };
        } 
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
    deleteServiceContent, 
    clickCancelActualButton, 
    clickMonthlyScheduleLink, 
    clickPlanActualLink, 
    changePulldownUser, 
    checkInsuranceCategory, 
    checkSelectedUser,
    fetchFixResult,
    selectCareAddition,
    getServiceContentsAndClickAdditionButton,
    removeAdditionCheckbox,
    clickFixAdditionButton,
    checkIsYearDeduction,
    selectYearDeduction,
    clickCalculateButton,
    clickMakeReceiptButton,
    clickDeleteReceiptButton
};