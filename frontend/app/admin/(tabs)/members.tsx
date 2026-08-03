import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adminApi, type User } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme, tierMeta } from '@/src/theme';

export default function AdminMembers() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token: adminToken } = useAuth();
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

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => {
        load(q.trim() || undefined);
      }, q.trim() ? 300 : 0);
      return () => clearTimeout(t);
    }, [load, q])
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text style={styles.eyebrow}>STAFF · MEMBERS</Text>
        <Text style={styles.title}>Members</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#7B8E85" style={{ marginLeft: 12 }} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by name, email, or member ID..."
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          style={styles.searchInput}
          autoCapitalize="none"
          testID="member-search-input"
        />
        {q ? (
          <Pressable onPress={() => setQ('')} style={{ padding: 8 }}>
            <Ionicons name="close-circle" size={16} color="#7B8E85" />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#E6C25F" /></View>
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
                onPress={() => router.push(`/admin/member/${item.id}`)}
                style={styles.card}
                testID={`member-card-${item.id}`}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{item.email} · ID {item.member_id}</Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.tierPill, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
                    <Text style={[styles.tierText, { color: meta.badgeColor }]}>{item.tier}</Text>
                  </View>
                  <Text style={styles.pts}>{item.points.toLocaleString()} pts</Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#7B8E85" style={{ marginLeft: 4 }} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060B08' },
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  eyebrow: { color: '#E6C25F', letterSpacing: 1.5, fontSize: 10, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0F1512',
    marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1, color: '#FFFFFF', fontSize: 14, paddingVertical: 12, paddingHorizontal: 10,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    padding: theme.spacing.md, backgroundColor: '#0F1512',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#18241F',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#E6C25F', fontWeight: '800', fontSize: 16 },
  name: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sub: { color: '#7B8E85', fontSize: 12, marginTop: 2 },
  tierPill: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.pill, borderWidth: 1,
  },
  tierText: { fontSize: 10, fontWeight: '700' },
  pts: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
