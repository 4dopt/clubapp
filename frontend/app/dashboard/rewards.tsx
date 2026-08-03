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
      const [u, r] = await Promise.all([api.me(token), api.rewards(token)]);
      setUser(u);
      setRewards(r);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = category === 'all'
    ? rewards
    : rewards.filter((r) => r.category.toLowerCase() === category);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PERKS & REDEMPTION</Text>
          <Text style={styles.title}>Rewards</Text>
        </View>
        {user ? (
          <View style={styles.ptsBadge}>
            <Text style={styles.ptsVal}>{user.points.toLocaleString()}</Text>
            <Text style={styles.ptsLabel}>PTS</Text>
          </View>
        ) : null}
      </View>

      {/* Category Pills */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
        renderItem={({ item }) => (
          <Pressable
            testID={`cat-filter-${item}`}
            style={[styles.catChip, category === item && styles.catChipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.catText, category === item && styles.catTextActive]}>
              {item.toUpperCase()}
            </Text>
          </Pressable>
        )}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.color.brandPrimary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: insets.bottom + 120,
          }}
          numColumns={2}
          columnWrapperStyle={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}
          renderItem={({ item }) => {
            const canAfford = (user?.points ?? 0) >= item.points_cost;
            return (
              <Pressable
                testID={`reward-catalog-item-${item.id}`}
                style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/reward/${item.id}`)}
              >
                <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
                <View style={styles.cardBody}>
                  <Text style={styles.cardCat}>{item.category.toUpperCase()}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardCost, !canAfford && { color: theme.color.onSurfaceTertiary }]}>
                      {item.points_cost.toLocaleString()} pts
                    </Text>
                    {canAfford ? (
                      <View style={styles.affordBadge}>
                        <Text style={styles.affordText}>Redeem</Text>
                      </View>
                    ) : null}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  eyebrow: { color: theme.color.brandPrimary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: theme.color.onSurface, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  ptsBadge: {
    backgroundColor: theme.color.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
  },
  ptsVal: { color: theme.color.brandPrimary, fontWeight: '800', fontSize: 16 },
  ptsLabel: { color: theme.color.brandPrimary, fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  catList: { paddingHorizontal: theme.spacing.lg, gap: 8, paddingBottom: theme.spacing.md },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1, borderColor: theme.color.border,
  },
  catChipActive: { backgroundColor: theme.color.brandPrimary, borderColor: theme.color.brandPrimary },
  catText: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontWeight: '700' },
  catTextActive: { color: '#FFFFFF' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  gridCard: {
    flex: 1,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  cardImage: { width: '100%', height: 110, backgroundColor: theme.color.surfaceTertiary },
  cardBody: { padding: theme.spacing.md, gap: 4 },
  cardCat: { color: theme.color.brandPrimary, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  cardTitle: { color: theme.color.onSurface, fontSize: 14, fontWeight: '700', height: 38 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardCost: { color: theme.color.accent, fontSize: 13, fontWeight: '800' },
  affordBadge: {
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  affordText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
});
