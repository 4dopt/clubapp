import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adminApi, type AdminStats } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token: adminToken, signOut } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!adminToken) return;
    try {
      const s = await adminApi.stats(adminToken);
      setStats(s);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const logout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: theme.spacing.lg,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E6C25F" />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>STAFF PORTAL</Text>
            <Text style={styles.title}>Overview</Text>
          </View>
          <Pressable testID="admin-logout" onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          </Pressable>
        </View>

        {loading || !stats ? (
          <View style={{ paddingVertical: 120, alignItems: 'center' }}>
            <ActivityIndicator color="#E6C25F" size="large" />
          </View>
        ) : (
          <>
            <View style={styles.kpiGrid}>
              <KPI icon="flash" label="POINTS ISSUED" value={stats.points_issued_today} accent />
              <KPI icon="people" label="VISITS LOGGED" value={stats.visits_today} />
              <KPI icon="gift" label="REDEMPTIONS" value={stats.redemptions_today} />
              <KPI icon="trophy" label="TOTAL MEMBERS" value={stats.total_members} />
            </View>

            <Text style={styles.sectionLabel}>TIER DEMOGRAPHICS</Text>
            <View style={styles.tierCard}>
              <TierBar label="Silver" count={stats.tiers.Silver} total={stats.total_members} color="#7B8E85" />
              <TierBar label="Gold" count={stats.tiers.Gold} total={stats.total_members} color="#E6C25F" />
              <TierBar label="Platinum" count={stats.tiers.Platinum} total={stats.total_members} color="#3C4B45" />
            </View>

            <Text style={styles.sectionLabel}>7-DAY SUMMARY</Text>
            <View style={styles.weekRow}>
              <View style={[styles.weekBox, { backgroundColor: 'rgba(56,189,248,0.06)', borderColor: 'rgba(56,189,248,0.15)' }]}>
                <Text style={[styles.weekLabel, { color: '#38BDF8' }]}>POINTS EARNED</Text>
                <Text style={[styles.weekVal, { color: '#38BDF8' }]}>+{stats.week_earn_total.toLocaleString()}</Text>
              </View>
              <View style={[styles.weekBox, { backgroundColor: 'rgba(230,194,95,0.06)', borderColor: 'rgba(230,194,95,0.15)' }]}>
                <Text style={[styles.weekLabel, { color: '#E6C25F' }]}>POINTS REDEEMED</Text>
                <Text style={[styles.weekVal, { color: '#E6C25F' }]}>−{stats.week_redeem_total.toLocaleString()}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>RECENT CLUB ACTIVITY</Text>
            <View style={styles.activityCard}>
              {stats.recent.length === 0 ? (
                <Text style={styles.emptyText}>No activity recorded today</Text>
              ) : (
                stats.recent.slice(0, 8).map((t, i, arr) => {
                  const isEarn = t.type === 'earn';
                  return (
                    <View key={t.id} style={[activityStyles.row, i < arr.length - 1 && activityStyles.divider]}>
                      <View
                        style={[
                          activityStyles.iconWrap,
                          { backgroundColor: isEarn ? 'rgba(56,189,248,0.08)' : 'rgba(230,194,95,0.08)' },
                        ]}
                      >
                        <Ionicons
                          name={isEarn ? 'arrow-up-outline' : 'gift-outline'}
                          size={14}
                          color={isEarn ? '#38BDF8' : '#E6C25F'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={activityStyles.name} numberOfLines={1}>
                          {t.member_name || 'Member'} · {t.member_id || ''}
                        </Text>
                        <Text style={activityStyles.title} numberOfLines={1}>{t.title}</Text>
                      </View>
                      <Text style={[activityStyles.pts, { color: isEarn ? '#38BDF8' : '#E6C25F' }]}>
                        {isEarn ? '+' : '−'}{t.points}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function KPI({ icon, label, value, accent }: { icon: any; label: string; value: number; accent?: boolean }) {
  return (
    <View style={[styles.kpiCard, accent && { backgroundColor: '#102A1E', borderColor: '#1F533D' }]}>
      <View style={[styles.kpiIcon, { backgroundColor: accent ? 'rgba(230,194,95,0.15)' : 'rgba(255,255,255,0.04)' }]}>
        <Ionicons name={icon} size={15} color={accent ? '#E6C25F' : '#7B8E85'} />
      </View>
      <Text style={[styles.kpiLabel, accent && { color: 'rgba(255,255,255,0.5)' }]}>{label}</Text>
      <Text style={[styles.kpiValue, accent && { color: '#FFFFFF' }]}>{value.toLocaleString()}</Text>
    </View>
  );
}

function TierBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? count / total : 0;
  return (
    <View style={tierStyles.row}>
      <View style={[tierStyles.dot, { backgroundColor: color }]} />
      <Text style={tierStyles.label}>{label}</Text>
      <View style={tierStyles.barWrap}>
        <View style={[tierStyles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={tierStyles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060B08' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#E6C25F', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  logoutBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1C1212',
    borderWidth: 1, borderColor: '#401A1A',
    alignItems: 'center', justifyContent: 'center',
  },

  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: theme.spacing.md, marginTop: theme.spacing.xl,
  },
  kpiCard: {
    width: '47%', flexGrow: 1,
    backgroundColor: '#0F1512',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: theme.spacing.xl, paddingHorizontal: theme.spacing.lg,
  },
  kpiIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  kpiLabel: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 9, letterSpacing: 1.5, fontWeight: '700', marginTop: theme.spacing.lg },
  kpiValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },

  sectionLabel: { color: '#7B8E85', letterSpacing: 1.8, fontSize: 10, fontWeight: '700', marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md },
  tierCard: {
    backgroundColor: '#0F1512',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: theme.spacing.xl, gap: theme.spacing.lg,
  },

  weekRow: { flexDirection: 'row', gap: theme.spacing.md },
  weekBox: {
    flex: 1, padding: theme.spacing.xl, borderRadius: 18, borderWidth: 1,
  },
  weekLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  weekVal: { fontSize: 20, fontWeight: '800', marginTop: 4 },

  activityCard: {
    backgroundColor: '#0F1512',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, paddingVertical: theme.spacing.xl, textAlign: 'center' },
});

const tierStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', width: 70 },
  barWrap: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  count: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', width: 30, textAlign: 'right' },
});

const activityStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  title: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  pts: { fontSize: 14, fontWeight: '800' },
});
