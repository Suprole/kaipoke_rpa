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
    const { Utils, ReflectionHandler, UI } = await importModules();
    
    // ページ読み込み時の実行関数
    await UI.restorePopupState();
    setupMessageListener();


    function setupMessageListener() {
      chrome.runtime.onMessage.addListener(handleMessage);
    }
    
    function handleMessage(request, sender, sendResponse) {
      const handleAction = async () => {
        try {
          let result;
          switch (request.action) {
            case "changePulldownUser":
              result = await ReflectionHandler.changePulldownUser(request.userId);
              break;
            case "checkSelectedUser":
              result = ReflectionHandler.checkSelectedUser(request.userId);
              break;
            case "checkInsuranceCategory":
              result = await ReflectionHandler.checkInsuranceCategory();
              break;
            case "showFloatingPopup":
              await UI.showFloatingPopup();
              result = { success: true };
              break;
            default:
              throw new Error(`Unknown action: ${request.action}`);
          }
          return { success: true, result };
        } catch (error) {
          console.error(`Error in ${request.action}:`, error);
          return { success: false, error: error.message };
        }
      };
    
      handleAction().then(sendResponse);
      // return true; // 非同期レスポンスのために必要
    }

    
  } catch (err) {
    console.error('Error in main function:', err);
  }
}

// メイン関数の実行
main();


// デバック用


