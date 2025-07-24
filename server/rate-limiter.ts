// チャットメッセージのレート制限
class ChatRateLimiter {
    private messageHistory: Map<string, number[]> = new Map();
    private readonly WINDOW_MS = 60 * 1000; // 1分間
    private readonly MAX_MESSAGES = 30; // 1分間に最大30メッセージ

    isAllowed(participantId: string): boolean {
        const now = Date.now();
        const userHistory = this.messageHistory.get(participantId) || [];

        // 古いメッセージを削除
        const recentMessages = userHistory.filter(timestamp => now - timestamp < this.WINDOW_MS);

        if (recentMessages.length >= this.MAX_MESSAGES) {
            return false;
        }

        // 新しいメッセージを記録
        recentMessages.push(now);
        this.messageHistory.set(participantId, recentMessages);

        return true;
    }

    // 定期的にクリーンアップ
    cleanup() {
        const now = Date.now();
        const participantIds = Array.from(this.messageHistory.keys());

        for (const participantId of participantIds) {
            const timestamps = this.messageHistory.get(participantId) || [];
            const recentTimestamps = timestamps.filter((ts: number) => now - ts < this.WINDOW_MS);

            if (recentTimestamps.length === 0) {
                this.messageHistory.delete(participantId);
            } else {
                this.messageHistory.set(participantId, recentTimestamps);
            }
        }
    }
}

export const chatRateLimiter = new ChatRateLimiter();

// 5分ごとにクリーンアップ
setInterval(() => chatRateLimiter.cleanup(), 5 * 60 * 1000);
