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
        api.me(token),
        api.rewards(token),
        api.history(token),
      ]);
      setUser(u);
      setRewards(r);
      setHistory(h);
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

  const featuredRewards = rewards.slice(0, 3);
  const recentHistory = history.slice(0, 5);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + 120,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.brandPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>WELCOME BACK</Text>
            <Text style={styles.name}>{user.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              testID="qr-modal-trigger"
              style={styles.qrBtn}
              onPress={() => setQrOpen(true)}
            >
              <Ionicons name="qr-code-outline" size={20} color={theme.color.brandPrimary} />
            </Pressable>
            <Pressable testID="logout-button" style={styles.logoutBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color={theme.color.onSurfaceSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Digital Pass Card */}
        <View style={styles.cardWrap}>
          <MembershipCard user={user} onShowQr={() => setQrOpen(true)} />
        </View>

        {/* Action Grid */}
        <View style={styles.actionsGrid}>
          <Pressable style={styles.actionItem} onPress={() => router.push('/dashboard/rewards')}>
            <View style={[styles.actionIcon, { backgroundColor: '#EBF6F0' }]}>
              <Ionicons name="gift" size={22} color={theme.color.brandPrimary} />
            </View>
            <Text style={styles.actionLabel}>Rewards</Text>
          </Pressable>

          <Pressable style={styles.actionItem} onPress={() => router.push('/dashboard/booking')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FEF9E7' }]}>
              <Ionicons name="golf" size={22} color={theme.color.accent} />
            </View>
            <Text style={styles.actionLabel}>Book Bay</Text>
          </Pressable>

          <Pressable style={styles.actionItem} onPress={() => setQrOpen(true)}>
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="qr-code" size={22} color="#1E88E5" />
            </View>
            <Text style={styles.actionLabel}>Check In</Text>
          </Pressable>

          <Pressable style={styles.actionItem} onPress={() => router.push('/dashboard/profile')}>
            <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="card" size={22} color="#8E24AA" />
            </View>
            <Text style={styles.actionLabel}>My Card</Text>
          </Pressable>
        </View>

        {/* Featured Rewards Carousel */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Rewards</Text>
            <Pressable onPress={() => router.push('/dashboard/rewards')}>
              <Text style={styles.seeAll}>See All ({rewards.length})</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {featuredRewards.map((item) => (
              <Pressable
                key={item.id}
                testID={`reward-card-${item.id}`}
                style={({ pressed }) => [styles.rewardCard, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/reward/${item.id}`)}
              >
                <Image source={{ uri: item.image_url }} style={styles.rewardImage} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.rewardBadges}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>{item.category.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.rewardContent}>
                  <Text style={styles.rewardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rewardPts}>{item.points_cost.toLocaleString()} pts</Text>
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
                    <Text style={styles.histSub}>{item.category || (isEarn ? 'Check-in' : 'Reward')}</Text>
                  </View>
                  <Text
                    style={[
                      styles.histPts,
                      { color: isEarn ? theme.color.brandPrimary : theme.color.accent },
                    ]}
                  >
                    {isEarn ? '+' : '−'}{item.points} pts
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* QR Modal */}
      <QrModal visible={qrOpen} onClose={() => setQrOpen(false)} user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  welcome: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  name: {
    color: theme.color.onSurface,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 10 },
  qrBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.color.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  cardWrap: {
    paddingHorizontal: theme.spacing.xl,
  },

  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  actionItem: { alignItems: 'center', gap: 6 },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { color: theme.color.onSurface, fontSize: 12, fontWeight: '700' },

  section: { marginTop: theme.spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.color.onSurface,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAll: { color: theme.color.brandPrimary, fontSize: 13, fontWeight: '700' },

  hList: { paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md },
  rewardCard: {
    width: 220,
    height: 160,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
  },
  rewardImage: { ...StyleSheet.absoluteFillObject },
  rewardBadges: { flexDirection: 'row' },
  catBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  catText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  rewardContent: { gap: 2 },
  rewardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  rewardPts: { color: '#FCD34D', fontSize: 13, fontWeight: '700' },

  historyList: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  histIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histTitle: { color: theme.color.onSurface, fontSize: 14, fontWeight: '700' },
  histSub: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 2 },
  histPts: { fontSize: 14, fontWeight: '800' },
});
