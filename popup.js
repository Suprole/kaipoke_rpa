// ポップアップUIに関する関数をまとめたファイル

let floatingDiv = null;



// ポップアップを表示
function showFloatingPopup() {
  // すでに存在しているが表示されていない場合は表示してreturn
  if (floatingDiv && floatingDiv.style.display === 'none') {
    floatingDiv.style.display = 'block';
    return;
  }
  // すでに存在して表示されてる場合はreturn
  if (floatingDiv) {
    return;
  }


  // divタグ作成
  floatingDiv = document.createElement('div');
  floatingDiv.id = 'kaipoke-assistant-popup';
  floatingDiv.innerHTML = `
    <div class="kaipoke-assistant-header">
      <span>カイポケアシスタント</span>
      <button id="kaipoke-assistant-close">×</button>
      </div>
      <div id="kaipoke-assistant-content">
      <div class="left-content">
      <button id="fetchUsers">ユーザーリスト取得</button>
      <div id="userList"></div>
      <button id="executeReflection" disabled>実行</button>
      <button id="cancelReflection" disabled>解除</button>
      <button id="selectAll" disabled>全選択</button>
      <button id="kaipoke-assistant-close">×</button>
      <div>
      <input type="checkbox" id="isDeductionTarget">
      <label for="isDeductionTarget">減算対象事業所</label>
      </div>
      </div>
      <div class="right-content">
      <div id="progressStatus">進行状況: 0/0</div>
      <div id="errorLog">エラーログ:</div>
      </div>
    </div>
  `;
  document.body.appendChild(floatingDiv);

  // 閉じるボタン
  const closeButtonTop = floatingDiv.querySelectorAll('#kaipoke-assistant-close')[0];
  closeButtonTop.addEventListener('click', () => {
    floatingDiv.style.display = 'none';
    savePopupState();
  });
  // 閉じるボタン
  const closeButtonBottom = floatingDiv.querySelectorAll('#kaipoke-assistant-close')[1];
  closeButtonBottom.addEventListener('click', () => {
    floatingDiv.style.display = 'none';
    savePopupState();
  });

  // 取得ボタン動作追加
  const fetchButton = floatingDiv.querySelector('#fetchUsers');
  fetchButton.addEventListener('click', fetchUserList);
  
  // 全選択ボタン動作追加
  const selectAllButton = floatingDiv.querySelector('#selectAll');
  selectAllButton.addEventListener('click', toggleSelectAll);
  
  // チェックボックス動作追加
  const userListDiv = floatingDiv.querySelector('#userList');
  userListDiv.addEventListener('change', updateButtonState);

  const deductionTargetCheckBox = document.getElementById('isDeductionTarget');
  deductionTargetCheckBox.addEventListener('change', savePopupState);
  
  // 実行ボタン動作追加
  const executeButton = floatingDiv.querySelector('#executeReflection');
  executeButton.addEventListener('click', () => handleReflection('execute'));

  // 解除ボタン動作追加
  const cancelButton = floatingDiv.querySelector('#cancelReflection');
  cancelButton.addEventListener('click', () => handleReflection('cancel'));
  
  // ドラッグ有効化
  makeDraggable(floatingDiv);
  // ボタンの有効無効を更新
  updateButtonState();
  // 進行状況とエラーログの初期表示
  updateStatus();
  // 状態を保存
  savePopupState();
}

// ポップアップの状態を保存する
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
    })),
    isDeductionTarget: document.getElementById('isDeductionTarget').checked
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
      document.getElementById('isDeductionTarget').checked = state.isDeductionTarget;
    }
  }
}

// ドラッグを可能にする
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

// ユーザー取得関数
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

// ユーザー取得関数の取得部分
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

// ユーザーリストをポップアップに表示
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

  // 各ボタン有効化
  executeButton.disabled = false;
  cancelButton.disabled = false;
  selectAllButton.disabled = false;

  updateButtonState();
  savePopupState();
}

// 全選択の実行関数
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

// ボタンの有効無効を更新する関数
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

// 進行状況とエラーログを更新する関数
function updateStatus() {
    chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
      const { progressStatus, errorLog } = response;
      const progressStatusElement = document.getElementById('progressStatus');
      const errorLogElement = document.getElementById('errorLog');
  
      progressStatusElement.textContent = `進行状況: ${progressStatus.completed}/${progressStatus.total}`;
      if (progressStatus.completed === progressStatus.total) {
        progressStatusElement.textContent += ' (完了)';
      }
  
      errorLogElement.innerHTML = 'エラーログ:';
      errorLog.forEach(error => {
        errorLogElement.innerHTML += `<br>${getUserNameById(error.userId)}<br>${error.message}<br>`;
      });
    });
}

// userIdからuserNameを取得する関数
function getUserNameById(userId) {
    // kaipoke-assistant-content idを持つdiv要素を見つける
    const contentDiv = document.getElementById('kaipoke-assistant-content');
  
    if (contentDiv) {
      // 指定されたuserIdに一致する要素を探す（contentDiv内で検索）
      const userElement = contentDiv.querySelector(`#user-${userId}`);
  
      if (userElement) {
        // 対応するlabel要素を見つける（contentDiv内で検索）
        const labelElement = contentDiv.querySelector(`label[for="user-${userId}"]`);
        
        if (labelElement) {
          // label要素のテキスト内容（ユーザー名）を返す
          return labelElement.textContent;
        }
      }
    }
  
    // ユーザーが見つからない場合、またはkaipoke-assistant-contentが見つからない場合はnullを返す
    return null;
}

// 指定したuserIdのチェックボックスを外す関数
function uncheckUserCheckbox(userId) {
    const container = document.getElementById('kaipoke-assistant-popup');
    if (!container) {
      console.log('Container element not found.');
      return;
    }
  
    const checkbox = container.querySelector(`#user-${userId}`);
    if (checkbox) {
      checkbox.checked = false;
      savePopupState();
    } else {
      console.log(`User with ID ${userId} not found in the specified container.`);
    }
  }

// 実行と解除ボタンの実行関数
function handleReflection(action) {
    const checkedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);
    if (checkedUsers.length === 0) {
      alert('ユーザーが選択されていません。');
      return;
    }

    const isDeductionTarget = document.getElementById('isDeductionTarget').checked;

    const confirmMessage = action === 'execute' ? '選択されたユーザーの予実反映を実行しますか？' : '選択されたユーザーの予実反映を解除しますか？';
    if (confirm(confirmMessage)) {
      if (action === 'execute') {
        executeReflectionForUsers(checkedUsers, isDeductionTarget);
      } else {
        cancelReflectionForUsers(checkedUsers);
      }
    }
}
 
// 実行のロジック関数
async function executeReflectionForUsers(userIds, isDeductionTarget) {
    // background.jsにuserIdsを渡し、全体の確定開始を通知
    await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "startAllFixReflection",
          userIds: userIds,
          isDeductionTarget: isDeductionTarget
        }, resolve);
    });
}

// 全体の解除開始をbackgroundに通知する関数
async function cancelReflectionForUsers(userIds) {
    // background.jsにuserIdsを渡し、全体の解除開始を通知
    await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "startAllCancelReflection",
          userIds: userIds
        }, resolve);
    });
}

// メッセージリスナー




// 他ファイルで使う関数をexport
export {
    showFloatingPopup,
    restorePopupState,
    makeDraggable,
    updateStatus,
    uncheckUserCheckbox
    // 必要に応じて他の関数もここにリストアップ
};