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

let overlay: HTMLDivElement | null = null;
let selectionBox: HTMLDivElement | null = null;
let selectionBoxRef: HTMLDivElement | null = null;

const MIN_SIZE = 200;
const LOG_MESSAGE_TEMPLATE = "[ScreenshotHelper] %s received";

window.addEventListener("message", (event) => {
  const { type } = event.data;

  if (type === MESSAGE_TYPES.START_SELECTION) {
    console.log(LOG_MESSAGE_TEMPLATE, MESSAGE_TYPES.START_SELECTION);
    clear();
    initOverlay();
  }

  if (type === MESSAGE_TYPES.RESET) {
    console.log(LOG_MESSAGE_TEMPLATE, type);
    clear();
  }
});

function clear() {
  selectionBoxRef?.remove();
  overlay?.remove();
  selectionBox?.remove();
  selectionBoxRef = overlay = selectionBox = null;
  document.querySelectorAll('[id="screenshot-helper-select-rect"]').forEach((el) => el.remove());
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
    zIndex: "1",
    cursor: "crosshair",
    backgroundColor: "rgba(0, 0, 0, 0)",
  });
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", onMouseDown);
  overlay.addEventListener("mousemove", onMouseMove);
  overlay.addEventListener("mouseup", onMouseUp);
}

let startX = 0, startY = 0, isSelecting = false;

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;

  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;

  document.querySelectorAll('[id="screenshot-helper-select-rect"]').forEach((el) => el.remove());
  selectionBox = document.createElement("div");
  selectionBox.id = "screenshot-helper-select-rect";
  Object.assign(selectionBox.style, {
    position: "absolute",
    pointerEvents: "none",
    zIndex: "999999999",
  });
  document.body.appendChild(selectionBox);
}

function onMouseMove(e: MouseEvent) {
  if (!isSelecting || !selectionBox) return;

  const size = Math.min(Math.abs(e.clientX - startX), Math.abs(e.clientY - startY));
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
  if (!isSelecting || !selectionBox || !overlay) return;
  isSelecting = false;

  const rect = selectionBox.getBoundingClientRect();
  const isValidSize = rect.width >= MIN_SIZE && rect.height >= MIN_SIZE;

  if (!isValidSize) {
    selectionBox.remove();
    window.postMessage({ type: MESSAGE_TYPES.CAPTURE_TOO_SMALL }, "*");
    return;
  }

  selectionBoxRef = selectionBox;
  selectionBox.remove();

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
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("[ScreenshotHelper] Failed to capture:", chrome.runtime.lastError.message);
        window.postMessage({
          type: MESSAGE_TYPES.ERROR,
          error: chrome.runtime.lastError.message,
        }, "*");
        return;
      }

      if (response?.type === MESSAGE_TYPES.CAPTURE_RESULT) {
        if (selectionBoxRef) document.body.appendChild(selectionBoxRef);
        window.postMessage({
          type: MESSAGE_TYPES.DONE_SELECTION,
          image: response.image,
        }, "*");
      }

      if (response?.type === MESSAGE_TYPES.ERROR) {
        console.error("[ScreenshotHelper] Background error:", response.message);
        window.postMessage({
          type: MESSAGE_TYPES.ERROR,
          error: response.message,
        }, "*");
      }
    }
  );
}