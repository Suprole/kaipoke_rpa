// ページ読み込み時に埋め込むScript

const baseUrl = chrome.runtime.getURL('');

// 全てのモジュールを一度に非同期でインポート
async function importModules() {
  const [ReflectionHandlerModule, UIModule] = await Promise.all([
    import(baseUrl + 'reflectionHandler.js'),
    import(baseUrl + 'popup.js')
  ]);

  return {
    ReflectionHandler: ReflectionHandlerModule,
    UI: UIModule
  };
}

// メイン関数
async function main() {
  try {
    const { ReflectionHandler, UI } = await importModules();

    // ページ読み込み時の実行関数
    await UI.restorePopupState();
    setupMessageListener();

    (function () {
      const originalConfirm = window.confirm;
      window.confirm = function (message) {
        console.log('Confirm dialog detected:', message);
        return originalConfirm(message);
      };
    })();


    function setupMessageListener() {
      chrome.runtime.onMessage.addListener(handleMessage);
    }


    function handleMessage(request, sender, sendResponse) {
      const handleAction = async () => {
        try {
          let result;
          switch (request.action) {
            case "checkContentScriptReady":
              // コンテンツスクリプトの準備状態を確認するための新しいケース
              result = { ready: true };
              break;
            case "clickFixActualButton":
              result = await ReflectionHandler.clickFixActualButton();
              break;
            case "clickReflectActualButton":
              result = await ReflectionHandler.clickReflectActualButton();
              break;
            case "clickCalculateButton":
              result = await ReflectionHandler.clickEnableAutoEstimateButton();
              break;
            case "clickRezeptButton":
              result = await ReflectionHandler.clickEnableAutoRezeptButton();
              break;
            case "clickCancelRezeptButton":
              result = await ReflectionHandler.clickEnableAutoCancelRezeptButton();
              break;
            case "deleteServiceContent":
              result = await ReflectionHandler.deleteServiceContent();
              break;
            case "clickCancelActualButton":
              result = await ReflectionHandler.clickCancelActualButton();
              break;
            case "clickPlanActualLink":
              result = await ReflectionHandler.clickPlanActualLink();
              break;
            case "clickMonthlyScheduleLink":
              result = await ReflectionHandler.clickMonthlyScheduleLink();
              break;
            case "changePulldownUser":
              result = await ReflectionHandler.changePulldownUser(request.userId);
              break;
            case "checkSelectedUser":
              result = await ReflectionHandler.checkSelectedUser(request.userId);
              break;
            case "checkInsuranceCategory":
              result = await ReflectionHandler.checkInsuranceCategory();
              break;
            case "showFloatingPopup":
              await UI.showFloatingPopup();
              result = { success: true };
              break;
            // デバックゾーン

          }
          return { success: true, result };
        } catch (error) {
          console.error(`Error in ${request.action}:`, error);
          return { success: false, error: error.message };
        }
      };

      handleAction().then(sendResponse).catch((error) => {
        console.error('Unhandled error in handleAction:', error);
        sendResponse({ success: false, error: 'Unhandled error occurred' });
      });
      return true; // 非同期レスポンスのために必要
    }

    // コンテンツスクリプトの準備完了を通知
    chrome.runtime.sendMessage({ action: "contentScriptReady" });

  } catch (err) {
    console.error('Error in main function:', err);
  }
}

// メイン関数の実行
main();




