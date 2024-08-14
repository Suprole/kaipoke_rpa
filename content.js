console.log("Content script is running");

function isTargetPage() {
    return window.location.href.startsWith('https://r.kaipoke.biz/bizhnc/monthlyShiftsList/');
  }
  
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "fetchUsers") {
      if (isTargetPage()) {
        const users = fetchUsersFromPage();
        sendResponse({users: users});
      } else {
        sendResponse({error: 'notTargetPage'});
      }
    }
    return true;
  });
  
  function fetchUsersFromPage() {
    const userSelect = document.querySelector('#user_search select.form-control');
    if (!userSelect) {
      console.error('User select element not found');
      return [];
    }
  
    const users = Array.from(userSelect.options).map(option => ({
      id: option.value,
      name: option.textContent.trim()
    }));
  
    return users;
  }

console.log("Current URL:", window.location.href);