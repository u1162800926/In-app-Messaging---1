import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  CURRENT_USER,
  type Conversation,
  type Message,
} from '@/data/mock';

interface ChatStore {
  conversations: Conversation[];
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string) => void;
}

const ChatContext = createContext<ChatStore | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);

  const getMessages = useCallback(
    (conversationId: string) => allMessages[conversationId] ?? [],
    [allMessages],
  );

  const sendMessage = useCallback((conversationId: string, content: string) => {
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      conversationId,
      senderId: CURRENT_USER.id,
      content,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    setAllMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), newMsg],
    }));

    setConversations((prev) =>
      prev
        .map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: content, lastActivityAt: newMsg.createdAt }
            : c,
        )
        .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()),
    );
  }, []);

  const markAsRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  return (
    <ChatContext.Provider value={{ conversations, getMessages, sendMessage, markAsRead }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatStore must be used within ChatProvider');
  return ctx;
}
