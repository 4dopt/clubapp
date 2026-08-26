import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type Reward, type User } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

const CATEGORIES = ['all', 'range', 'course', 'proshop', 'cafe', 'lessons'];

export default function RewardsCatalog() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [u, r] = await Promise.all([
        api.me(token).catch(() => null),
        api.rewards(token).catch(() => []),
      ]);
      if (u) setUser(u);
      setRewards(Array.isArray(r) ? r : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const safeRewards = Array.isArray(rewards) ? rewards : [];
  const filtered = category === 'all'
    ? safeRewards
    : safeRewards.filter((r) => r.category && r.category.toLowerCase() === category);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PERKS & REDEMPTION</Text>
          <Text style={styles.title}>Rewards</Text>
        </View>
        {user ? (
          <View style={styles.ptsBadge}>
            <Text style={styles.ptsVal}>{(user.points || 0).toLocaleString()}</Text>
            <Text style={styles.ptsLabel}>PTS</Text>
          </View>
        ) : null}
      </View>

      {/* Category Pills */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
        renderItem={({ item }) => {
          const active = category === item;
          return (
            <Pressable
              onPress={() => setCategory(item)}
              style={[styles.catPill, active && styles.catPillActive]}
            >
              <Text style={[styles.catPillText, active && styles.catPillTextActive]}>
                {item.toUpperCase()}
              </Text>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.color.brandPrimary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: insets.bottom + 100 },
          ]}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
              <View style={styles.cardBody}>
                <Text style={styles.cardCat}>{(item.category || 'Reward').toUpperCase()}</Text>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPts}>{(item.points_cost || 0).toLocaleString()} pts</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  eyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: theme.color.onSurface,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  ptsBadge: {
    backgroundColor: theme.color.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
  },
  ptsVal: {
    color: theme.color.brandPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  ptsLabel: {
    color: theme.color.brandPrimary,
    fontSize: 9,
    fontWeight: '700',
  },
  catList: {
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
    marginBottom: theme.spacing.md,
    maxHeight: 36,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border,
    borderWidth: 1,
  },
  catPillActive: {
    backgroundColor: theme.color.brandPrimary,
    borderColor: theme.color.brandPrimary,
  },
  catPillText: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  catPillTextActive: {
    color: theme.color.onBrandPrimary,
  },
  grid: {
    paddingHorizontal: theme.spacing.lg,
    gap: 14,
  },
  card: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderColor: theme.color.border,
    borderWidth: 1,
  },
  cardImage: {
    height: 140,
    width: '100%',
  },
  cardBody: {
    padding: 14,
  },
  cardCat: {
    color: theme.color.brandPrimary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardTitle: {
    color: theme.color.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cardPts: {
    color: theme.color.brandPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});
