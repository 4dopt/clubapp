import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/src/auth';
import { api, type Reward } from '@/src/api';
import { theme, tierMeta } from '@/src/theme';
import { MembershipCard } from '@/src/components/MembershipCard';
import { QrModal } from '@/src/components/QrModal';

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, refresh } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [addingPoints, setAddingPoints] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.rewards();
      setRewards(list);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), load()]);
    setRefreshing(false);
  };

  const simulateVisit = async () => {
    if (!token || addingPoints) return;
    setAddingPoints(true);
    try {
      await api.addPoints(token, 150, 'Range visit');
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setToast('+150 points credited');
      setTimeout(() => setToast(null), 2200);
    } catch (e: any) {
      setToast(e.message || 'Failed to add points');
      setTimeout(() => setToast(null), 2200);
    } finally {
      setAddingPoints(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.color.brandPrimary} />
      </View>
    );
  }

  const meta = tierMeta[user.tier];
  const progressTotal = meta.next - meta.prev;
  const progressDone = Math.max(0, Math.min(progressTotal, user.lifetime_points - meta.prev));
  const pct = user.tier === 'Platinum' ? 1 : progressDone / progressTotal;
  const pointsToNext = user.tier === 'Platinum' ? 0 : meta.next - user.lifetime_points;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: theme.spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.brandPrimary}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.greetingName}>{user.name}</Text>
          </View>
          <Pressable
            testID="header-profile-btn"
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {(user.name || 'M').trim().charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {/* Membership card */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <MembershipCard user={user} onPressQR={() => setQrOpen(true)} />
        </View>

        {/* Points */}
        <View style={styles.pointsBlock}>
          <Text style={styles.eyebrow}>POINTS BALANCE</Text>
          <Text style={styles.pointsValue} testID="points-balance">
            {user.points_balance.toLocaleString()}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.progressMeta}>
            {user.tier === 'Platinum'
              ? 'Top tier — Platinum benefits unlocked'
              : `${pointsToNext.toLocaleString()} more points to ${user.tier === 'Silver' ? 'Gold' : 'Platinum'}`}
          </Text>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <Pressable
            testID="action-show-qr"
            style={styles.actionBtn}
            onPress={() => setQrOpen(true)}
          >
            <Ionicons name="qr-code-outline" size={20} color={theme.color.brandPrimary} />
            <Text style={styles.actionLabel}>Show QR</Text>
          </Pressable>
          <Pressable
            testID="action-simulate-visit"
            style={styles.actionBtn}
            onPress={simulateVisit}
            disabled={addingPoints}
          >
            {addingPoints ? (
              <ActivityIndicator color={theme.color.brandPrimary} />
            ) : (
              <Ionicons name="add-circle-outline" size={20} color={theme.color.brandPrimary} />
            )}
            <Text style={styles.actionLabel}>Log Visit</Text>
          </Pressable>
          <Pressable
            testID="action-view-rewards"
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/rewards')}
          >
            <Ionicons name="gift-outline" size={20} color={theme.color.brandPrimary} />
            <Text style={styles.actionLabel}>Rewards</Text>
          </Pressable>
        </View>

        {/* Featured rewards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Rewards</Text>
          <Pressable onPress={() => router.push('/(tabs)/rewards')} testID="see-all-rewards">
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={theme.color.brandPrimary} style={{ marginTop: 24 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.md, paddingRight: theme.spacing.lg }}
          >
            {rewards.slice(0, 6).map((r) => (
              <Pressable
                key={r.id}
                testID={`featured-reward-${r.id}`}
                style={styles.featuredCard}
                onPress={() => router.push(`/reward/${r.id}`)}
              >
                <Image source={{ uri: r.image_url }} style={styles.featuredImg} contentFit="cover" />
                <View style={styles.featuredOverlay} />
                <View style={styles.featuredBody}>
                  <Text style={styles.featuredTitle} numberOfLines={2}>{r.title}</Text>
                  <View style={styles.featuredCostRow}>
                    <Ionicons name="ellipse" size={6} color={theme.color.brandPrimary} />
                    <Text style={styles.featuredCost}>{r.points_cost.toLocaleString()} pts</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 100 }]} testID="toast">
          <Ionicons name="checkmark-circle" size={18} color={theme.color.brandPrimary} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      <QrModal
        visible={qrOpen}
        onClose={() => setQrOpen(false)}
        value={user.member_id}
        title="Member Pass"
        subtitle="Show this to club staff to earn points"
        footer="Staff will scan to credit points after your visit."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: theme.color.onSurfaceTertiary, fontSize: 12, letterSpacing: 1.5 },
  greetingName: {
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontSize: 26,
    marginTop: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, borderColor: theme.color.brandPrimary,
    backgroundColor: theme.color.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: theme.color.brandPrimary, fontSize: 16, fontWeight: '500' },

  pointsBlock: { marginTop: theme.spacing.xxl },
  eyebrow: {
    color: theme.color.onSurfaceTertiary,
    letterSpacing: 2,
    fontSize: 10,
  },
  pointsValue: {
    color: theme.color.brandPrimary,
    fontFamily: theme.font.display,
    fontSize: 64,
    marginTop: 6,
    fontWeight: '400',
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.color.surfaceTertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  progressFill: { height: '100%', backgroundColor: theme.color.brandPrimary },
  progressMeta: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 12,
    marginTop: theme.spacing.sm,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    color: theme.color.onSurface,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontSize: 22,
  },
  seeAll: {
    color: theme.color.brandPrimary,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  featuredCard: {
    width: 220,
    height: 280,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSecondary,
  },
  featuredImg: { ...StyleSheet.absoluteFillObject },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,18,16,0.55)',
  },
  featuredBody: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
  },
  featuredTitle: {
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontSize: 20,
  },
  featuredCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  featuredCost: {
    color: theme.color.brandPrimary,
    fontSize: 12,
    letterSpacing: 1.5,
  },

  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.color.surfaceTertiary,
    borderColor: theme.color.brandPrimary,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
  },
  toastText: { color: theme.color.onSurface, fontSize: 13 },
});
