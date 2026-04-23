import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  CURRENT_USER,
  ALL_USERS,
  STARS_GRANTS,
  BLOCKED_WORDS,
  FLAGGED_WORDS,
  type Conversation,
  type Message,
  type BlockRelation,
  type Report,
} from '@/data/mock';

// --- FR-IM-06: Content moderation ---

export type ModerationResult = {
  decision: 'allow' | 'flag' | 'block';
  reason?: string;
};

function moderateContent(text: string): ModerationResult {
  const lower = text.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word))
      return { decision: 'block', reason: `Content contains prohibited term: "${word}"` };
  }
  for (const word of FLAGGED_WORDS) {
    if (lower.includes(word))
      return { decision: 'flag', reason: `Content flagged for review: "${word}"` };
  }
  return { decision: 'allow' };
}

// --- FR-IM-05: Access control + ScoutStar gating ---

export type AccessDecision = { allowed: boolean; reason?: string };

function checkAccess(
  senderId: string,
  peerId: string,
  blocks: BlockRelation[],
): AccessDecision {
  const sender = ALL_USERS[senderId];
  const peer = ALL_USERS[peerId];
  if (!sender || !peer) return { allowed: false, reason: 'User not found' };

  const isBlocked = blocks.some(
    (b) =>
      (b.blockerId === senderId && b.blockedId === peerId) ||
      (b.blockerId === peerId && b.blockedId === senderId),
  );
  if (isBlocked) return { allowed: false, reason: 'This user is blocked' };

  if (sender.role === 'scout' && peer.role === 'athlete') {
    const stars = STARS_GRANTS[`${senderId}:${peerId}`] ?? 0;
    if (stars < 3)
      return {
        allowed: false,
        reason: `Scouts must send at least 3 ScoutStars before messaging (current: ${stars}/3)`,
      };
  }

  if (sender.role === 'athlete' && peer.role === 'athlete') {
    if (!sender.isPremium || !peer.isPremium)
      return { allowed: false, reason: 'Both athletes must be Premium to message each other' };
  }

  return { allowed: true };
}

/**
 * Returns the number of ScoutStars a scout-type peer has sent to the current user.
 * Returns null if peer is not a scout or relation is not applicable.
 */
export function getScoutStarsForPeer(peerId: string): number | null {
  const peer = ALL_USERS[peerId];
  if (!peer || peer.role !== 'scout') return null;
  return STARS_GRANTS[`${peerId}:${CURRENT_USER.id}`] ?? 0;
}

// --- Store types ---

export type SendResult = {
  ok: boolean;
  error?: string;
  moderation?: ModerationResult;
};

interface ChatStore {
  conversations: Conversation[];
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, content: string) => SendResult;
  markAsRead: (conversationId: string) => void;
  totalUnread: number;

  // FR-IM-05
  checkCanMessage: (peerId: string) => AccessDecision;

  // FR-IM-07
  blocks: BlockRelation[];
  reports: Report[];
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;
  reportMessage: (messageId: string, reason: string) => void;
  reportUser: (userId: string, reason: string) => void;

  // FR-IM-08
  typingPeers: Record<string, boolean>;
}

