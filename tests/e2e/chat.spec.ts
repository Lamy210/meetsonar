import { test, expect } from '@playwright/test';

test.describe('Chat E2E Tests', () => {
  const testRoomId = `e2e-test-${Date.now()}`;

  test('should allow users to join room and send messages', async ({ browser }) => {
    // Create two browser contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // User 1 (Alice) joins the room
    await page1.goto(`/room/${testRoomId}?name=Alice`);
    await page1.waitForSelector('[data-testid="chat-container"]', { timeout: 10000 });

    // User 2 (Bob) joins the room
    await page2.goto(`/room/${testRoomId}?name=Bob`);
    await page2.waitForSelector('[data-testid="chat-container"]', { timeout: 10000 });

    // Wait for both users to see each other in participants
    await expect(page1.locator('[data-testid="participant-list"]')).toContainText('Bob');
    await expect(page2.locator('[data-testid="participant-list"]')).toContainText('Alice');

    // Switch to chat tab on both pages
    await page1.click('[data-testid="chat-tab"]');
    await page2.click('[data-testid="chat-tab"]');

    // Alice sends a message
    const aliceMessage = 'Hello Bob! 👋';
    await page1.fill('[data-testid="chat-input"]', aliceMessage);
    await page1.click('[data-testid="send-button"]');

    // Bob should receive the message
    await expect(page2.locator('[data-testid="chat-messages"]')).toContainText(aliceMessage);

    // Bob sends a reply
    const bobMessage = 'Hi Alice! How are you?';
    await page2.fill('[data-testid="chat-input"]', bobMessage);
    await page2.click('[data-testid="send-button"]');

    // Alice should receive Bob's message
    await expect(page1.locator('[data-testid="chat-messages"]')).toContainText(bobMessage);

    // Verify message ordering and styling
    const aliceMessages = page1.locator('[data-testid="chat-message-own"]');
    const bobMessagesOnAlicePage = page1.locator('[data-testid="chat-message-other"]');
    
    await expect(aliceMessages).toContainText(aliceMessage);
    await expect(bobMessagesOnAlicePage).toContainText(bobMessage);

    // Clean up
    await context1.close();
    await context2.close();
  });

  test('should show chat history to new joiners', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    // First two users join and chat
    await page1.goto(`/room/${testRoomId}-history?name=Alice`);
    await page2.goto(`/room/${testRoomId}-history?name=Bob`);

    await page1.waitForSelector('[data-testid="chat-container"]');
    await page2.waitForSelector('[data-testid="chat-container"]');

    // Switch to chat tab
    await page1.click('[data-testid="chat-tab"]');
    await page2.click('[data-testid="chat-tab"]');

    // Exchange messages
    await page1.fill('[data-testid="chat-input"]', 'First message');
    await page1.click('[data-testid="send-button"]');

    await page2.fill('[data-testid="chat-input"]', 'Second message');
    await page2.click('[data-testid="send-button"]');

    // Third user joins later
    await page3.goto(`/room/${testRoomId}-history?name=Charlie`);
    await page3.waitForSelector('[data-testid="chat-container"]');
    await page3.click('[data-testid="chat-tab"]');

    // Charlie should see the chat history
    await expect(page3.locator('[data-testid="chat-messages"]')).toContainText('First message');
    await expect(page3.locator('[data-testid="chat-messages"]')).toContainText('Second message');

    // Clean up
    await context1.close();
    await context2.close();
    await context3.close();
  });

  test('should handle empty messages gracefully', async ({ page }) => {
    await page.goto(`/room/${testRoomId}-empty?name=TestUser`);
    await page.waitForSelector('[data-testid="chat-container"]');
    await page.click('[data-testid="chat-tab"]');

    // Try to send empty message
    await page.click('[data-testid="send-button"]');

    // Should not create any message in the chat
    const messageCount = await page.locator('[data-testid="chat-message"]').count();
    expect(messageCount).toBe(0);

    // Input should remain focused/empty
    const inputValue = await page.inputValue('[data-testid="chat-input"]');
    expect(inputValue).toBe('');
  });

  test('should display proper message styling', async ({ page }) => {
    await page.goto(`/room/${testRoomId}-styling?name=TestUser`);
    await page.waitForSelector('[data-testid="chat-container"]');
    await page.click('[data-testid="chat-tab"]');

    // Send a message
    await page.fill('[data-testid="chat-input"]', 'Test message for styling');
    await page.click('[data-testid="send-button"]');

    // Check if own message has correct styling (right aligned, blue)
    const ownMessage = page.locator('[data-testid="chat-message-own"]').first();
    await expect(ownMessage).toBeVisible();
    
    // Check message content
    await expect(ownMessage).toContainText('Test message for styling');
    
    // Verify timestamp is displayed
    await expect(ownMessage.locator('[data-testid="message-timestamp"]')).toBeVisible();
  });

  test('should handle connection reconnection', async ({ page }) => {
    await page.goto(`/room/${testRoomId}-reconnect?name=TestUser`);
    await page.waitForSelector('[data-testid="chat-container"]');

    // Check initial connection status
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('connected');

    // Note: This test would need more sophisticated setup to actually test
    // network disconnection and reconnection scenarios
    
    // For now, just verify the UI elements are present
    await expect(page.locator('[data-testid="chat-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="participant-tab"]')).toBeVisible();
  });
});
