console.log("Content script is running");
console.log("Current URL:", window.location.href);

let floatingDiv = null;

function isTargetPage() {
  return window.location.href.startsWith('https://r.kaipoke.biz/bizhnc/monthlyShiftsList/');
}

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
  });

  const fetchButton = floatingDiv.querySelector('#fetchUsers');
  fetchButton.addEventListener('click', fetchUserList);

  const selectAllButton = floatingDiv.querySelector('#selectAll');
  selectAllButton.addEventListener('click', toggleSelectAll);

  const userListDiv = floatingDiv.querySelector('#userList');
  userListDiv.addEventListener('change', updateButtonState);

  makeDraggable(floatingDiv);
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
  const userListDiv = document.getElementById('userList');
  const users = fetchUsersFromPage();
  
  if (users.length === 0) {
    userListDiv.textContent = 'ユーザーリストが見つかりません。';
    return;
  }

  displayUserList(users);
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
  }