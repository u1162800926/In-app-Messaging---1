import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useChatStore } from '@/context/chat-store';
import { type Conversation } from '@/data/mock';

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function roleLabel(role: string) {
  const map: Record<string, string> = { scout: 'Scout', club: 'Club', athlete: 'Athlete' };
  return map[role] ?? role;
}

function roleBadgeColor(role: string) {
  const map: Record<string, string> = { scout: '#E8F5E9', club: '#E3F2FD', athlete: '#FFF3E0' };
  return map[role] ?? '#F5F5F5';
}

function roleBadgeTextColor(role: string) {
  const map: Record<string, string> = { scout: '#2E7D32', club: '#1565C0', athlete: '#E65100' };
  return map[role] ?? '#333';
}

function ConversationItem({ item }: { item: Conversation }) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [styles.conversationItem, pressed && styles.pressed]}
      onPress={() => router.push(`/chat/${item.id}` as any)}
    >
      <View style={styles.avatar}>
        <ThemedText style={styles.avatarText}>{item.peer.avatar}</ThemedText>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <ThemedText style={styles.peerName} numberOfLines={1}>
              {item.peer.displayName}
            </ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor(item.peer.role) }]}>
              <ThemedText style={[styles.roleText, { color: roleBadgeTextColor(item.peer.role) }]}>
                {roleLabel(item.peer.role)}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.timestamp}>{formatTime(item.lastActivityAt)}</ThemedText>
        </View>
        <View style={styles.bottomRow}>
          <ThemedText style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </ThemedText>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <ThemedText style={styles.unreadText}>{item.unreadCount}</ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const { conversations } = useChatStore();

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationItem item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  peerName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 78,
  },
});
