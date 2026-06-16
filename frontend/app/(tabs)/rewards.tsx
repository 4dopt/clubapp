import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type Reward } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'range', label: 'Range' },
  { id: 'course', label: 'Course' },
  { id: 'proshop', label: 'Pro Shop' },
  { id: 'cafe', label: 'Cafe' },
  { id: 'lessons', label: 'Lessons' },
];

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [category, setCategory] = useState('all');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const list = await api.rewards(cat);
      setRewards(list);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(category); }, [category, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(category);
    setRefreshing(false);
  };

  const balance = user?.points_balance ?? 0;

  return (
    <View style={styles.root}>
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.eyebrow}>REWARDS CATALOG</Text>
            <Text style={styles.title}>Redeem</Text>
          </View>
          <View style={styles.balancePill} testID="rewards-balance-pill">
            <Ionicons name="ellipse" size={6} color={theme.color.brandPrimary} />
            <Text style={styles.balanceText}>{balance.toLocaleString()} pts</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRowContent}
          style={styles.chipRow}
        >
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <Pressable
                key={c.id}
                testID={`category-chip-${c.id}`}
                onPress={() => setCategory(c.id)}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.color.brandPrimary} />
        </View>
      ) : rewards.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="flag-outline" size={42} color={theme.color.onSurfaceTertiary} />
          <Text style={styles.emptyTitle}>No rewards available</Text>
          <Text style={styles.emptySub}>Check back soon for new offers.</Text>
        </View>
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(r) => r.id}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: insets.bottom + 120,
          }}
          columnWrapperStyle={{ gap: theme.spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.color.brandPrimary}
            />
          }
          renderItem={({ item }) => {
            const canAfford = balance >= item.points_cost;
            return (
              <Pressable
                testID={`reward-card-${item.id}`}
                style={styles.card}
                onPress={() => router.push(`/reward/${item.id}`)}
              >
                <Image source={{ uri: item.image_url }} style={styles.cardImg} contentFit="cover" />
                <View style={styles.cardScrim} />
                <View style={[styles.cardBadge, !canAfford && styles.cardBadgeMuted]}>
                  <Text style={[styles.cardBadgeText, !canAfford && styles.cardBadgeTextMuted]}>
                    {item.points_cost.toLocaleString()} pts
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardCategory}>
                    {item.category.toUpperCase()}
                  </Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
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
    borderBottomWidth: 0.5,
    borderBottomColor: theme.color.border,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow: { color: theme.color.onSurfaceTertiary, letterSpacing: 2, fontSize: 10 },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 32, marginTop: 2 },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    backgroundColor: theme.color.surfaceSecondary,
  },
  balanceText: { color: theme.color.brandPrimary, fontSize: 13, letterSpacing: 1 },

  chipRow: { marginTop: theme.spacing.md, height: 56 },
  chipRowContent: {
    paddingHorizontal: 0,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  chip: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: theme.color.brandPrimary,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  chipText: { color: theme.color.onSurfaceSecondary, fontSize: 12, letterSpacing: 1 },
  chipTextActive: { color: theme.color.brandPrimary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyTitle: { color: theme.color.onSurface, fontSize: 16, marginTop: 8 },
  emptySub: { color: theme.color.onSurfaceTertiary, fontSize: 13 },

  card: {
    flex: 1,
    aspectRatio: 0.78,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSecondary,
  },
  cardImg: { ...StyleSheet.absoluteFillObject },
  cardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,18,16,0.55)',
  },
  cardBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    backgroundColor: 'rgba(212,175,55,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  cardBadgeMuted: {
    backgroundColor: 'rgba(22,27,24,0.85)',
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
  },
  cardBadgeText: { color: theme.color.onBrandPrimary, fontSize: 11, fontWeight: '500' },
  cardBadgeTextMuted: { color: theme.color.onSurfaceSecondary },
  cardBody: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.md,
  },
  cardCategory: {
    color: theme.color.brandPrimary,
    letterSpacing: 2,
    fontSize: 9,
    marginBottom: 4,
  },
  cardTitle: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 18 },
});
