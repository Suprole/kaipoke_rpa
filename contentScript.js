const baseUrl = chrome.runtime.getURL('');

// 全てのモジュールを一度に非同期でインポート
async function importModules() {
  const [UtilsModule, ReflectionHandlerModule, UIModule] = await Promise.all([
    import(baseUrl + 'utils.js'),
    import(baseUrl + 'reflectionHandler.js'),
    import(baseUrl + 'popup.js')
  ]);
  
  return {
    Utils: UtilsModule,
    ReflectionHandler: ReflectionHandlerModule,
    UI: UIModule
  };
}

// メイン関数
async function main() {
  try {
    const { Utils, Navigation, ReflectionHandler, UI } = await importModules();
    
    // ページ読み込み時の実行関数
    await UI.restorePopupState();
    setupMessageListener();

    // メッセージリスナー定義
    function setupMessageListener() {
      // ポップアップ呼び出し
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "showFloatingPopup") {
          UI.showFloatingPopup();
          sendResponse({success: true});
        }
      });

      // 解除継続
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "continueCancelReflection") {
          ReflectionHandler.continueReflectionCancel(request.userId);
        }
      });
    }
    
  } catch (err) {
    console.error('Error in main function:', err);
  }
}

// メイン関数の実行
main();