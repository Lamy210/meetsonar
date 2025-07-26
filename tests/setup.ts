// Test setup for MeetSonar
import { beforeAll, afterAll } from "bun:test";

// Global test configuration
beforeAll(async () => {
  console.log("🚀 Setting up MeetSonar test environment...");

  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://meetsonar:password@localhost:5432/meetsonar_test";
  process.env.PORT = "5001"; // Use different port for testing

  console.log("✅ Test environment configured");
});

afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");
  // Cleanup logic here
  console.log("✅ Test cleanup completed");
});

// Global test utilities
export const TEST_CONFIG = {
  API_BASE_URL: "http://localhost:5000", // 統一ポート5000
  SOCKETIO_URL: "http://localhost:5000", // Socket.IO統一
  TEST_ROOM_ID: "test-room-" + Date.now(),
  TEST_TIMEOUT: 10000,
};

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateTestUser(name?: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return {
    participantId: `test-${name || 'user'}-${timestamp}-${random}`,
    displayName: name || `TestUser${random}`,
  };
}
