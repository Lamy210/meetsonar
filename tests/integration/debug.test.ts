import { test, expect, describe } from "bun:test";
import { TEST_CONFIG } from "../setup";

describe("WebSocket Debug Tests", () => {

  test("should connect and show error details", async () => {
    const ws = new WebSocket(TEST_CONFIG.WS_URL);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        resolve("No connection established");
      }, 3000);

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        
        // Send join-room message
        const joinMessage = {
          type: "join-room",
          roomId: "debug-room",
          participantId: "debug-user",
          payload: { displayName: "Debug User" }
        };
        
        console.log("📤 Sending:", JSON.stringify(joinMessage));
        ws.send(JSON.stringify(joinMessage));
      };

      ws.onmessage = (event) => {
        console.log("📨 Received:", event.data);
        const message = JSON.parse(event.data);
        
        if (message.type === "error") {
          console.log("❌ Error message:", message.message);
        }
        
        clearTimeout(timeout);
        ws.close();
        resolve("Message received");
      };

      ws.onerror = (error) => {
        console.log("❌ WebSocket error:", error);
        clearTimeout(timeout);
        reject(error);
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket closed:", event.code, event.reason);
      };
    });
  });

  test("should test simple HTTP call first", async () => {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/rooms/debug-room/participants`);
    const data = await response.json();
    
    console.log("HTTP Response:", response.status);
    console.log("HTTP Data:", data);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
