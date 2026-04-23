export interface User {
  id: string;
  displayName: string;
  role: 'athlete' | 'scout' | 'club';
  avatar: string;
  isPremium: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: string;
  moderationStatus?: 'allowed' | 'flagged' | 'blocked';
}

export interface Conversation {
  id: string;
  peer: User;
  lastMessage: string;
  lastActivityAt: string;
  unreadCount: number;
}

export interface BlockRelation {
  blockerId: string;
  blockedId: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'message' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'reviewing' | 'resolved';
  createdAt: string;
}

export const CURRENT_USER: User = {
  id: 'me',
  displayName: 'Alex Chen',
  role: 'athlete',
  avatar: 'AC',
  isPremium: true,
};

export const ALL_USERS: Record<string, User> = {
  'me': CURRENT_USER,
  'user-1': { id: 'user-1', displayName: 'James Miller', role: 'scout', avatar: 'JM', isPremium: true },
  'user-2': { id: 'user-2', displayName: 'FC Sydney Academy', role: 'club', avatar: 'FS', isPremium: true },
  'user-3': { id: 'user-3', displayName: 'Sarah Johnson', role: 'scout', avatar: 'SJ', isPremium: true },
  'user-4': { id: 'user-4', displayName: 'Leo Park', role: 'athlete', avatar: 'LP', isPremium: true },
  'user-5': { id: 'user-5', displayName: 'Tom Wright', role: 'athlete', avatar: 'TW', isPremium: false },
};

export const STARS_GRANTS: Record<string, number> = {
  'user-1:me': 5,
  'user-3:me': 3,
};

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    peer: ALL_USERS['user-1'],
    lastMessage: 'I saw your highlight reel, very impressive!',
    lastActivityAt: '2026-04-23T01:30:00Z',
    unreadCount: 2,
  },
  {
    id: 'conv-2',
    peer: ALL_USERS['user-2'],
    lastMessage: 'We have a trial session next Monday.',
    lastActivityAt: '2026-04-22T18:00:00Z',
    unreadCount: 0,
  },
  {
    id: 'conv-3',
    peer: ALL_USERS['user-3'],
    lastMessage: 'Can you send me your latest match stats?',
    lastActivityAt: '2026-04-22T10:15:00Z',
    unreadCount: 1,
  },
  {
    id: 'conv-4',
    peer: ALL_USERS['user-4'],
    lastMessage: 'Good luck at the tryouts tomorrow!',
    lastActivityAt: '2026-04-21T22:00:00Z',
    unreadCount: 0,
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    { id: 'm1', conversationId: 'conv-1', senderId: 'user-1', content: "Hi Alex, I'm a scout from Melbourne United.", status: 'read', createdAt: '2026-04-23T01:00:00Z' },
    { id: 'm2', conversationId: 'conv-1', senderId: 'me', content: 'Hi James! Thanks for reaching out.', status: 'read', createdAt: '2026-04-23T01:05:00Z' },
    { id: 'm3', conversationId: 'conv-1', senderId: 'user-1', content: 'I saw your highlight reel, very impressive!', status: 'delivered', createdAt: '2026-04-23T01:30:00Z' },
  ],
  'conv-2': [
    { id: 'm4', conversationId: 'conv-2', senderId: 'user-2', content: 'Welcome to FC Sydney Academy chat.', status: 'read', createdAt: '2026-04-22T15:00:00Z' },
    { id: 'm5', conversationId: 'conv-2', senderId: 'me', content: "Thank you! I'm very interested in the program.", status: 'read', createdAt: '2026-04-22T16:30:00Z' },
    { id: 'm6', conversationId: 'conv-2', senderId: 'user-2', content: 'We have a trial session next Monday.', status: 'read', createdAt: '2026-04-22T18:00:00Z' },
  ],
  'conv-3': [
    { id: 'm7', conversationId: 'conv-3', senderId: 'user-3', content: "Hello Alex, I've been following your season.", status: 'read', createdAt: '2026-04-22T09:00:00Z' },
    { id: 'm8', conversationId: 'conv-3', senderId: 'user-3', content: 'Can you send me your latest match stats?', status: 'delivered', createdAt: '2026-04-22T10:15:00Z' },
  ],
  'conv-4': [
    { id: 'm9', conversationId: 'conv-4', senderId: 'me', content: 'Hey Leo, are you going to the tryouts?', status: 'read', createdAt: '2026-04-21T20:00:00Z' },
    { id: 'm10', conversationId: 'conv-4', senderId: 'user-4', content: 'Good luck at the tryouts tomorrow!', status: 'read', createdAt: '2026-04-21T22:00:00Z' },
  ],
};

export const BLOCKED_WORDS = ['spam', 'scam', 'hack', 'cheat'];

export const FLAGGED_WORDS = ['money', 'payment', 'transfer', 'cash'];
