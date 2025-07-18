// 共通エラーハンドラー
export function createErrorHandler(context: string) {
  return (error: unknown, ws?: WebSocket) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const logMessage = `[${context}] Error: ${errorMessage}`;
    
    console.error(logMessage, error);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'An error occurred while processing your request',
        timestamp: new Date().toISOString(),
      }));
    }
  };
}

// WebSocketメッセージ検証ユーティリティ
export function validateWebSocketMessage(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Message must be an object' };
  }
  
  if (!data.type || typeof data.type !== 'string') {
    return { isValid: false, error: 'Message type is required and must be a string' };
  }
  
  if (!data.roomId || typeof data.roomId !== 'string') {
    return { isValid: false, error: 'Room ID is required and must be a string' };
  }
  
  return { isValid: true };
}