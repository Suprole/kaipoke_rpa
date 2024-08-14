document.addEventListener('DOMContentLoaded', function() {
  const functionList = document.getElementById('functionList');
  
  functionList.addEventListener('click', function(e) {
    if (e.target && e.target.nodeName === "LI") {
      const functionName = e.target.getAttribute('data-function');
      if (functionName === 'yojitsuKakutei') {
        showYojitsuKakuteiPopup();
      }
      // 他の機能があれば、ここに追加
    }
  });
});

function showYojitsuKakuteiPopup() {
  // 予実確定機能のポップアップを表示
  fetch('yojitsu_kakutei.html')
    .then(response => response.text())
    .then(html => {
      document.body.innerHTML = html;
      initYojitsuKakutei();
    });
}

function initYojitsuKakutei() {
  const fetchButton = document.getElementById('fetchUsers');
  const executeButton = document.getElementById('executeReflection');
  const cancelButton = document.getElementById('cancelReflection');
  const selectAllButton = document.getElementById('selectAll');
  const userListDiv = document.getElementById('userList');

  fetchButton.addEventListener('click', fetchUserList);

  function fetchUserList() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) {
        console.error("No active tab found");
        userListDiv.textContent = 'アクティブなタブが見つかりません。';
        return;
      }
      
      // カイポケのURLかどうかをチェック
      if (!tabs[0].url.startsWith('https://r.kaipoke.biz/')) {
        userListDiv.textContent = 'カイポケのページではありません。';
        return;
      }
  
      chrome.tabs.sendMessage(tabs[0].id, {action: "fetchUsers"}, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          userListDiv.textContent = 'この機能は月間スケジュール管理ページで使用できます。';
          return;
        }
        if (response && response.users) {
          displayUserList(response.users);
        } else if (response && response.error === 'notTargetPage') {
          userListDiv.textContent = 'この機能は月間スケジュール管理ページで使用できます。';
        } else {
          userListDiv.textContent = '予期せぬエラーが発生しました。';
        }
      });
    });
  }

  function displayUserList(users) {
    userListDiv.innerHTML = '';
    users.forEach(user => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = user.id;
      const label = document.createElement('label');
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(user.name));
      userListDiv.appendChild(label);
      userListDiv.appendChild(document.createElement('br'));
    });
    executeButton.disabled = false;
    cancelButton.disabled = false;
    selectAllButton.disabled = false;
  }
}