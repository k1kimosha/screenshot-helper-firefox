const btn = document.getElementById("startBtn");
if (btn) {
  btn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs?.[0].id) {
        chrome.tabs.sendMessage(tabs?.[0].id, {
          type: "screenshot-start-selection",
          message: {
            captureTabQuality: 100,
            canvasQuality: 0.8,
          },
        });
        window.close();
      }
    });
  });
}
