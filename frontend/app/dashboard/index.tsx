import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MembershipCard } from '@/src/components/MembershipCard';
import { QrModal } from '@/src/components/QrModal';
import { api, type User, type Reward, type Transaction } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

export default function DashboardIndex() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, signOut } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [u, r, h] = await Promise.all([
        api.me(token).catch(() => null),
        api.rewards(token).catch(() => []),
        api.history(token).catch(() => []),
      ]);
      if (u) setUser(u);
      setRewards(Array.isArray(r) ? r : []);
      setHistory(Array.isArray(h) ? h : []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const logout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (loading || !user) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.color.brandPrimary} size="large" />
      </View>
    );
  }

  const safeRewards = Array.isArray(rewards) ? rewards : [];
  const safeHistory = Array.isArray(history) ? history : [];
  const featuredRewards = safeRewards.slice(0, 3);
  const recentHistory = safeHistory.slice(0, 5);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + 120,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.brandPrimary} />}
      >
        {/* Header bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeEyebrow}>WELCOME BACK</Text>
            <Text style={styles.userName}>{user.name}</Text>
          </View>
          <Pressable testID="member-logout" onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={theme.color.onSurfaceSecondary} />
          </Pressable>
        </View>

        {/* Member Digital Pass Card */}
        <View style={styles.cardWrap}>
          <MembershipCard user={user} onPressQr={() => setQrOpen(true)} />
        </View>

        {/* Quick Action Pills */}
        <View style={styles.actionsRow}>
          <Pressable
            testID="dashboard-action-book"
            style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.9 }]}
            onPress={() => router.push('/dashboard/booking')}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="calendar-outline" size={20} color="#0284C7" />
            </View>
            <Text style={styles.actionTitle}>Book Bay</Text>
            <Text style={styles.actionSub}>TrackMan Simulator</Text>
          </Pressable>

          <Pressable
            testID="dashboard-action-rewards"
            style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.9 }]}
            onPress={() => router.push('/dashboard/rewards')}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="gift-outline" size={20} color="#D97706" />
            </View>
            <Text style={styles.actionTitle}>Perks Catalog</Text>
            <Text style={styles.actionSub}>{safeRewards.length} Rewards</Text>
          </Pressable>

          <Pressable
            testID="dashboard-action-card"
            style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.9 }]}
            onPress={() => setQrOpen(true)}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: theme.color.brandSoft }]}>
              <Ionicons name="qr-code-outline" size={20} color={theme.color.brandPrimary} />
            </View>
            <Text style={styles.actionTitle}>Pass QR</Text>
            <Text style={styles.actionSub}>Check-in Code</Text>
          </Pressable>
        </View>

        {/* Featured Rewards Carousel */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Rewards</Text>
            <Pressable onPress={() => router.push('/dashboard/rewards')}>
              <Text style={styles.seeAll}>See All ({safeRewards.length})</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {featuredRewards.map((item) => (
              <Pressable
                key={item.id}
                testID={`reward-card-${item.id}`}
                style={({ pressed }) => [styles.rewardCard, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/dashboard/rewards`)}
              >
                <Image source={{ uri: item.image_url }} style={styles.rewardImage} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.rewardBadges}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>{(item.category || 'Reward').toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.rewardContent}>
                  <Text style={styles.rewardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rewardPts}>{(item.points_cost || 0).toLocaleString()} pts</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recent Activity */}
        <View style={[styles.section, { marginTop: theme.spacing.xl }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          <View style={styles.historyList}>
            {recentHistory.map((item) => {
              const isEarn = item.type === 'earn';
              return (
                <View key={item.id} style={styles.historyItem}>
                  <View
                    style={[
                      styles.histIconWrap,
                      { backgroundColor: isEarn ? theme.color.accentSoft : '#FEF3C7' },
                    ]}
                  >
                    <Ionicons
                      name={isEarn ? 'arrow-up' : 'gift-outline'}
                      size={18}
                      color={isEarn ? theme.color.brandPrimary : theme.color.accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histTitle}>{item.title}</Text>
                    <Text style={styles.histDate}>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.histPts,
                      { color: isEarn ? theme.color.brandPrimary : theme.color.accent },
                    ]}
                  >
                    {isEarn ? '+' : '-'}{item.points} pts
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <QrModal visible={qrOpen} onClose={() => setQrOpen(false)} user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  welcomeEyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  userName: {
    color: theme.color.onSurface,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSecondary,
  },
  cardWrap: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 12,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    color: theme.color.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  actionSub: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  section: {
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.color.onSurface,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAll: {
    color: theme.color.brandPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  hList: {
    paddingHorizontal: theme.spacing.lg,
    gap: 12,
  },
  rewardCard: {
    width: 220,
    height: 140,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 12,
  },
  rewardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  rewardBadges: {
    flexDirection: 'row',
  },
  catBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  catText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rewardContent: {},
  rewardTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rewardPts: {
    color: theme.color.brandPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  historyList: {
    paddingHorizontal: theme.spacing.lg,
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.color.surfaceSecondary,
    padding: 12,
    borderRadius: theme.radius.md,
    borderColor: theme.color.border,
    borderWidth: 1,
  },
  histIconWrap: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histTitle: {
    color: theme.color.onSurface,
    fontSize: 13,
    fontWeight: '600',
  },
  histDate: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  histPts: {
    fontSize: 13,
    fontWeight: '700',
  },
});
