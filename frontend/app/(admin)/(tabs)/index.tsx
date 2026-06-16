import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adminApi, type AdminStats } from '@/src/api';
import { useAdminAuth } from '@/src/admin-auth';
import { theme } from '@/src/theme';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { adminToken, signOut } = useAdminAuth();
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
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: theme.spacing.lg,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.brandPrimary} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>STAFF DASHBOARD</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <Pressable testID="admin-logout" onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color={theme.color.error} />
          </Pressable>
        </View>

        {loading || !stats ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={theme.color.brandPrimary} />
          </View>
        ) : (
          <>
            <View style={styles.kpiGrid}>
              <KPI icon="flash" label="POINTS ISSUED" value={stats.points_issued_today} accent />
              <KPI icon="people" label="VISITS LOGGED" value={stats.visits_today} />
              <KPI icon="gift" label="REDEMPTIONS" value={stats.redemptions_today} />
              <KPI icon="trophy" label="MEMBERS" value={stats.total_members} />
            </View>

            <Text style={styles.sectionLabel}>TIER BREAKDOWN</Text>
            <View style={styles.tierCard}>
              <TierBar label="Silver" count={stats.tiers.Silver} total={stats.total_members} color="#9AA3A0" />
              <TierBar label="Gold" count={stats.tiers.Gold} total={stats.total_members} color="#C49A3E" />
              <TierBar label="Platinum" count={stats.tiers.Platinum} total={stats.total_members} color="#1F2A24" />
            </View>

            <Text style={styles.sectionLabel}>7-DAY TOTALS</Text>
            <View style={styles.weekRow}>
              <View style={[styles.weekBox, { backgroundColor: theme.color.accentSoft }]}>
                <Text style={[styles.weekLabel, { color: theme.color.accent }]}>EARNED</Text>
                <Text style={[styles.weekVal, { color: theme.color.accent }]}>+{stats.week_earn_total.toLocaleString()}</Text>
              </View>
              <View style={[styles.weekBox, { backgroundColor: '#FCEFD2' }]}>
                <Text style={[styles.weekLabel, { color: '#B36F00' }]}>REDEEMED</Text>
                <Text style={[styles.weekVal, { color: '#B36F00' }]}>−{stats.week_redeem_total.toLocaleString()}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
            <View style={styles.activityCard}>
              {stats.recent.length === 0 ? (
                <Text style={styles.emptyText}>No activity yet</Text>
              ) : (
                stats.recent.slice(0, 8).map((t, i, arr) => {
                  const isEarn = t.type === 'earn';
                  return (
                    <View key={t.id} style={[activityStyles.row, i < arr.length - 1 && activityStyles.divider]}>
                      <View
                        style={[
                          activityStyles.iconWrap,
                          { backgroundColor: isEarn ? theme.color.accentSoft : '#FCEFD2' },
                        ]}
                      >
                        <Ionicons
                          name={isEarn ? 'arrow-up' : 'gift'}
                          size={14}
                          color={isEarn ? theme.color.accent : '#B36F00'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={activityStyles.name} numberOfLines={1}>
                          {t.member_name || 'Member'} · {t.member_id || ''}
                        </Text>
                        <Text style={activityStyles.title} numberOfLines={1}>{t.title}</Text>
                      </View>
                      <Text style={[activityStyles.pts, { color: isEarn ? theme.color.accent : theme.color.onSurfaceSecondary }]}>
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
    <View style={[styles.kpiCard, accent && { backgroundColor: theme.color.brandPrimary, borderColor: theme.color.brandPrimary }]}>
      <View style={[styles.kpiIcon, accent && { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
        <Ionicons name={icon} size={16} color={accent ? '#FFFFFF' : theme.color.brandPrimary} />
      </View>
      <Text style={[styles.kpiLabel, accent && { color: 'rgba(255,255,255,0.85)' }]}>{label}</Text>
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
  root: { flex: 1, backgroundColor: theme.color.surface },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: theme.color.brandPrimary, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  title: { color: theme.color.onSurface, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1, borderColor: '#F0C5C5',
    alignItems: 'center', justifyContent: 'center',
  },

  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: theme.spacing.md, marginTop: theme.spacing.lg,
  },
  kpiCard: {
    width: '47%', flexGrow: 1,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16, borderWidth: 1, borderColor: theme.color.border,
    paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.md,
  },
  kpiIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.color.brandTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  kpiLabel: { color: theme.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 1.5, fontWeight: '700', marginTop: theme.spacing.md },
  kpiValue: { color: theme.color.onSurface, fontSize: 28, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },

  sectionLabel: { color: theme.color.brandPrimary, letterSpacing: 1.5, fontSize: 10, fontWeight: '700', marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md },
  tierCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16, borderWidth: 1, borderColor: theme.color.border,
    padding: theme.spacing.lg, gap: theme.spacing.md,
  },

  weekRow: { flexDirection: 'row', gap: theme.spacing.md },
  weekBox: {
    flex: 1, padding: theme.spacing.lg, borderRadius: 16,
  },
  weekLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  weekVal: { fontSize: 22, fontWeight: '800', marginTop: 4 },

  activityCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16, borderWidth: 1, borderColor: theme.color.border,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyText: { color: theme.color.onSurfaceTertiary, fontSize: 13, paddingVertical: theme.spacing.lg, textAlign: 'center' },
});

const tierStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { color: theme.color.onSurface, fontSize: 13, fontWeight: '700', width: 70 },
  barWrap: { flex: 1, height: 6, backgroundColor: theme.color.surfaceTertiary, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%' },
  count: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontWeight: '700', width: 30, textAlign: 'right' },
});

const activityStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.color.onSurface, fontSize: 13, fontWeight: '700' },
  title: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  pts: { fontSize: 14, fontWeight: '800' },
});
