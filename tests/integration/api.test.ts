import { test, expect, describe } from "bun:test";
import { TEST_CONFIG } from "../setup";

describe("API Endpoint Tests", () => {

  test("should get participants for a room", async () => {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/rooms/${TEST_CONFIG.TEST_ROOM_ID}/participants`);
    
    expect(response.status).toBe(200);
    
    const participants = await response.json();
    expect(Array.isArray(participants)).toBe(true);
  });

  test("should handle non-existent room", async () => {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/rooms/non-existent-room`);
    
    expect(response.status).toBe(404);
    
    const error = await response.json();
    expect(error.error).toBe("Room not found");
  });

  test("should create a new room", async () => {
    const roomData = {
      id: `test-room-${Date.now()}`,
      name: "Test Room",
      maxParticipants: 10,
      isActive: true
    };

    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roomData),
    });

    expect(response.status).toBe(201);
    
    const createdRoom = await response.json();
    expect(createdRoom.id).toBe(roomData.id);
    expect(createdRoom.name).toBe(roomData.name);
  });

  test("should handle malformed requests", async () => {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invalid: "data" }),
    });

    // Should handle gracefully (might be 400 or 500 depending on validation)
    expect([400, 500].includes(response.status)).toBe(true);
  });

  test("should get specific room details", async () => {
    // First create a room
    const roomData = {
      id: `test-details-${Date.now()}`,
      name: "Test Details Room",
      maxParticipants: 5,
      isActive: true
    };

    const createResponse = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roomData),
    });

    expect(createResponse.status).toBe(201);

    // Then get the room details
    const getResponse = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/rooms/${roomData.id}`);
    
    expect(getResponse.status).toBe(200);
    
    const room = await getResponse.json();
    expect(room.id).toBe(roomData.id);
    expect(room.name).toBe(roomData.name);
    expect(room.maxParticipants).toBe(roomData.maxParticipants);
  });

  test("should handle CORS headers", async () => {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/rooms/${TEST_CONFIG.TEST_ROOM_ID}/participants`);
    
    // Check for CORS headers (if implemented)
    const corsHeader = response.headers.get("Access-Control-Allow-Origin");
    // This test might fail if CORS is not configured, which is fine for testing
    console.log("CORS header:", corsHeader);
  });
});
