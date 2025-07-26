import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/minimal-button";
import { Input } from "@/components/ui/minimal-input";
import { ScrollArea } from "@/components/ui/minimal-scroll-area";
import { Send, MessageSquare } from "lucide-react";
import type { ChatMessage } from "@shared/schema-sqlite";

interface ChatProps {
  roomId: string;
  participantId: string;
  displayName: string;
  isConnected: boolean;
  sendMessage: (message: string) => void;
  chatMessages: ChatMessage[];
  requestChatHistory: () => void;
}

export default function Chat({ roomId, participantId, displayName, isConnected, sendMessage, chatMessages, requestChatHistory }: ChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageCount, setLastReadMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setLastReadMessageCount(chatMessages.length);
      inputRef.current?.focus();
    }
  }, [isOpen, chatMessages.length]);

  // Request chat history when component mounts or connection is established
  useEffect(() => {
    if (isConnected) {
      requestChatHistory();
    }
  }, [isConnected, requestChatHistory]);

  // Watch for new messages to update unread count
  useEffect(() => {
    if (!isOpen && chatMessages.length > lastReadMessageCount) {
      setUnreadCount(chatMessages.length - lastReadMessageCount);
    }
  }, [chatMessages.length, isOpen, lastReadMessageCount]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;

    sendMessage(newMessage.trim());
    setNewMessage("");
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date | string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageSquare className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="fixed bottom-20 right-6 w-80 h-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4" />
          <span className="font-medium text-sm">Chat</span>
        </div>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          ×
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {chatMessages.map((message, index) => {
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
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e: any) => setNewMessage(e.target?.value || '')}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
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
      </div>
    </div>
  );
}
