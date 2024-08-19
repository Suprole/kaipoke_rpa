chrome.action.onClicked.addListener((tab) => {
    if (tab.url.startsWith('https://r.kaipoke.biz/')) {
      chrome.tabs.sendMessage(tab.id, {action: "showFloatingPopup"});
    } else {
      alert('カイポケのページでのみ使用できます。');
    }
});

