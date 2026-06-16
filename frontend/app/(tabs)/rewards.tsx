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
  { id: 'all', label: 'All', icon: 'apps' as const },
  { id: 'range', label: 'Range', icon: 'golf' as const },
  { id: 'course', label: 'Course', icon: 'flag' as const },
  { id: 'proshop', label: 'Pro Shop', icon: 'bag-handle' as const },
  { id: 'cafe', label: 'Cafe', icon: 'cafe' as const },
  { id: 'lessons', label: 'Lessons', icon: 'school' as const },
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
            <Ionicons name="flash" size={12} color={theme.color.brandPrimary} />
            <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
            <Text style={styles.balanceUnit}>pts</Text>
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
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons
                  name={c.icon}
                  size={13}
                  color={active ? '#FFFFFF' : theme.color.onSurfaceSecondary}
                />
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
                <View style={styles.cardImgWrap}>
                  <Image source={{ uri: item.image_url }} style={styles.cardImg} contentFit="cover" />
                  <View style={[styles.cardBadge, !canAfford && styles.cardBadgeMuted]}>
                    <Ionicons
                      name="flash"
                      size={10}
                      color={canAfford ? theme.color.brandPrimary : theme.color.onSurfaceTertiary}
                    />
                    <Text style={[styles.cardBadgeText, !canAfford && styles.cardBadgeTextMuted]}>
                      {item.points_cost.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardCategory}>{item.category.toUpperCase()}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.cardFooter}>
                    <View
                      style={[
                        styles.cardStatus,
                        { backgroundColor: canAfford ? theme.color.accentSoft : theme.color.surfaceTertiary },
                      ]}
                    >
                      <View
                        style={[
                          styles.cardStatusDot,
                          { backgroundColor: canAfford ? theme.color.accent : theme.color.onSurfaceTertiary },
                        ]}
                      />
                      <Text
                        style={[
                          styles.cardStatusText,
                          { color: canAfford ? theme.color.accent : theme.color.onSurfaceTertiary },
                        ]}
                      >
                        {canAfford ? 'Available' : 'Locked'}
                      </Text>
                    </View>
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
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow: {
    color: theme.color.brandPrimary,
    letterSpacing: 1.5,
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    color: theme.color.onSurface,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 2,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandTertiary,
  },
  balanceText: { color: theme.color.brandPrimary, fontSize: 14, fontWeight: '800' },
  balanceUnit: { color: theme.color.brandPrimary, fontSize: 11, fontWeight: '600' },

  chipRow: { marginTop: theme.spacing.md, height: 56 },
  chipRowContent: { paddingHorizontal: 0, gap: theme.spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    flexShrink: 0,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSecondary,
  },
  chipActive: {
    borderColor: theme.color.brandPrimary,
    backgroundColor: theme.color.brandPrimary,
  },
  chipText: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyTitle: { color: theme.color.onSurface, fontSize: 16, marginTop: 8, fontWeight: '700' },
  emptySub: { color: theme.color.onSurfaceTertiary, fontSize: 13 },

  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSecondary,
  },
  cardImgWrap: { width: '100%', aspectRatio: 1.05 },
  cardImg: { ...StyleSheet.absoluteFillObject },
  cardBadge: {
    position: 'absolute',
    top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  cardBadgeMuted: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  cardBadgeText: { color: theme.color.brandPrimary, fontSize: 11, fontWeight: '800' },
  cardBadgeTextMuted: { color: theme.color.onSurfaceTertiary },
  cardBody: { padding: theme.spacing.md },
  cardCategory: {
    color: theme.color.brandPrimary,
    letterSpacing: 1.5,
    fontSize: 9,
    fontWeight: '700',
  },
  cardTitle: {
    color: theme.color.onSurface,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 19,
    minHeight: 38,
  },
  cardFooter: { marginTop: theme.spacing.sm, flexDirection: 'row' },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  cardStatusDot: { width: 5, height: 5, borderRadius: 2.5 },
  cardStatusText: { fontSize: 10, fontWeight: '700' },
});
