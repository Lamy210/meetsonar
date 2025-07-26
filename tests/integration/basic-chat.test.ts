import { test, expect, describe } from "bun:test";
import { TEST_CONFIG, sleep } from "../setup";

describe("Basic Chat Tests", () => {

  test("should connect to WebSocket and send a basic message", async () => {
    const ws = new WebSocket(TEST_CONFIG.WS_URL);
    let messageReceived = false;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Test timeout"));
      }, 5000);

      ws.onopen = () => {
        console.log("WebSocket connected");

        // Join room first
        ws.send(JSON.stringify({
          type: "join-room",
          roomId: "basic-test-room",
          participantId: "test-user-1",
          payload: { displayName: "Test User" }
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("Received:", message.type);

        if (message.type === "participants-list") {
          // Now send a chat message
          ws.send(JSON.stringify({
            type: "chat-message",
            roomId: "basic-test-room",
            participantId: "test-user-1",
            payload: {
              message: "Hello test!",
              displayName: "Test User",
              type: "text"
            }
          }));
        }

        if (message.type === "chat-message") {
          messageReceived = true;
          clearTimeout(timeout);
          ws.close();
          expect(messageReceived).toBe(true);
          resolve(true);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }, 8000);

  test("should handle multiple participants basic flow", async () => {
    const user1Ws = new WebSocket(TEST_CONFIG.WS_URL);
    const user2Ws = new WebSocket(TEST_CONFIG.WS_URL);

    let user1Ready = false;
    let user2Ready = false;
    let chatMessageExchanged = false;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        user1Ws.close();
        user2Ws.close();
        reject(new Error("Multi-user test timeout"));
      }, 8000);

      // User 1 setup
      user1Ws.onopen = () => {
        user1Ws.send(JSON.stringify({
          type: "join-room",
          roomId: "multi-test-room",
          participantId: "user-1",
          payload: { displayName: "User One" }
        }));
      };

      user1Ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "participants-list") {
          user1Ready = true;
        }

        if (message.type === "chat-message" && message.payload?.displayName === "User Two") {
          chatMessageExchanged = true;
          clearTimeout(timeout);
          user1Ws.close();
          user2Ws.close();
          expect(chatMessageExchanged).toBe(true);
          resolve(true);
        }
      };

      // User 2 setup  
      user2Ws.onopen = () => {
        user2Ws.send(JSON.stringify({
          type: "join-room",
          roomId: "multi-test-room",
          participantId: "user-2",
          payload: { displayName: "User Two" }
        }));
      };

      user2Ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "participants-list") {
          user2Ready = true;

          // When both users are ready, send a message
          if (user1Ready && user2Ready) {
            setTimeout(() => {
              user2Ws.send(JSON.stringify({
                type: "chat-message",
                roomId: "multi-test-room",
                participantId: "user-2",
                payload: {
                  message: "Hello from User Two!",
                  displayName: "User Two",
                  type: "text"
                }
              }));
            }, 1000);
          }
        }
      };

      // Error handlers
      user1Ws.onerror = user2Ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }, 10000);
});
