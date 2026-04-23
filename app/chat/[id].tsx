import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState, useRef, useEffect } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CURRENT_USER, type Message } from '@/data/mock';
import { useChatStore } from '@/context/chat-store';

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

function MessageBubble({ message }: { message: Message }) {
  const isMe = message.senderId === CURRENT_USER.id;

  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubblePeer]}>
        <ThemedText style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
          {message.content}
        </ThemedText>
        <View style={styles.bubbleMeta}>
          <ThemedText style={[styles.timeText, isMe && styles.timeTextMe]}>
            {formatMessageTime(message.createdAt)}
          </ThemedText>
          {isMe && (
            <ThemedText style={[styles.statusText, message.status === 'read' && styles.statusRead]}>
              {statusIcon(message.status)}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { conversations, getMessages, sendMessage, markAsRead } = useChatStore();

  const messages = getMessages(id);
  const conversation = conversations.find((c) => c.id === id);
  const peerName = conversation?.peer.displayName ?? 'Chat';

  useEffect(() => {
    markAsRead(id);
  }, [id, markAsRead]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    sendMessage(id, text);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, id, sendMessage]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>{'\u2190'}</ThemedText>
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerName}>{peerName}</ThemedText>
          {conversation && (
            <ThemedText style={styles.headerRole}>
              {conversation.peer.role.charAt(0).toUpperCase() + conversation.peer.role.slice(1)}
            </ThemedText>
          )}
        </View>
        <View style={styles.backButton} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.composer}>
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
});
