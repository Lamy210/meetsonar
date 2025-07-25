import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

interface TabChatProps {
    roomId: string;
    participantId: string;
    displayName: string;
    userStableId: string;
    connectionStatus: "connecting" | "connected" | "disconnected" | "failed";
    sendMessage: (message: string) => void;
    chatMessages: ChatMessage[];
    requestChatHistory: () => void;
}

export default function TabChat({ roomId, participantId, displayName, userStableId, connectionStatus, sendMessage, chatMessages, requestChatHistory }: TabChatProps) {
    console.log("=== TabChat Render ===", {
        roomId, 
        participantId, 
        displayName, 
        connectionStatus, 
        chatMessagesCount: chatMessages?.length || 0,
        chatMessagesType: typeof chatMessages,
        isArray: Array.isArray(chatMessages),
        actualMessages: chatMessages
    });
    
    // chatMessagesが配列でない場合の防御的処理
    const safeMessages = Array.isArray(chatMessages) ? chatMessages : [];
    
    // 強制的に状態を更新するためのカウンター
    const [forceUpdate, setForceUpdate] = useState(0);
    
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [userHasScrolled, setUserHasScrolled] = useState(false);
    const lastScrollTopRef = useRef<number>(0);

    const isConnected = connectionStatus === 'connected';

    // スクロール管理の改善
    const scrollToBottom = useCallback((force = false) => {
        if (force || !userHasScrolled) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ 
                    behavior: "smooth",
                    block: "nearest" 
                });
            }, 50);
        }
    }, [userHasScrolled]);

    // ユーザーによるスクロール検出の改善
    const handleScroll = useCallback(() => {
        const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (!scrollElement) return;
        
        const currentScrollTop = scrollElement.scrollTop;
        const scrollHeight = scrollElement.scrollHeight;
        const clientHeight = scrollElement.clientHeight;
        
        // 最下部から100px以内でなければユーザーがスクロールしたと判定
        const isNearBottom = (scrollHeight - currentScrollTop - clientHeight) < 100;
        const isAtTop = currentScrollTop < 50;
        
        if (!isNearBottom && currentScrollTop < lastScrollTopRef.current) {
            // 上向きにスクロールした場合（しかし最上部ではない）
            if (!isAtTop) {
                setUserHasScrolled(true);
            }
        } else if (isNearBottom) {
            // 最下部近くに戻った場合はリセット
            setUserHasScrolled(false);
        }
        
        lastScrollTopRef.current = currentScrollTop;
    }, []);

    useEffect(() => {
        // 新しいメッセージが追加された時のみスクロール
        if (safeMessages.length > 0) {
            setTimeout(() => scrollToBottom(), 100);
        }
        // chatMessagesが変更されたときに強制的に再レンダリング
        setForceUpdate(prev => prev + 1);
    }, [safeMessages.length, scrollToBottom]);

    // Request chat history when component mounts or connection is established
    useEffect(() => {
        if (isConnected) {
            console.log("Connection established, requesting chat history...");
            requestChatHistory();
            // 少し遅延してもう一度リクエスト（確実に取得するため）
            setTimeout(() => {
                requestChatHistory();
            }, 1000);
        }
    }, [isConnected, requestChatHistory]);

    // 自動更新機能（30秒間隔）
    useEffect(() => {
        if (!isConnected) return;

        const autoRefreshInterval = setInterval(() => {
            console.log("Auto-refreshing chat history...");
            requestChatHistory();
        }, 30000); // 30秒間隔

        return () => clearInterval(autoRefreshInterval);
    }, [isConnected, requestChatHistory]);

    // ScrollAreaのスクロール監視用のuseEffect
    useEffect(() => {
        const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (!scrollElement) return;

        const handleScrollEvent = () => {
            handleScroll();
        };

        scrollElement.addEventListener('scroll', handleScrollEvent);
        return () => scrollElement.removeEventListener('scroll', handleScrollEvent);
    }, [handleScroll]);

    // Focus input when component mounts
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSendMessage = useCallback(() => {
        console.log("=== handleSendMessage ===", {
            newMessage: newMessage.trim(),
            isConnected,
            roomId,
            participantId,
            displayName
        });
        
        if (!newMessage.trim() || !isConnected) {
            console.warn("Cannot send message:", { 
                hasMessage: !!newMessage.trim(), 
                isConnected 
            });
            return;
        }

        console.log("Calling sendMessage function...");
        
        // メッセージにユーザー識別情報を保存（localStorage）
        const messageKey = `msg_${Date.now()}_${userStableId}`;
        localStorage.setItem(messageKey, JSON.stringify({
            userStableId,
            displayName,
            participantId,
            message: newMessage.trim(),
            timestamp: Date.now()
        }));
        
        sendMessage(newMessage.trim());
        setNewMessage("");
        
        // メッセージ送信時は必ずスクロールしてスクロール状態をリセット
        setUserHasScrolled(false);
        
        // メッセージ送信後にチャット履歴をリフレッシュして強制スクロール
        setTimeout(() => {
            console.log("Refreshing chat history after sending message...");
            requestChatHistory();
            // 強制的に最下部にスクロール
            setTimeout(() => scrollToBottom(true), 200);
        }, 500);
    }, [newMessage, isConnected, sendMessage, roomId, participantId, displayName, requestChatHistory, scrollToBottom]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    const formatTime = (date: Date | string) => {
        const messageDate = new Date(date);
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 min-h-0" data-testid="chat-container" role="main" aria-label="チャット画面">            
            {/* チャットヘッダー */}
            <div className="px-3 sm:px-4 py-2 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-white">チャット</h3>
                        <p className="text-xs text-slate-400" aria-live="polite">
                            {isConnected ? "自動更新中 (30秒間隔)" : "接続中..."}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="text-xs text-slate-500">
                            自動同期
                        </div>
                        <div 
                            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} 
                            data-testid="connection-status"
                            aria-label={isConnected ? "接続中" : "未接続"}
                            role="status"
                        ></div>
                    </div>
                </div>
                
                {/* デバッグ情報パネル（開発中のみ表示） */}
                <div className="mt-2 p-2 bg-slate-900/50 rounded text-xs text-slate-300">
                    <div className="grid grid-cols-2 gap-1">
                        <div><strong>PID:</strong> {participantId || 'N/A'}</div>
                        <div><strong>Name:</strong> {displayName || 'N/A'}</div>
                        <div><strong>Stored:</strong> {localStorage.getItem("displayName") || 'N/A'}</div>
                        <div><strong>StableID:</strong> {userStableId.slice(-8) || 'N/A'}</div>
                    </div>
                </div>
            </div>

            {/* Messages Area - Grid Layout for proper sticky positioning */}
            <div className="flex-1 overflow-hidden" role="log" aria-label="チャットメッセージ一覧" aria-live="polite">
                <ScrollArea ref={scrollAreaRef} className="h-full">
                    <div className="p-2 sm:p-3" data-testid="chat-messages">
                        {safeMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
                                    <MessageSquare className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-400 text-sm mb-2">チャットを開始しましょう</p>
                                <p className="text-slate-500 text-xs">最初のメッセージを送信してください</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {safeMessages.map((message, index) => {
                                    // より安定したメッセージ識別方法（複数の方法を組み合わせ）
                                    const storedDisplayName = localStorage.getItem("displayName");
                                    
                                    // ローカルストレージからの送信済みメッセージチェック
                                    const isRecentlySentMessage = () => {
                                        const recentThreshold = 60000; // 1分以内
                                        const messageTime = new Date(message.createdAt).getTime();
                                        for (let i = 0; i < localStorage.length; i++) {
                                            const key = localStorage.key(i);
                                            if (key && key.startsWith('msg_')) {
                                                try {
                                                    const storedMsg = JSON.parse(localStorage.getItem(key) || '{}');
                                                    if (storedMsg.message === message.message && 
                                                        storedMsg.displayName === message.displayName &&
                                                        Math.abs(messageTime - storedMsg.timestamp) < recentThreshold) {
                                                        return true;
                                                    }
                                                } catch (e) {
                                                    // ignore parse errors
                                                }
                                            }
                                        }
                                        return false;
                                    };
                                    
                                    const isOwnMessage = (
                                        // 1. participantIdで判定（最優先）
                                        message.participantId === participantId ||
                                        // 2. displayNameで判定（fallback）
                                        (message.displayName === displayName && displayName !== null && displayName !== "") ||
                                        // 3. localStorage中のdisplayNameで判定
                                        (message.displayName === storedDisplayName && storedDisplayName !== null && storedDisplayName !== "") ||
                                        // 4. 最近送信したメッセージかチェック
                                        isRecentlySentMessage()
                                    );
                                    
                                    console.log("Message ownership check:", {
                                        messageId: message.id,
                                        messageParticipantId: message.participantId,
                                        currentParticipantId: participantId,
                                        messageDisplayName: message.displayName,
                                        currentDisplayName: displayName,
                                        storedDisplayName: storedDisplayName,
                                        userStableId: userStableId,
                                        isOwnMessage,
                                        matchedBy: (
                                            message.participantId === participantId ? "participantId" :
                                            message.displayName === displayName ? "displayName" :
                                            message.displayName === storedDisplayName ? "storedDisplayName" :
                                            "none"
                                        )
                                    });
                                    const prevMessage = index > 0 ? safeMessages[index - 1] : null;
                                    const nextMessage = index < safeMessages.length - 1 ? safeMessages[index + 1] : null;
                                    
                                    const showAvatar = !isOwnMessage && (
                                        !prevMessage || 
                                        prevMessage.participantId !== message.participantId ||
                                        new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000
                                    );
                                    
                                    const showTime = (
                                        !nextMessage || 
                                        nextMessage.participantId !== message.participantId ||
                                        new Date(nextMessage.createdAt).getTime() - new Date(message.createdAt).getTime() > 300000
                                    );

                                    return (
                                        <div
                                            key={message.id || `${message.createdAt}-${index}`}
                                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                                                showAvatar || index === 0 ? 'mt-4' : 'mt-1'
                                            }`}
                                            data-testid={isOwnMessage ? "chat-message-own" : "chat-message-other"}
                                        >
                                            {/* 左側のアバター（相手のメッセージのみ） */}
                                            <div className="flex flex-col items-end mr-2">
                                                {!isOwnMessage && showAvatar && (
                                                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg mb-1">
                                                        {(message.displayName || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                {!isOwnMessage && !showAvatar && (
                                                    <div className="w-8 h-8"></div>
                                                )}
                                            </div>

                                            {/* メッセージ部分 */}
                                            <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                                                {/* 送信者名（相手のメッセージで初回のみ） */}
                                                {showAvatar && !isOwnMessage && (
                                                    <div className="text-xs text-slate-400 mb-1 px-1">
                                                        {message.displayName}
                                                    </div>
                                                )}

                                                {/* メッセージバブル */}
                                                <div
                                                    className={`px-4 py-3 text-sm max-w-full break-words shadow-md relative ${
                                                        isOwnMessage
                                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-lg' 
                                                            : 'bg-slate-700 text-slate-100 rounded-2xl rounded-bl-lg'
                                                    }`}
                                                >
                                                    {/* デバッグ用の小さなマーカー */}
                                                    {isOwnMessage && (
                                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white text-xs flex items-center justify-center" title="あなたのメッセージ">
                                                            ✓
                                                        </div>
                                                    )}
                                                    {message.message}
                                                </div>

                                                {/* タイムスタンプ */}
                                                {showTime && (
                                                    <div className={`text-xs mt-1 text-slate-500 ${
                                                        isOwnMessage ? 'text-right pr-1' : 'text-left pl-1'
                                                    }`}>
                                                        {formatTime(message.createdAt)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 右側のスペース（自分のメッセージ時） */}
                                            <div className="w-2"></div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} className="h-1" />
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="p-2 sm:p-3 border-t border-slate-700/50 bg-slate-800/30" role="form" aria-label="メッセージ入力エリア">
                <div className="flex space-x-2 sm:space-x-3 items-end">
                    <div className="flex-1">
                        <Input
                            ref={inputRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="メッセージを入力..."
                            className="bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            disabled={!isConnected}
                            data-testid="chat-input"
                            aria-label="メッセージを入力"
                            maxLength={1000}
                        />
                    </div>
                    <Button
                        onClick={handleSendMessage}
                        size="sm"
                        disabled={!newMessage.trim() || !isConnected}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-3 py-2 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        data-testid="send-button"
                        aria-label="メッセージを送信"
                    >
                        <Send className="w-4 h-4" />
                        <span className="sr-only">送信</span>
                    </Button>
                </div>
                {!isConnected && (
                    <p className="text-xs text-slate-400 mt-2 text-center" aria-live="polite">接続中...</p>
                )}
            </div>
        </div>
    );
}
