import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { api, type Transaction } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

export default function History() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const list = await api.transactions(token);
      setTxns(list);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalEarned = txns.filter((t) => t.type === 'earn').reduce((s, t) => s + t.points, 0);
  const totalRedeemed = txns.filter((t) => t.type === 'redeem').reduce((s, t) => s + Math.abs(t.points), 0);

  return (
    <View style={styles.root}>
      {/* Header with Back Button */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Pressable
          testID="history-back-button"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={20} color={theme.color.onSurface} />
          <Text style={styles.backText}>Profile</Text>
        </Pressable>
        
        <Text style={styles.eyebrow}>ACTIVITY</Text>
        <Text style={styles.title}>History</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: theme.color.accentSoft }]}>
              <Ionicons name="arrow-up" size={14} color={theme.color.accent} />
            </View>
            <View>
              <Text style={styles.statLabel}>EARNED</Text>
              <Text style={styles.statVal}>{totalEarned.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FCEFD2' }]}>
              <Ionicons name="gift" size={14} color="#B36F00" />
            </View>
            <View>
              <Text style={styles.statLabel}>REDEEMED</Text>
              <Text style={styles.statVal}>{totalRedeemed.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.color.brandPrimary} />
        </View>
      ) : txns.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={42} color={theme.color.onSurfaceTertiary} />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySub}>
            Visit PlayGolf or redeem a reward to see it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={txns}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: insets.bottom + 40,
          }}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.color.brandPrimary}
            />
          }
          renderItem={({ item }) => {
            const isEarn = item.type === 'earn';
            return (
              <View style={styles.row} testID={`txn-row-${item.id}`}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isEarn ? theme.color.accentSoft : '#FCEFD2' },
                  ]}
                >
                  <Ionicons
                    name={isEarn ? 'arrow-up' : 'gift'}
                    size={18}
                    color={isEarn ? theme.color.accent : '#B36F00'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rowSub}>
                    {formatDate(item.created_at)}
                    {item.redemption_code ? ` · ${item.redemption_code}` : ''}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.amount,
                    { color: isEarn ? theme.color.accent : theme.color.onSurfaceSecondary },
                  ]}
                >
                  {isEarn ? '+' : '−'}{Math.abs(item.points).toLocaleString()}
                </Text>
              </View>
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
    paddingBottom: theme.spacing.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  backText: {
    color: theme.color.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
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

  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: theme.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  statVal: { color: theme.color.onSurface, fontSize: 18, fontWeight: '800', marginTop: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32 },
  emptyTitle: { color: theme.color.onSurface, fontSize: 16, marginTop: 8, fontWeight: '700' },
  emptySub: { color: theme.color.onSurfaceTertiary, fontSize: 13, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: theme.color.onSurface, fontSize: 14, fontWeight: '700' },
  rowSub: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800' },
});
