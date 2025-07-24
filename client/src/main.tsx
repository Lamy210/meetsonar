import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Viewport height fix for mobile browsers
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Set initial viewport height
setViewportHeight();

// Update on resize and orientation change
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', () => {
  setTimeout(setViewportHeight, 100); // Small delay for orientation change
});

// Error handling for React rendering
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
  
  console.log("✅ MeetSonar React app loaded successfully");
} catch (error) {
  console.error("❌ Failed to load MeetSonar React app:", error);
  
  // Fallback: show error message in the root element
  const rootElement = document.getElementById("root");
  if (rootElement) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootElement.innerHTML = `
      <div style="
        padding: 20px; 
        background: #ef4444; 
        color: white; 
        border-radius: 8px; 
        margin: 20px; 
        text-align: center;
        font-family: Arial, sans-serif;
      ">
        <h2>⚠️ アプリケーションの読み込みに失敗しました</h2>
        <p>エラー: ${errorMessage}</p>
        <p>ページを再読み込みしてください。</p>
        <button onclick="window.location.reload()" style="
          background: white; 
          color: #ef4444; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
          font-weight: bold;
        ">
          再読み込み
        </button>
      </div>
    `;
  }
}
