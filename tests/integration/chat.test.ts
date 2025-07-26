import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { TEST_CONFIG, sleep, generateTestUser } from "../setup";

describe("Chat Functionality Tests", () => {
  let server: any;
  const testRoomId = TEST_CONFIG.TEST_ROOM_ID;

  beforeAll(async () => {
    // Start test server
    console.log("🔧 Starting test server...");
    // Note: In real implementation, you'd start your server here
    await sleep(1000);
  });

  afterAll(async () => {
    // Cleanup
    if (server) {
      server.close();
    }
  });

  test("should establish WebSocket connection", async () => {
    const user = generateTestUser("alice");
    let connected = false;
    let messageReceived = false;

    const ws = new WebSocket(TEST_CONFIG.WS_URL);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, TEST_CONFIG.TEST_TIMEOUT);

      ws.onopen = () => {
        connected = true;
        console.log("✅ WebSocket connected");

        // Send join-room message
        ws.send(JSON.stringify({
          type: "join-room",
          roomId: testRoomId,
          participantId: user.participantId,
          payload: { displayName: user.displayName }
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("📨 Received message:", message);
        messageReceived = true;

        if (message.type === "participants-list" || message.type === "participant-joined") {
          clearTimeout(timeout);
          ws.close();
          expect(connected).toBe(true);
          expect(messageReceived).toBe(true);
          resolve(true);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }, TEST_CONFIG.TEST_TIMEOUT);

  test("should send and receive chat messages", async () => {
    const alice = generateTestUser("alice");
    const bob = generateTestUser("bob");

    let aliceMessages: any[] = [];
    let bobMessages: any[] = [];

    // Create WebSocket connections for both users
    const aliceWs = new WebSocket(TEST_CONFIG.WS_URL);
    const bobWs = new WebSocket(TEST_CONFIG.WS_URL);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Chat message test timeout"));
      }, TEST_CONFIG.TEST_TIMEOUT);

      let aliceConnected = false;
      let bobConnected = false;

      // Alice connection
      aliceWs.onopen = () => {
        aliceConnected = true;
        aliceWs.send(JSON.stringify({
          type: "join-room",
          roomId: testRoomId,
          participantId: alice.participantId,
          payload: { displayName: alice.displayName }
        }));
      };

      aliceWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        aliceMessages.push(message);
        console.log("👩 Alice received:", message);

        // Check if Alice received Bob's chat message
        if (message.type === "chat-message" &&
          message.payload?.displayName === bob.displayName) {
          clearTimeout(timeout);
          aliceWs.close();
          bobWs.close();

          expect(aliceMessages.some(m =>
            m.type === "chat-message" &&
            m.payload?.message === "Hello from Bob!"
          )).toBe(true);

          resolve(true);
        }
      };

      // Bob connection
      bobWs.onopen = () => {
        bobConnected = true;
        bobWs.send(JSON.stringify({
          type: "join-room",
          roomId: testRoomId,
          participantId: bob.participantId,
          payload: { displayName: bob.displayName }
        }));
      };

      bobWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        bobMessages.push(message);
        console.log("👨 Bob received:", message);

        // After Bob joins, send a chat message
        if (message.type === "participants-list" && bobConnected && aliceConnected) {
          setTimeout(() => {
            bobWs.send(JSON.stringify({
              type: "chat-message",
              roomId: testRoomId,
              participantId: bob.participantId,
              payload: {
                message: "Hello from Bob!",
                displayName: bob.displayName,
                type: "text"
              }
            }));
          }, 500);
        }
      };

      // Error handlers
      aliceWs.onerror = bobWs.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }, TEST_CONFIG.TEST_TIMEOUT);

  test("should persist chat messages in database", async () => {
    const user = generateTestUser("tester");
    const testMessage = "This message should be saved!";

    const ws = new WebSocket(TEST_CONFIG.WS_URL);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Chat persistence test timeout"));
      }, TEST_CONFIG.TEST_TIMEOUT);

      ws.onopen = () => {
        // Join room first
        ws.send(JSON.stringify({
          type: "join-room",
          roomId: testRoomId,
          participantId: user.participantId,
          payload: { displayName: user.displayName }
        }));

        // Send chat message after joining
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: "chat-message",
            roomId: testRoomId,
            participantId: user.participantId,
            payload: {
              message: testMessage,
              displayName: user.displayName,
              type: "text"
            }
          }));
        }, 1000);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "chat-message" &&
          message.payload?.message === testMessage) {

          // Request chat history to verify persistence
          ws.send(JSON.stringify({
            type: "chat-history",
            roomId: testRoomId,
            participantId: user.participantId,
            payload: {}
          }));
        }

        if (message.type === "chat-history") {
          clearTimeout(timeout);
          ws.close();

          const chatHistory = message.payload;
          expect(Array.isArray(chatHistory)).toBe(true);
          expect(chatHistory.some((msg: any) =>
            msg.message === testMessage &&
            msg.displayName === user.displayName
          )).toBe(true);

          resolve(true);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }, TEST_CONFIG.TEST_TIMEOUT);

  test("should handle multiple participants in chat", async () => {
    const users = [
      generateTestUser("alice"),
      generateTestUser("bob"),
      generateTestUser("charlie")
    ];

    const connections: WebSocket[] = [];
    const receivedMessages: any[][] = [[], [], []];

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Multiple participants test timeout"));
      }, TEST_CONFIG.TEST_TIMEOUT * 2);

      let connectedCount = 0;
      let messagesExchanged = 0;

      users.forEach((user, index) => {
        const ws = new WebSocket(TEST_CONFIG.WS_URL);
        connections.push(ws);

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: "join-room",
            roomId: testRoomId,
            participantId: user.participantId,
            payload: { displayName: user.displayName }
          }));
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          receivedMessages[index].push(message);

          if (message.type === "participants-list") {
            connectedCount++;

            // When all users are connected, start sending messages
            if (connectedCount === users.length) {
              setTimeout(() => {
                // Each user sends a message
                connections.forEach((conn, i) => {
                  conn.send(JSON.stringify({
                    type: "chat-message",
                    roomId: testRoomId,
                    participantId: users[i].participantId,
                    payload: {
                      message: `Hello from ${users[i].displayName}!`,
                      displayName: users[i].displayName,
                      type: "text"
                    }
                  }));
                });
              }, 1000);
            }
          }

          if (message.type === "chat-message") {
            messagesExchanged++;

            // Check if all users received all messages
            if (messagesExchanged >= users.length * users.length) {
              clearTimeout(timeout);
              connections.forEach(ws => ws.close());

              // Verify each user received messages from others
              receivedMessages.forEach((messages, userIndex) => {
                const chatMessages = messages.filter(m => m.type === "chat-message");
                expect(chatMessages.length).toBeGreaterThan(0);
              });

              resolve(true);
            }
          }
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    });
  }, TEST_CONFIG.TEST_TIMEOUT * 2);
});