const ChatContext = createContext<ChatStore | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(
    [...MOCK_CONVERSATIONS].sort(
      (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
    ),
  );
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [blocks, setBlocks] = useState<BlockRelation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [typingPeers, setTypingPeers] = useState<Record<string, boolean>>({});

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const getMessages = useCallback(
    (conversationId: string) => allMessages[conversationId] ?? [],
    [allMessages],
  );

  // FR-IM-05
  const checkCanMessage = useCallback(
    (peerId: string) => checkAccess(CURRENT_USER.id, peerId, blocks),
    [blocks],
  );

  // FR-IM-07: Block
  const blockUser = useCallback((userId: string) => {
    setBlocks((prev) => {
      if (prev.some((b) => b.blockerId === CURRENT_USER.id && b.blockedId === userId)) return prev;
      return [...prev, { blockerId: CURRENT_USER.id, blockedId: userId }];
    });
  }, []);

  const unblockUser = useCallback((userId: string) => {
    setBlocks((prev) =>
      prev.filter((b) => !(b.blockerId === CURRENT_USER.id && b.blockedId === userId)),
    );
  }, []);

  const isUserBlocked = useCallback(
    (userId: string) =>
      blocks.some(
        (b) =>
          (b.blockerId === CURRENT_USER.id && b.blockedId === userId) ||
          (b.blockerId === userId && b.blockedId === CURRENT_USER.id),
      ),
    [blocks],
  );

  // FR-IM-07: Report
  const reportMessage = useCallback((messageId: string, reason: string) => {
    const report: Report = {
      id: `rpt-${Date.now()}`,
      reporterId: CURRENT_USER.id,
      targetType: 'message',
      targetId: messageId,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setReports((prev) => [...prev, report]);
  }, []);

  const reportUser = useCallback((userId: string, reason: string) => {
    const report: Report = {
      id: `rpt-${Date.now()}`,
      reporterId: CURRENT_USER.id,
      targetType: 'user',
      targetId: userId,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setReports((prev) => [...prev, report]);
  }, []);

  // FR-IM-03: delivery/read status progression + FR-IM-08: typing indicator (animation only)
  const scheduleStatusUpdates = useCallback(
    (messageId: string, conversationId: string) => {
      const timers: ReturnType<typeof setTimeout>[] = [];

      // sent → delivered after 1s
      timers.push(
        setTimeout(() => {
          setAllMessages((prev) => ({
            ...prev,
            [conversationId]: (prev[conversationId] ?? []).map((m) =>
              m.id === messageId ? { ...m, status: 'delivered' as const } : m,
            ),
          }));
        }, 1000),
      );

      // delivered → read after 3s
      timers.push(
        setTimeout(() => {
          setAllMessages((prev) => ({
            ...prev,
            [conversationId]: (prev[conversationId] ?? []).map((m) =>
              m.id === messageId ? { ...m, status: 'read' as const } : m,
            ),
          }));
        }, 3000),
      );

      // FR-IM-08: show typing indicator briefly (3.5s–5.5s) as visual feedback
      timers.push(
        setTimeout(() => {
          setTypingPeers((prev) => ({ ...prev, [conversationId]: true }));
        }, 3500),
      );
      timers.push(
        setTimeout(() => {
          setTypingPeers((prev) => ({ ...prev, [conversationId]: false }));
        }, 5500),
      );

      timersRef.current[conversationId] = [
        ...(timersRef.current[conversationId] ?? []),
        ...timers,
      ];
    },
    [],
  );

  const sendMessage = useCallback(
    (conversationId: string, content: string): SendResult => {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return { ok: false, error: 'Conversation not found' };

      // FR-IM-05: access control
      const access = checkAccess(CURRENT_USER.id, conversation.peer.id, blocks);
      if (!access.allowed) return { ok: false, error: access.reason };

      // FR-IM-06: content moderation
      const modResult = moderateContent(content);
      if (modResult.decision === 'block')
        return { ok: false, error: modResult.reason, moderation: modResult };

      const timestamp = new Date().toISOString();
      const newMsg: Message = {
        id: `m-${Date.now()}`,
        conversationId,
        senderId: CURRENT_USER.id,
        content,
        status: 'sent',
        createdAt: timestamp,
        moderationStatus: modResult.decision === 'flag' ? 'flagged' : 'allowed',
      };

      setAllMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), newMsg],
      }));

      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === conversationId
              ? { ...c, lastMessage: content, lastActivityAt: timestamp }
              : c,
          )
          .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()),
      );

      // FR-IM-03 + FR-IM-08
      scheduleStatusUpdates(newMsg.id, conversationId);

      return { ok: true, moderation: modResult };
    },
    [conversations, blocks, scheduleStatusUpdates],
  );

  const markAsRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        getMessages,
        sendMessage,
        markAsRead,
        totalUnread,
        checkCanMessage,
        blocks,
        reports,
        blockUser,
        unblockUser,
        isUserBlocked,
        reportMessage,
        reportUser,
        typingPeers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatStore must be used within ChatProvider');
  return ctx;
}
