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
        sendMessage(newMessage.trim());
        setNewMessage("");
        
        // メッセージ送信後にチャット履歴をリフレッシュ
        setTimeout(() => {
            console.log("Refreshing chat history after sending message...");
            requestChatHistory();
        }, 500);
    }, [newMessage, isConnected, sendMessage, roomId, participantId, displayName, requestChatHistory]);

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
        <div className="flex flex-col h-full bg-slate-900 min-h-[400px]" data-testid="chat-container">
            {/* デバッグ情報表示 */}
            <div className="px-2 py-1 bg-yellow-600 text-black text-xs">
                DEBUG: TabChat rendered - Messages: {safeMessages.length} | Status: {connectionStatus}
            </div>
            
            {/* チャットヘッダー */}
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
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
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            disabled={!isConnected}
                        >
                            更新
                        </button>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} data-testid="connection-status"></div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1">
                    <div className="p-4" data-testid="chat-messages">
                        {/* デバッグ情報 */}
                        <div className="mb-4 p-2 bg-blue-900 text-blue-200 text-xs rounded">
                            Messages Count: {safeMessages.length} | 
                            Connection: {connectionStatus} | 
                            Room: {roomId} | 
                            Participant: {participantId}
                        </div>
                        
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
                                {/* 全メッセージのデバッグ情報 */}
                                <div className="mb-2 p-2 bg-gray-800 text-gray-300 text-xs rounded">
                                    Raw Messages: {JSON.stringify(safeMessages.map(m => ({
                                        id: m.id,
                                        message: m.message,
                                        displayName: m.displayName,
                                        participantId: m.participantId,
                                        createdAt: m.createdAt
                                    })), null, 2)}
                                </div>
                                {safeMessages.map((message, index) => {
                                    const isOwnMessage = message.participantId === participantId;
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
                                                    className={`px-4 py-3 text-sm max-w-full break-words shadow-md ${
                                                        isOwnMessage
                                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-lg' 
                                                            : 'bg-slate-700 text-slate-100 rounded-2xl rounded-bl-lg'
                                                    }`}
                                                >
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
            <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                <div className="flex space-x-3 items-end">
                    <div className="flex-1">
                        <Input
                            ref={inputRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="メッセージを入力..."
                            className="bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!isConnected}
                            data-testid="chat-input"
                        />
                    </div>
                    <Button
                        onClick={handleSendMessage}
                        size="sm"
                        disabled={!newMessage.trim() || !isConnected}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-3 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
                        data-testid="send-button"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                {!isConnected && (
                    <p className="text-xs text-slate-400 mt-2 text-center">接続中...</p>
                )}
            </div>
        </div>
    );
}
