console.log("Content script is running");
console.log("Current URL:", window.location.href);

let floatingDiv = null;

// 即時実行関数でスクリプトをラップ
(function() {
  // ページロード時に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }
})();

function initializeExtension() {
  restorePopupState();
  setupMessageListener();
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showFloatingPopup") {
      showFloatingPopup();
      sendResponse({success: true});
    } else if (request.action === "fetchUsers") {
      if (isTargetPage()) {
        const users = fetchUsersFromPage();
        sendResponse({users: users});
      } else {
        sendResponse({error: 'notTargetPage'});
      }
    }
    return true;
  });
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

function isTargetPage() {
  return window.location.href.startsWith('https://r.kaipoke.biz/bizhnc/monthlyShiftsList/');
}

function showFloatingPopup() {
  if (floatingDiv && floatingDiv.style.display === 'none') {
    floatingDiv.style.display = 'block';
    return;
  }
  if (floatingDiv) {
    return;
  }

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

  const fetchButton = floatingDiv.querySelector('#fetchUsers');
  fetchButton.addEventListener('click', fetchUserList);

  const selectAllButton = floatingDiv.querySelector('#selectAll');
  selectAllButton.addEventListener('click', toggleSelectAll);

  const userListDiv = floatingDiv.querySelector('#userList');
  userListDiv.addEventListener('change', updateButtonState);

  makeDraggable(floatingDiv);
  savePopupState();
}

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

function displayUserList(users) {
  const userListDiv = document.getElementById('userList');
  const executeButton = document.getElementById('executeReflection');
  const cancelButton = document.getElementById('cancelReflection');
  const selectAllButton = document.getElementById('selectAll');

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

  // 全選択ボタンのイベントリスナーを追加
  selectAllButton.addEventListener('click', toggleSelectAll);
  
  // チェックボックスの状態変更を監視
  userListDiv.addEventListener('change', updateButtonState);

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

async function initializeAssistant() {
  try {
    const userSelect = await waitForElement('select.form-control[onchange^="changeUserFromPopupList"]');
    const monthSelect = await waitForElement('#selectServiceOfferYm');
    const executeButton = await waitForElement('#executeReflection');
    const cancelButton = await waitForElement('#cancelReflection');

    if (userSelect && monthSelect) {
      const currentUser = userSelect.value;
      const currentMonth = monthSelect.value;
      console.log(`Current User: ${currentUser}, Current Month: ${currentMonth}`);
    } else {
      console.log('User or month select element not found');
    }

    if (executeButton) {
      executeButton.addEventListener('click', () => handleReflection('execute'));
    } else {
      console.log('Execute button not found');
    }

    if (cancelButton) {
      cancelButton.addEventListener('click', () => handleReflection('cancel'));
    } else {
      console.log('Cancel button not found');
    }

  } catch (error) {
    console.error('Error initializing assistant:', error);
  }
}

function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    function checkElement() {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      } else {
        setTimeout(checkElement, 100);
      }
    }
    
    checkElement();
  });
}



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

function cancelReflection(userId) {
  console.log(`ユーザーID ${userId} の予実反映を解除中...`);
  // ここに予実反映の解除ロジックを実装
}

// 初期化関数の実行
function tryInitialize() {
  if (document.readyState === 'complete') {
    initializeAssistant();
  } else {
    setTimeout(tryInitialize, 100);
  }
}

tryInitialize();