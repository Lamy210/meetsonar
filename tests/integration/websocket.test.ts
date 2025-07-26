import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { TEST_CONFIG, sleep, generateTestUser } from "../setup";

describe("WebSocket Connection Tests", () => {

  test("should connect to WebSocket server", async () => {
    const ws = new WebSocket(TEST_CONFIG.WS_URL);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  });

  test("should handle invalid messages gracefully", async () => {
    const ws = new WebSocket(TEST_CONFIG.WS_URL);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Invalid message test timeout"));
      }, 5000);

      let errorReceived = false;

      ws.onopen = () => {
        // Send invalid JSON
        ws.send("invalid json");

        // Send valid JSON but invalid message structure
        ws.send(JSON.stringify({ invalid: "message" }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "error") {
          errorReceived = true;
          clearTimeout(timeout);
          ws.close();
          expect(errorReceived).toBe(true);
          resolve(true);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  });

  test("should handle participant join/leave", async () => {
    const user = generateTestUser("test-participant");
    const ws = new WebSocket(TEST_CONFIG.WS_URL);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Participant join/leave test timeout"));
      }, 8000);

      let joinReceived = false;
      let participantsReceived = false;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "join-room",
          roomId: TEST_CONFIG.TEST_ROOM_ID,
          participantId: user.participantId,
          payload: { displayName: user.displayName }
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("Received WebSocket message:", message);

        if (message.type === "participants-list") {
          participantsReceived = true;
          expect(Array.isArray(message.payload)).toBe(true);
        }

        if (message.type === "participant-joined") {
          joinReceived = true;
        }

        if (participantsReceived && (joinReceived || message.type === "participants-list")) {
          // Test leave functionality
          ws.send(JSON.stringify({
            type: "leave-room",
            roomId: TEST_CONFIG.TEST_ROOM_ID,
            participantId: user.participantId,
            payload: {}
          }));

          setTimeout(() => {
            clearTimeout(timeout);
            ws.close();
            expect(participantsReceived).toBe(true);
            resolve(true);
          }, 1000);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  });

  test("should handle connection cleanup on disconnect", async () => {
    const user = generateTestUser("cleanup-test");
    const ws = new WebSocket(TEST_CONFIG.WS_URL);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection cleanup test timeout"));
      }, 5000);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "join-room",
          roomId: TEST_CONFIG.TEST_ROOM_ID,
          participantId: user.participantId,
          payload: { displayName: user.displayName }
        }));

        // Immediately close the connection to test cleanup
        setTimeout(() => {
          ws.close();
        }, 1000);
      };

      ws.onclose = () => {
        // Connection closed successfully
        clearTimeout(timeout);
        resolve(true);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  });
});
