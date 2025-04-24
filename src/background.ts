const MSG_TYPES = {
  START_SELECTION: "screenshot-start-selection",
  DONE_SELECTION: "screenshot-selection-done",
  CAPTURE_REQUEST: "screenshot-capture-request",
  CAPTURE_RESULT: "screenshot-capture-result",
  RESET: "screenshot-reset",
  ERROR: "screenshot-error",
} as const;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== MSG_TYPES.CAPTURE_REQUEST) return;

  (async () => {
    const targetScale = msg.devicePixelRatio || 1;

    try {
      const dataUrl = await chrome.tabs.captureVisibleTab();
      const base64 = dataUrl.split(",")[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "image/jpeg" });
      const bitmap = await createImageBitmap(blob);

      const sw = msg.rect.width * targetScale;
      const sh = msg.rect.height * targetScale;
      const tw = Math.floor(sw * targetScale);
      const th = Math.floor(sh * targetScale);

      const sx = msg.rect.x * targetScale;
      const sy = msg.rect.y * targetScale;

      const canvas = new OffscreenCanvas(tw, th);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context is null");

      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, tw, th);

      const croppedBlob = await canvas.convertToBlob({
        type: "image/jpeg",
        quality: 0.85,
      });

      const buffer = await croppedBlob.arrayBuffer();

      function arrayBufferToBase64(buffer: ArrayBuffer) {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(
            null,
            bytes.subarray(i, i + chunkSize) as unknown as number[]
          );
        }
        return btoa(binary);
      }

      const finalBase64 = arrayBufferToBase64(buffer);

      sendResponse({
        type: MSG_TYPES.CAPTURE_RESULT,
        image: finalBase64,
      });
    } catch (err: any) {
      console.error("[ScreenshotHelper] capture error:", err);
      sendResponse({
        type: MSG_TYPES.ERROR,
        message: err?.message || "Unknown error",
      });
    }
  })();

  return true;
});