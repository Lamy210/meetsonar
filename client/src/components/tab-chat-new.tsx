import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import type { TargetedEvent } from "preact/compat";
import { Button } from "@/components/ui/minimal-button";
import { Input } from "@/components/ui/minimal-input";
import { ScrollArea } from "@/components/ui/minimal-scroll-area";
import { Send, MessageSquare } from "lucide-react";
import type { ChatMessage } from "@shared/schema-sqlite";

interface TabChatProps {
    roomId: string;
    participantId: string;
    displayName: string;
    connectionStatus: "connecting" | "connected" | "disconnected" | "failed";
    sendMessage: (message: string) => void;
    chatMessages: ChatMessage[];
    requestChatHistory: () => void;
}

export default function TabChat({ roomId, participantId, displayName, connectionStatus, sendMessage, chatMessages, requestChatHistory }: TabChatProps) {
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

    const isConnected = connectionStatus === 'connected';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        // chatMessagesが変更されたときに強制的に再レンダリング
        setForceUpdate(prev => prev + 1);
    }, [safeMessages]);

    // 初回レンダリング時とparticipantIdが変更された時にチャット履歴を要求
    useEffect(() => {
        if (isConnected && participantId) {
            console.log("Requesting chat history due to connection/participant change");
            requestChatHistory();
        }
    }, [isConnected, participantId, requestChatHistory]);

    const handleSendMessage = useCallback(() => {
        if (newMessage.trim() && isConnected) {
            console.log("Sending message:", newMessage.trim());
            sendMessage(newMessage.trim());
            setNewMessage("");
        }
    }, [newMessage, isConnected, sendMessage]);

    const handleKeyPress = useCallback((e: any) => {
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
        <div className="grid grid-rows-[auto_1fr_auto] h-full bg-slate-900 min-h-0" data-testid="chat-container">
            {/* チャットヘッダー */}
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-white">チャット</h3>
                        <p className="text-xs text-slate-400">
                            {isConnected ? "リアルタイムで同期中" : "接続中..."}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                console.log("Manual refresh button clicked");
                                requestChatHistory();
                            }}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            disabled={!isConnected}
                        >
                            更新
                        </button>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} data-testid="connection-status"></div>
                    </div>
                </div>
            </div>

            {/* Messages Area - Grid Layout for proper sticky positioning */}
            <div className="overflow-y-auto">
                <div className="p-4" data-testid="chat-messages">
                    {safeMessages.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">メッセージはまだありません</p>
                            <p className="text-xs">最初のメッセージを送信してみましょう</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {safeMessages.map((message, index) => {
                                const isOwnMessage = message.participantId === participantId;
                                const prevMessage = index > 0 ? safeMessages[index - 1] : null;
                                const nextMessage = index < safeMessages.length - 1 ? safeMessages[index + 1] : null;

                                // 同じ送信者の連続メッセージかチェック
                                const isSameSender = prevMessage?.participantId === message.participantId;
                                const isNextSameSender = nextMessage?.participantId === message.participantId;

                                // アバターとタイムスタンプの表示条件
                                const showAvatar = !isSameSender;
                                const showTime = !isNextSameSender;

                                return (
                                    <div key={`${message.id}-${index}-${forceUpdate}`} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                        {/* 左側のスペース（自分のメッセージ時） */}
                                        <div className="w-2"></div>

                                        {/* アバター部分（相手のメッセージ時） */}
                                        <div className="flex-shrink-0 mr-3">
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
                                                className={`px-4 py-3 text-sm max-w-full break-words shadow-md transition-all duration-200 ${isOwnMessage
                                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-lg hover:shadow-lg'
                                                        : 'bg-slate-700 text-slate-100 rounded-2xl rounded-bl-lg hover:bg-slate-600'
                                                    }`}
                                            >
                                                {message.message}
                                            </div>

                                            {/* タイムスタンプ */}
                                            {showTime && (
                                                <div className={`text-xs mt-1 text-slate-500 ${isOwnMessage ? 'text-right pr-1' : 'text-left pl-1'
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
            </div>

            {/* Input Area - Sticky at bottom */}
            <div className="sticky bottom-0 p-4 border-t border-slate-700/50 bg-slate-800/90 backdrop-blur-sm">
                <div className="flex space-x-3 items-end">
                    <div className="flex-1">
                        <Input
                            ref={inputRef}
                            value={newMessage}
                            onChange={(e: any) => setNewMessage(e.target?.value || '')}
                            onKeyPress={handleKeyPress}
                            placeholder="メッセージを入力..."
                            className="bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            disabled={!isConnected}
                            data-testid="chat-input"
                        />
                    </div>
                    <Button
                        onClick={handleSendMessage}
                        size="sm"
                        disabled={!newMessage.trim() || !isConnected}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-3 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="send-button"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                {!isConnected && (
                    <p className="text-xs text-slate-400 mt-2 text-center animate-pulse">接続中...</p>
                )}
            </div>
        </div>
    );
}
