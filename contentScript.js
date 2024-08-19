let floatingDiv = null;

// フローティングポップアップを表示
function showFloatingPopup() {
  // フローティングポップアップが存在し、表示されていない場合は表示して終わり
  if (floatingDiv && floatingDiv.style.display === 'none') {
    floatingDiv.style.display = 'block';
    return;
  }
  // 存在してすでに表示されてる場合はここで終わり
  if (floatingDiv) {
    return;
  }

  // 存在しないときは以下で作成
  floatingDiv = document.createElement('div');
  floatingDiv.id = 'kaipoke-assistant-popup';
  floatingDiv.innerHTML = `
    <div class="kaipoke-assistant-header">
      <span>カイポケアシスタント</span>
      <button id="kaipoke-assistant-close">×</button>
    </div>
    <div id="kaipoke-assistant-content">
      <button id="fetchUsers">ユーザーリスト取得</button>
      <div id="userList"></div>
      <button id="executeReflection" disabled>実行</button>
      <button id="cancelReflection" disabled>解除</button>
      <button id="selectAll" disabled>全選択</button>
    </div>
  `;
  document.body.appendChild(floatingDiv);

  const closeButton = floatingDiv.querySelector('#kaipoke-assistant-close');
  closeButton.addEventListener('click', () => {
    floatingDiv.style.display = 'none';
    savePopupState();
  });

  // ユーザー取得ボタンに動作を追加
  const fetchButton = floatingDiv.querySelector('#fetchUsers');
  fetchButton.addEventListener('click', fetchUserList);
  
  // 全選択ボタンに動作を追加
  const selectAllButton = floatingDiv.querySelector('#selectAll');
  selectAllButton.addEventListener('click', toggleSelectAll);
  
  // チェックボックスに動作を追加
  const userListDiv = floatingDiv.querySelector('#userList');
  userListDiv.addEventListener('change', updateButtonState);
  
  // 実行ボタンに動作を追加
  const executeButton = floatingDiv.querySelector('#executeReflection');
  executeButton.addEventListener('click', () => handleReflection('execute'));

  // 解除ボタンに動作を追加
  const cancelButton = floatingDiv.querySelector('#cancelReflection');
  cancelButton.addEventListener('click', () => handleReflection('cancel'));
  
  makeDraggable(floatingDiv);
  updateButtonState();
  savePopupState();
}


// ポップアップの状態を保存
function savePopupState() {
  if (!floatingDiv) return;
  
  const state = {
    isVisible: floatingDiv.style.display !== 'none',
    position: {
      left: floatingDiv.style.left,
      top: floatingDiv.style.top
    },
    users: Array.from(floatingDiv.querySelectorAll('.user-checkbox')).map(cb => ({
      id: cb.value,
      name: cb.nextElementSibling.textContent,
      checked: cb.checked
    }))
  };
  localStorage.setItem('kaipoke-assistant-state', JSON.stringify(state));
}


// ポップアップの状態を復元
function restorePopupState() {
  const savedState = localStorage.getItem('kaipoke-assistant-state');
  if (savedState) {
      const state = JSON.parse(savedState);
      if (state.isVisible) {
      showFloatingPopup();
      floatingDiv.style.left = state.position.left;
      floatingDiv.style.top = state.position.top;
      if (state.users && state.users.length > 0) {
          displayUserList(state.users);
          state.users.forEach(user => {
          const checkbox = floatingDiv.querySelector(`#user-${user.id}`);
          if (checkbox) {
              checkbox.checked = user.checked;
          }
          });
          updateButtonState();
      }
      }
  }
}

// 要素をドラッグ可能にする
function makeDraggable(element) {
  const header = element.querySelector('.kaipoke-assistant-header');
  let isDragging = false;
  let startX, startY;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - element.offsetLeft;
    startY = e.clientY - element.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      element.style.left = (e.clientX - startX) + 'px';
      element.style.top = (e.clientY - startY) + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    savePopupState();
  });
}


// ユーザーリストを取得
function fetchUserList() {
  const userListDiv = floatingDiv.querySelector('#userList');
  const users = fetchUsersFromPage();

  if (users.length === 0) {
      userListDiv.textContent = 'ユーザーリストが見つかりません。';
      return;
  }

  displayUserList(users);
  savePopupState();
}

// fetchUserList内のページからユーザーリストを取得する部分
function fetchUsersFromPage() {
  const userSelect = document.querySelector('#user_search select.form-control');
  if (!userSelect) {
      console.error('User select element not found');
      return [];
  }

  return Array.from(userSelect.options).map(option => ({
      id: option.value,
      name: option.textContent.trim()
  }));
}


