import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adminApi, type User } from '@/src/api';
import { useAdminAuth } from '@/src/admin-auth';
import { theme, tierMeta } from '@/src/theme';

export default function AdminMembers() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { adminToken } = useAdminAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query?: string) => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const list = await adminApi.listMembers(adminToken, query);
      setMembers(list);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminToken]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(q); }, [load, q]));

  useEffect(() => {
    const t = setTimeout(() => { load(q.trim() || undefined); }, 300);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text style={styles.eyebrow}>STAFF · MEMBERS</Text>
        <Text style={styles.title}>Members</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={theme.color.onSurfaceTertiary} />
          <TextInput
            testID="members-search"
            value={q}
            onChangeText={setQ}
            placeholder="Search name, phone, member ID"
            placeholderTextColor={theme.color.onSurfaceTertiary}
            style={styles.searchInput}
            autoCapitalize="none"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.color.onSurfaceTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.color.brandPrimary} /></View>
      ) : members.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={42} color={theme.color.onSurfaceTertiary} />
          <Text style={styles.emptyTitle}>No members found</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md,
            paddingBottom: insets.bottom + 120,
          }}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
          renderItem={({ item }) => {
            const meta = tierMeta[item.tier];
            return (
              <Pressable
                testID={`member-row-${item.id}`}
                style={styles.row}
                onPress={() => router.push(`/(admin)/member/${item.id}`)}
              >
                <View style={[styles.avatar, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                  <Text style={[styles.avatarText, { color: meta.color }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    {item.suspended ? (
                      <View style={styles.suspendedPill}>
                        <Text style={styles.suspendedText}>SUSPENDED</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.member_id} · {item.phone}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.balance}>{item.points_balance.toLocaleString()}</Text>
                  <View style={[styles.tierPill, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.tierText, { color: meta.color }]}>{item.tier}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.color.surface,
  },
  eyebrow: { color: theme.color.brandPrimary, letterSpacing: 1.5, fontSize: 10, fontWeight: '700' },
  title: { color: theme.color.onSurface, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  searchWrap: {
    marginTop: theme.spacing.md,
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.border,
  },
  searchInput: { flex: 1, color: theme.color.onSurface, fontSize: 14 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyTitle: { color: theme.color.onSurface, fontSize: 16, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1, borderColor: theme.color.border,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: theme.color.onSurface, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  meta: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  balance: { color: theme.color.onSurface, fontSize: 16, fontWeight: '800' },
  tierPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.pill },
  tierText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  suspendedPill: { backgroundColor: '#FBE8E8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  suspendedText: { color: theme.color.error, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
});
