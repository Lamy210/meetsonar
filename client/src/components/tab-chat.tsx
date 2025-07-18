import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
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
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isConnected = connectionStatus === 'connected';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    // Request chat history when component mounts or connection is established
    useEffect(() => {
        if (isConnected) {
            requestChatHistory();
        }
    }, [isConnected, requestChatHistory]);

    // Focus input when component mounts
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !isConnected) return;

        sendMessage(newMessage.trim());
        setNewMessage("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date | string) => {
        const messageDate = new Date(date);
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                    {chatMessages.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                            <p>チャットメッセージがまだありません</p>
                            <p className="text-sm mt-1">最初のメッセージを送信してください</p>
                        </div>
                    ) : (
                        chatMessages.map((message, index) => {
                            const isOwnMessage = message.participantId === participantId;
                            const showAvatar = !isOwnMessage && (index === 0 || chatMessages[index - 1].participantId !== message.participantId);

                            return (
                                <div
                                    key={`${message.id}-${index}`}
                                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[70%] ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                                        {showAvatar && !isOwnMessage && (
                                            <div className="text-xs text-slate-400 mb-1">
                                                {message.displayName}
                                            </div>
                                        )}
                                        <div
                                            className={`px-3 py-2 rounded-lg text-sm ${isOwnMessage
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-slate-700 text-slate-200'
                                                }`}
                                        >
                                            <div>{message.message}</div>
                                            <div className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-slate-400'}`}>
                                                {formatTime(message.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-700">
                <div className="flex space-x-2">
                    <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="メッセージを入力..."
                        className="flex-1 bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400"
                        disabled={!isConnected}
                    />
                    <Button
                        onClick={handleSendMessage}
                        size="sm"
                        disabled={!newMessage.trim() || !isConnected}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                {!isConnected && (
                    <p className="text-xs text-slate-400 mt-1">接続中...</p>
                )}
            </div>
        </div>
    );
}