// ユーザーリストをフローティングポップアップに表示
function displayUserList(users) {
  const userListDiv = document.getElementById('userList');
  const selectAllButton = document.getElementById('selectAll');
  const executeButton = document.getElementById('executeReflection');
  const cancelButton = document.getElementById('cancelReflection');

  userListDiv.innerHTML = '';
  users.forEach(user => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = user.id;
      checkbox.id = `user-${user.id}`;
      checkbox.classList.add('user-checkbox');
      
      const label = document.createElement('label');
      label.htmlFor = `user-${user.id}`;
      label.appendChild(document.createTextNode(user.name));
      
      const div = document.createElement('div');
      div.appendChild(checkbox);
      div.appendChild(label);
      
      userListDiv.appendChild(div);
  });

  executeButton.disabled = false;
  cancelButton.disabled = false;
  selectAllButton.disabled = false;

  // // 全選択ボタンのイベントリスナーを追加
  // selectAllButton.addEventListener('click', toggleSelectAll);

  // // チェックボックスの状態変更を監視
  // userListDiv.addEventListener('change', updateButtonState);

  updateButtonState();
  savePopupState();
}

// 全選択/全解除の切り替え関数
function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('.user-checkbox');
  const selectAllButton = document.getElementById('selectAll');
  const isChecked = selectAllButton.textContent === '全選択';

  checkboxes.forEach(checkbox => {
      checkbox.checked = isChecked;
  });

  selectAllButton.textContent = isChecked ? '全解除' : '全選択';
  updateButtonState();

  savePopupState();
}

// ボタンの状態を更新する関数
function updateButtonState() {
  const checkboxes = document.querySelectorAll('.user-checkbox');
  const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
  const executeButton = document.getElementById('executeReflection');
  const cancelButton = document.getElementById('cancelReflection');

  const isAnyChecked = checkedBoxes.length > 0;
  executeButton.disabled = !isAnyChecked;
  cancelButton.disabled = !isAnyChecked;

  const selectAllButton = document.getElementById('selectAll');
  selectAllButton.textContent = (checkboxes.length === checkedBoxes.length) ? '全解除' : '全選択';

  savePopupState();
}


// 月間スケジュール管理ページかどうかを確認
function isMonthlySchedulePage() {
  return window.location.href.startsWith('https://r.kaipoke.biz/bizhnc/monthlyShiftsList/');
}



//他ファイルからのメッセージリスナーを準備しておく
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showFloatingPopup") {
      showFloatingPopup();
      sendResponse({success: true});
    } else if (request.action === "fetchUsers") {
      if (isMonthlySchedulePage()) {
        const users = fetchUsersFromPage();
        sendResponse({users: users});
      } else {
        sendResponse({error: 'notTargetPage'});
      }
    }
    return true;
  });
}

// ページが読み込まれたときに実行する
async function initializeAssistant() {
  // わんちゃんこの2行だけでいい
  restorePopupState();
  setupMessageListener();


  // ここから下いらんくね？現在の月とユーザー取得は今後わんちゃんいるからコメントで残しとく

  // if (!isMonthlySchedulePage()) {
  //     return; // 月間スケジュール管理ページでない場合は初期化しない
  // }

  // try {
  //     const userSelect = document.querySelector('select.form-control[onchange^="changeUserFromPopupList"]');
  //     const monthSelect = document.querySelector('#selectServiceOfferYm');

  //     if (userSelect && monthSelect) {
  //         const currentUser = userSelect.value;
  //         const currentMonth = monthSelect.value;
  //         console.log(`Current User: ${currentUser}, Current Month: ${currentMonth}`);
  //     }
  // } catch (error) {
  //     console.error('Error initializing assistant:', error);
  // }
}


// 特定の要素の出現を検知する
function waitForElement(selector, timeout = 10000) {
  debugLog(`waitForElement 開始: セレクタ=${selector}, タイムアウト=${timeout}ms`);
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    function checkElement() {
      const element = document.querySelector(selector);
      if (element) {
        debugLog(`要素が見つかりました: ${selector}`);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        debugLog(`タイムアウト: 要素 ${selector} が見つかりませんでした`);
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      } else {
        setTimeout(checkElement, 100);
      }
    }
    
    checkElement();
  });
}


// 「実行」及び「解除」を選択されたユーザーに行う
function handleReflection(action) {
  const checkedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);
  if (checkedUsers.length === 0) {
    alert('ユーザーが選択されていません。');
    return;
  }

  const confirmMessage = action === 'execute' ? '選択されたユーザーの予実反映を実行しますか？' : '選択されたユーザーの予実反映を解除しますか？';
  if (confirm(confirmMessage)) {
    checkedUsers.forEach(userId => {
      action === 'execute' ? executeReflection(userId) : cancelReflection(userId);
    });
  }
}

function executeReflection(userId) {
  console.log(`ユーザーID ${userId} の予実反映を実行中...`);
  // ここに予実反映の実行ロジックを実装
}

// デバッグ用のログ関数
function debugLog(message) {
  console.log(`[DEBUG ${new Date().toISOString()}] ${message}`);
}

