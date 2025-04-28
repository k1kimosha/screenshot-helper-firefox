const MESSAGE_TYPES = {
  START_SELECTION: "screenshot-start-selection",
  DONE_SELECTION: "screenshot-selection-done",
  CAPTURE_REQUEST: "screenshot-capture-request",
  CAPTURE_RESULT: "screenshot-capture-result",
  CAPTURE_TOO_SMALL: "screenshot-capture-too-small",
  RESET: "screenshot-reset",
  ERROR: "screenshot-error",
  PING_TYPE: "screenshot-ping",
  PONG_TYPE: "screenshot-pong",
} as const;

const DEFAULT_QUALITY = 100;
const DEFAULT_CANVAS_QUALITY = 0.3;
const MIN_SIZE = 200;
const LOG_MESSAGE_TEMPLATE = "[ScreenshotHelper] %s received";

let overlay: HTMLDivElement | null = null;
let selectionBox: HTMLDivElement | null = null;
let selectionBoxRef: HTMLDivElement | null = null;
let captureTabQuality = DEFAULT_QUALITY;
let canvasQuality = DEFAULT_CANVAS_QUALITY;
let saveImg = false;

window.addEventListener("message", (event) => {
  const { type, message } = event.data;

  if (type === MESSAGE_TYPES.START_SELECTION) {
    console.log(LOG_MESSAGE_TEMPLATE, MESSAGE_TYPES.START_SELECTION);
    clear();
    initOverlay();
    captureTabQuality = message?.captureTabQuality || DEFAULT_QUALITY;
    canvasQuality = message?.canvasQuality || DEFAULT_CANVAS_QUALITY;
  }

  if (type === MESSAGE_TYPES.RESET) {
    console.log(LOG_MESSAGE_TEMPLATE, type);
    clear();
  }

  if (type === MESSAGE_TYPES.PING_TYPE) {
    window.postMessage({ type: MESSAGE_TYPES.PONG_TYPE }, "*");
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === MESSAGE_TYPES.START_SELECTION) {
    console.log("[Content] Получен запрос на выделение", document);
    // Ваш код активации выделения
    clear();
    initOverlay();
    saveImg = true;
    captureTabQuality = msg.message?.captureTabQuality || DEFAULT_QUALITY;
    canvasQuality = msg.message?.canvasQuality || DEFAULT_CANVAS_QUALITY;
  }
});

function base64ToBlob(base64: string, type: string) {
  const binary = atob(base64);
  const array = [];
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], {type: type});
}

function clear() {
  saveImg = false;
  captureTabQuality = DEFAULT_QUALITY;
  canvasQuality = DEFAULT_CANVAS_QUALITY;
  selectionBoxRef?.remove();
  overlay?.remove();
  selectionBox?.remove();
  selectionBoxRef = overlay = selectionBox = null;
  document
    .querySelectorAll('[id="screenshot-helper-select-rect"]')
    .forEach((el) => el.remove());
}

function initOverlay() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "screenshot-helper-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    zIndex: saveImg ? "9999" : "1",
    cursor: "crosshair",
    backgroundColor: "rgba(0, 0, 0, 0)",
  });
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", onMouseDown);
  overlay.addEventListener("mousemove", onMouseMove);
  overlay.addEventListener("mouseup", onMouseUp);
}

let startX = 0,
  startY = 0,
  isSelecting = false;

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;

  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;

  document
    .querySelectorAll('[id="screenshot-helper-select-rect"]')
    .forEach((el) => el.remove());
  selectionBox = document.createElement("div");
  selectionBox.id = "screenshot-helper-select-rect";
  Object.assign(selectionBox.style, {
    position: "absolute",
    pointerEvents: "none",
    zIndex: "9999",
  });
  document.body.appendChild(selectionBox);
}

function onMouseMove(e: MouseEvent) {
  if (!isSelecting || !selectionBox) return;

  const size = Math.min(
    Math.abs(e.clientX - startX),
    Math.abs(e.clientY - startY)
  );
  const left = e.clientX < startX ? startX - size : startX;
  const top = e.clientY < startY ? startY - size : startY;
  const isValidSize = size >= MIN_SIZE;

  Object.assign(selectionBox.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: isValidSize ? "rgba(3,3,4,0.2)" : "rgba(255,0,0,0.2)",
    border: `2px dashed ${isValidSize ? "#605DFF" : "#FF0000"}`,
    boxSizing: "border-box",
  });
}

function onMouseUp(e: MouseEvent) {
  try {
    if (!isSelecting || !selectionBox || !overlay) return;
    isSelecting = false;

    const rect = selectionBox.getBoundingClientRect();
    const isValidSize = rect.width >= MIN_SIZE && rect.height >= MIN_SIZE;

    if (!isValidSize) {
      clear();
      window.postMessage({ type: MESSAGE_TYPES.CAPTURE_TOO_SMALL }, "*");
      return;
    }

    // selectionBoxRef = selectionBox;
    selectionBox.style.backgroundColor = "rgba(0,0,0,0)";
    selectionBox.style.border = "none";

    setTimeout(() => {
      chrome.runtime.sendMessage(
        {
          type: MESSAGE_TYPES.CAPTURE_REQUEST,
          rect: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          },
          devicePixelRatio: window.devicePixelRatio,
          quality: captureTabQuality,
          canvasQuality: canvasQuality,
          saveImg,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "[ScreenshotHelper] Failed to capture:",
              chrome.runtime.lastError.message
            );
            window.postMessage(
              {
                type: MESSAGE_TYPES.ERROR,
                error: chrome.runtime.lastError.message,
              },
              "*"
            );
            return;
          }

          if (response?.type === MESSAGE_TYPES.CAPTURE_RESULT) {
            window.postMessage(
              {
                type: MESSAGE_TYPES.DONE_SELECTION,
                image: response.image,
              },
              "*"
            );
            if (selectionBox) {
              selectionBox.style.backgroundColor = "rgba(3,3,4,0.2)";
              selectionBox.style.border = "2px dashed #605DFF";
            }
          }

          if (response?.type === MESSAGE_TYPES.ERROR) {
            console.error(
              "[ScreenshotHelper] Background error:",
              response.message
            );
            window.postMessage(
              {
                type: MESSAGE_TYPES.ERROR,
                error: response.message,
              },
              "*"
            );
          }
        }
      );
    }, 100);
  } catch (error) {
    window.postMessage(
      {
        type: MESSAGE_TYPES.ERROR,
        error: error,
      },
      "*"
    );
  }
}
