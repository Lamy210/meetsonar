import { createRoot } from "react-dom/client";

function SimpleApp() {
  return (
    <div style={{
      padding: '20px',
      background: '#22c55e',
      color: 'white',
      borderRadius: '8px',
      textAlign: 'center',
      margin: '20px'
    }}>
      <h1>🎉 MeetSonar is Working!</h1>
      <p>React application loaded successfully</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
}

// Error handling with detailed logging
try {
  console.log("🚀 Starting Simple React App...");
  
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  console.log("✅ Root element found:", rootElement);
  
  const root = createRoot(rootElement);
  console.log("✅ React root created:", root);
  
  root.render(<SimpleApp />);
  console.log("✅ React app rendered successfully!");
  
  // Add a success indicator to the page title
  setTimeout(() => {
    document.title = "✅ " + document.title;
  }, 1000);
  
} catch (error) {
  console.error("❌ React App Error:", error);
  
  // Show error in the root element
  const rootElement = document.getElementById("root");
  if (rootElement) {
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
        <h2>⚠️ React Application Error</h2>
        <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
        <p>Check the browser console for more details.</p>
        <button onclick="window.location.reload()" style="
          background: white; 
          color: #ef4444; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px;
        ">
          Reload Page
        </button>
      </div>
    `;
  }
}
