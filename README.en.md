# 📸 Screenshot Selector Extension

> A simple and lightweight browser extension that allows users to select and capture specific areas of a webpage.

---

## 🚀 Features

- 🔲 **Interactive selection** – Choose the exact area you want to capture.  
- 🧮 **Square-only selection** – Fixed shape ensures visual consistency.  
- ⚠️ **Size validation** – Warns if the selection is too small.  
- 💾 **Captures selected area as an image** – Automatically processes and returns the image.  
- 🔁 **Easy integration with websites** – Works via `window.postMessage`.

---

## 💡 Use Cases

### 👨‍💻 For Developers

- UI/UX testing and debugging  
- Visual documentation  
- Screenshot automation

### 🙋‍♀️ For Users

- Save specific parts of a page  
- Create image-based notes or tutorials

---

## ⚙️ How It Works

1. From your website, send:
   ```js
   window.postMessage({ type: 'screenshot-start-selection' }, '*');
   ```

2. The extension activates selection mode.

3. Select a square area on the page.

4. The result is sent back:
   ```js
   window.addEventListener('message', (e) => {
     if (e.data?.type === 'screenshot-selection-done') {
       console.log('Screenshot received:', e.data.image);
     }
   });
   ```

---

## 🔐 Security

- ✅ **Does not collect or send any personal data**  
- ✅ **Only activates via `window.postMessage`** — never runs silently  
- ✅ All operations are performed **locally in the browser**  
- ✅ **Does not access forms, passwords, cookies or sensitive content**

---

## 📦 Manual Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-name/screenshot-extension.git
   ```

2. Build the project:
   ```bash
   cd screenshot-extension
   npm install
   npm run build
   ```

3. Open `chrome://extensions` in your browser, enable **Developer mode**, click **Load unpacked**, and select the `dist` folder.

---

## 🛠 Built With

- TypeScript  
- Chrome Extension API (Manifest V3)  
- OffscreenCanvas  
- Chrome Tabs API

---

## 📄 License

MIT — Free for personal and commercial use.