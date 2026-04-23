import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CURRENT_USER } from '@/data/mock';

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.avatarLarge}>
        <ThemedText style={styles.avatarText}>{CURRENT_USER.avatar}</ThemedText>
      </View>
      <ThemedText type="title" style={styles.name}>{CURRENT_USER.displayName}</ThemedText>
      <View style={styles.badge}>
        <ThemedText style={styles.badgeText}>
          {CURRENT_USER.role.charAt(0).toUpperCase() + CURRENT_USER.role.slice(1)}
          {CURRENT_USER.isPremium ? ' · Premium' : ''}
        </ThemedText>
      </View>
      <View style={styles.infoSection}>
        <InfoRow label="User ID" value={CURRENT_USER.id} />
        <InfoRow label="Account Status" value="Active" />
        <InfoRow label="Member Since" value="March 2026" />
      </View>
    </ThemedView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 32,
  },
  badgeText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
