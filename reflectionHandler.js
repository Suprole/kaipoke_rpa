// 実行と解除に関する関数をまとめたファイル

// サービス内容を削除する関数
function deleteServiceContent() {
    try {
        const link = document.querySelector('#form\\:j_id_jsp_75758182_306\\:0\\:j_id_jsp_75758182_328');

        if (!link) {
            return {
                status: 'clearAll',
                message: 'サービス内容リンクはありません。'
            };
        }

        link.click();
        // モーダルとUIの更新を待つ
        // 注意: この部分は非同期のままです
        setTimeout(() => {
            const deleteButton = document.querySelector('#formPopup\\:delete');
            if (!deleteButton) {
                throw new Error('削除ボタンが見つかりません。');
            }

            // ボタンをクリック
            deleteButton.click();
            
            return {
                status: 'removeOne',
                message: 'サービス内容の一つを削除しました。'
            };
        }, 1000);

    } catch (error) {
        console.error('Error in deleteServiceContent:', error);
        throw error;
    }
}
  

// 実績解除ボタンをクリックする関数
async function clickCancelActualButton() {
    return new Promise((resolve) => {
        const buttonRemove = document.querySelector('#form\\:removeActual');
        if (buttonRemove) {
          buttonRemove.click();
          resolve({
            status: 'canceldActual',
            message: '実績解除ボタンを正常にクリックしました。'
          });
        } else{
            const buttonConfirm = document.querySelector('#form\\:btnFixActual')
            if (buttonConfirm) {
                resolve({
                    status: 'stillNotFixed',
                    message: 'まだ実績が確定されていない状態です。'
                });
            } else{
                resolve({
                    status: 'notExistActual',
                    message: '反映されている実績はありません。'
                });
            }
        }
    });
}

// リンクをクリックして月間スケジュール管理ページへ遷移する
async function clickMonthlyScheduleLink() {
    return new Promise((resolve, reject) => {
      const link = document.querySelector('a[onclick*="bizFunction(\'j_id_jsp_75758182_188\')"]');
      console.log(link)
      if (!link) {
        reject(new Error('月間スケジュール管理ページへのリンクが見つかりません。'));
        return;
      }

      // リンクをクリック
      link.click();

      resolve();
    });
}

// リンクをクリックして実績管理ページへ遷移する
async function clickPlanActualLink() {
    return new Promise((resolve, reject) => {
      const link = document.querySelector('#submitLinkToHNC097102');
      console.log(link)
      if (!link) {
        reject(new Error('予定実績管理へのリンクが見つかりません。'));
        return;
      }

      // リンクをクリック
      link.click();

      resolve();
    });
}


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

// プルダウンで選択されているユーザーが引数のユーザーと一致するかチェック
function checkSelectedUser(userId) {
    const selectedOption = document.querySelector('.pulldownUser select.form-control option:checked');
    return { 
        isMatched: selectedOption ? selectedOption.value === userId : false 
    };
}
  

// 現在ページに表示されているユーザーの保険区分をチェックして返す  
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



export { deleteServiceContent, clickCancelActualButton, clickMonthlyScheduleLink, clickPlanActualLink, changePulldownUser, checkInsuranceCategory, checkSelectedUser};