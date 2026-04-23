import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState, useRef, useEffect } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Animated,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CURRENT_USER, type Message } from '@/data/mock';
import { useChatStore, getScoutStarsForPeer, type SendResult } from '@/context/chat-store';

function statusIcon(status: Message['status']) {
  switch (status) {
    case 'sending': return '...';
    case 'sent': return '\u2713';
    case 'delivered': return '\u2713\u2713';
    case 'read': return '\u2713\u2713';
    default: return '';
  }
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// FR-IM-08: Typing indicator dots animation
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ]),
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  onLongPress,
}: {
  message: Message;
  onLongPress: (msg: Message) => void;
}) {
  const isMe = message.senderId === CURRENT_USER.id;

  return (
    <Pressable
      onLongPress={() => onLongPress(message)}
      style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}
    >
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubblePeer]}>
        <ThemedText style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
          {message.content}
        </ThemedText>
        <View style={styles.bubbleMeta}>
          <ThemedText style={[styles.timeText, isMe && styles.timeTextMe]}>
            {formatMessageTime(message.createdAt)}
          </ThemedText>
          {isMe && (
            <ThemedText
              style={[styles.statusText, message.status === 'read' && styles.statusRead]}
            >
              {statusIcon(message.status)}
            </ThemedText>
          )}
          {message.moderationStatus === 'flagged' && (
            <ThemedText style={styles.flaggedBadge}>flagged</ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// FR-IM-05: ScoutStar info banner — only shown for scout peers who passed the threshold
function ScoutStarBanner({ peerId, peerName }: { peerId: string; peerName: string }) {
  const stars = getScoutStarsForPeer(peerId);
  if (stars === null || stars < 3) return null;

  return (
    <View style={styles.starBanner}>
      <ThemedText style={styles.starBannerIcon}>{'\u2B50'}</ThemedText>
      <View style={styles.starBannerContent}>
        <ThemedText style={styles.starBannerTitle}>
          ScoutStar: {stars} sent
        </ThemedText>
        <ThemedText style={styles.starBannerSub}>
          {peerName} sent {stars} ScoutStars to unlock this conversation.
        </ThemedText>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const {
    conversations,
    getMessages,
    sendMessage,
    markAsRead,
    isUserBlocked,
    blockUser,
    unblockUser,
    reportMessage,
    reportUser,
    typingPeers,
  } = useChatStore();

  const messages = getMessages(id);
  const conversation = conversations.find((c) => c.id === id);
  const peerName = conversation?.peer.displayName ?? 'Chat';
  const peerId = conversation?.peer.id ?? '';
  const blocked = isUserBlocked(peerId);
  const isTyping = typingPeers[id] ?? false;

  // Mark as read on enter and whenever messages change while in this screen
  useEffect(() => {
    markAsRead(id);
  }, [id, markAsRead, messages.length]);

  // Auto-scroll when new messages arrive or typing starts
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length, isTyping]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setErrorMsg('');

    const result: SendResult = sendMessage(id, text);
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Failed to send');
      return;
    }
    if (result.moderation?.decision === 'flag') {
      setErrorMsg('Message sent but flagged for review.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
    setInputText('');
  }, [inputText, id, sendMessage]);

  // FR-IM-07: long-press to report message
  const handleLongPressMessage = useCallback(
    (msg: Message) => {
      if (msg.senderId === CURRENT_USER.id) return;
      if (Platform.OS === 'web') {
        const action = prompt('Type "report" to report this message:');
        if (action?.toLowerCase() === 'report') {
          reportMessage(msg.id, 'Reported via long-press');
          setErrorMsg('Message reported. Thank you.');
          setTimeout(() => setErrorMsg(''), 3000);
        }
      } else {
        Alert.alert('Message Options', undefined, [
          {
            text: 'Report Message',
            style: 'destructive',
            onPress: () => {
              reportMessage(msg.id, 'Reported via long-press');
              Alert.alert('Reported', 'Message has been reported for review.');
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    },
    [reportMessage],
  );

  // FR-IM-07: block/unblock toggle
  const handleBlockToggle = useCallback(() => {
    if (blocked) {
      unblockUser(peerId);
      setErrorMsg('');
    } else {
      if (Platform.OS === 'web') {
        if (
          confirm(
            `Block ${peerName}? You won't be able to send or receive messages.`,
          )
        ) {
          blockUser(peerId);
        }
      } else {
        Alert.alert('Block User', `Block ${peerName}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: () => blockUser(peerId) },
        ]);
      }
    }
  }, [blocked, peerId, peerName, blockUser, unblockUser]);

  // FR-IM-07: report user
  const handleReportUser = useCallback(() => {
    if (Platform.OS === 'web') {
      const reason = prompt('Reason for reporting this user:');
      if (reason) {
        reportUser(peerId, reason);
        setErrorMsg('User reported. Thank you.');
        setTimeout(() => setErrorMsg(''), 3000);
      }
    } else {
      Alert.alert('Report User', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            reportUser(peerId, 'Reported from chat');
            Alert.alert('Reported', 'User has been reported for review.');
          },
        },
      ]);
    }
  }, [peerId, reportUser]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>{'\u2190'}</ThemedText>
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerName}>{peerName}</ThemedText>
          {conversation && (
            <ThemedText style={styles.headerRole}>
              {conversation.peer.role.charAt(0).toUpperCase() +
                conversation.peer.role.slice(1)}
            </ThemedText>
          )}
        </View>
        <Pressable onPress={handleBlockToggle} style={styles.headerAction}>
          <ThemedText style={[styles.headerActionText, blocked && styles.headerActionUnblock]}>
            {blocked ? 'Unblock' : 'Block'}
          </ThemedText>
        </Pressable>
      </View>

      {/* FR-IM-05: ScoutStar banner */}
      <ScoutStarBanner peerId={peerId} peerName={peerName} />

      {/* Blocked banner */}
      {blocked && (
        <View style={styles.blockedBanner}>
          <ThemedText style={styles.blockedBannerText}>
            This user is blocked. Unblock to continue messaging.
          </ThemedText>
        </View>
      )}

      {/* Error / info bar */}
      {!!errorMsg && (
        <View style={styles.errorBar}>
          <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} onLongPress={handleLongPressMessage} />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
      />

      {/* Composer */}
      <View style={styles.composer}>
        {blocked ? (
          <View style={styles.blockedComposer}>
            <ThemedText style={styles.blockedComposerText}>Messaging blocked</ThemedText>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              disabled={!inputText.trim()}
            >
              <ThemedText style={styles.sendText}>{'\u2191'}</ThemedText>
            </Pressable>
          </>
        )}
        {!blocked && (
          <Pressable onPress={handleReportUser} style={styles.reportButton}>
            <ThemedText style={styles.reportText}>!</ThemedText>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 16 : 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRole: {
    fontSize: 12,
    color: '#999',
  },
  headerAction: {
    width: 56,
    alignItems: 'center',
  },
  headerActionText: {
    fontSize: 13,
    color: '#c00',
    fontWeight: '600',
  },
  headerActionUnblock: {
    color: '#0a7ea4',
  },

  // ScoutStar banner (FR-IM-05)
  starBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: '#FFF8E1',
  },
  starBannerIcon: {
    fontSize: 20,
  },
  starBannerContent: {
    flex: 1,
  },
  starBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F57F17',
  },
  starBannerSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },

  // Banners
  blockedBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  blockedBannerText: {
    color: '#E65100',
    fontSize: 13,
    textAlign: 'center',
  },
  errorBar: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 13,
    textAlign: 'center',
  },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleRow: {
    marginVertical: 3,
  },
  bubbleRowLeft: {
    alignItems: 'flex-start',
  },
  bubbleRowRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: '#0a7ea4',
    borderBottomRightRadius: 4,
  },
  bubblePeer: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#111',
  },
  bubbleTextMe: {
    color: '#fff',
  },
  bubbleMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#999',
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  statusRead: {
    color: '#AED581',
  },
  flaggedBadge: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
  },

  // Typing indicator (FR-IM-08)
  typingRow: {
    alignItems: 'flex-start',
    marginVertical: 3,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
  },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#111',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  blockedComposer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  blockedComposerText: {
    color: '#999',
    fontSize: 14,
  },
  reportButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  reportText: {
    color: '#c00',
    fontWeight: '700',
    fontSize: 16,
  },
});