// 解除ロジックの主要関数
// 関数実行中に遷移するとcontentScriptが再読み込みされて強制終了するのを解決したい
async function cancelReflection(userId) {
  debugLog(`ユーザーID ${userId} の予実反映を解除開始`);
  try {
     // 1. 予定実績管理ページへ遷移
     debugLog('予定実績管理ページへの遷移を開始');
     await navigateToPlanActualManagement();
     debugLog('予定実績管理ページへの遷移完了');
 
     // 2. ページ遷移の完了を確認
     debugLog('#form:btnFixActual 要素の待機を開始');
     const fixActualButton = await waitForElement('#form\\:btnFixActual', 30000);
     if (!fixActualButton) {
       throw new Error('実績解除ボタンが見つかりませんでした');
     }
     debugLog('#form:btnFixActual 要素の待機完了');
    
    // 3. 実績解除ボタンのクリック
    debugLog('実績解除ボタンのクリックを開始');
    await clickCancelButton();
    debugLog('実績解除ボタンのクリック完了');
    
    // 4. サービス内容の削除
    debugLog('サービス内容の削除を開始');
    await deleteServiceContents();
    debugLog('サービス内容の削除完了');
    
    // 5. 元のページに戻る
    debugLog('元のページへの遷移を開始');
    await navigateBack();
    debugLog('元のページへの遷移完了');
    
    debugLog(`ユーザーID ${userId} の予実反映を解除完了`);
  } catch (error) {
    console.error(`[ERROR] ユーザーID ${userId} の予実反映解除中にエラーが発生しました:`, error);
  }
}



// 予定実績管理ページへの遷移
// cspを回避するように修正予定
async function navigateToPlanActualManagement() {
  debugLog('navigateToPlanActualManagement 開始');
  try {
    const link = await waitForElement('#submitLinkToHNC097102');
    if (!link) {
      throw new Error('予定実績管理へのリンクが見つかりません');
    }
    
    debugLog('予定実績管理リンクを見つけました。クリックを実行します。');
    
    // プログラムによるクリックを実行
    link.click();
    
    debugLog('ページ遷移の待機を開始');
    await waitForNavigation();
    debugLog('ページ遷移の待機完了');
  } catch (error) {
    console.error('[ERROR] navigateToPlanActualManagement でエラー:', error);
    throw error;
  }
}

// ページ遷移を検出
// ページ遷移で再読み込みされるんやったらこれ意味なくね？
// background.jsでわんちゃん使うかも？
function waitForNavigation() {
  debugLog('waitForNavigation 開始');
  return new Promise((resolve) => {
    const initialState = {
      url: location.href,
      title: document.title
    };
    debugLog(`初期状態: URL=${initialState.url}, Title=${initialState.title}`);
    
    let navigationTimeout;
    
    const observer = new MutationObserver(() => {
      if (location.href !== initialState.url) {
        observer.disconnect();
        clearTimeout(navigationTimeout);
        debugLog(`遷移完了: URL=${location.href}, Title=${document.title}`);
        resolve();
      }
    });
    
    observer.observe(document, { subtree: true, childList: true });
    
    // 15秒後にタイムアウト
    navigationTimeout = setTimeout(() => {
      observer.disconnect();
      console.warn('[WARN] Navigation timeout occurred');
      debugLog('遷移タイムアウト。現在の状態で解決します。');
      resolve();
    }, 15000);
  });
}


// 実績解除ボタンのクリック
// 実績確定があったら「まだ確定されてない」エラーハンドリングを追加予定
async function clickCancelButton() {
  const button = await waitForElement('form\\:removeActual');
  if (!button) {
      throw new Error('実績解除ボタンが見つかりません');
  }
  button.click();
  await waitForPageLoad();
}

// サービス内容の削除
// テーブルの同じ行の保険区分が「介」のa.link03を取るように修正予定
async function deleteServiceContents() {
  const serviceLinks = document.querySelectorAll('a.link03');
  for (const link of serviceLinks) {
      if (link.textContent.includes('介')) {
          await deleteService(link);
      }
  }
}

// 個別のサービス削除
async function deleteService(link) {
  link.click();
  await waitForModal();
  
  const deleteButton = document.querySelector('formPopup\\:delete');
  if (!deleteButton) {
      throw new Error('削除ボタンが見つかりません');
  }
  deleteButton.click();
  await waitForModalClose();
}

// ページ読み込み待機
function waitForPageLoad() {
  return new Promise(resolve => {
      if (document.readyState === 'complete') {
          resolve();
      } else {
          // ページがまだ完全に読み込まれていない場合、読み込みが完了するのを待ってから完了
          window.addEventListener('load', resolve);
      }
  });
}

// モーダル表示待機
function waitForModal() {
  return new Promise(resolve => {
      const observer = new MutationObserver(mutations => {
          // IDあってるか確かめたほうが良い
          const modal = document.getElementById('servicePoppup_layout');
          if (modal && window.getComputedStyle(modal).display !== 'none') {
              observer.disconnect();
              resolve();
          }
      });
      
      observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style']
      });
  });
}

// モーダル閉じる待機
function waitForModalClose() {
  return new Promise(resolve => {
      const observer = new MutationObserver(mutations => {
          const modal = document.getElementById('servicePoppup_layout');
          if (!modal || window.getComputedStyle(modal).display === 'none') {
              observer.disconnect();
              resolve();
          }
      });
      
      observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style']
      });
  });
}

// 元のページに戻る
async function navigateBack() {
  history.back();
  await waitForPageLoad();
}



// ページ読み込み時に実行する
initializeAssistant();