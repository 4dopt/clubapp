import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { api, type Transaction } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch { return iso; }
}

export default function History() {
  const insets = useSafeAreaInsets();
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
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text style={styles.eyebrow}>ACTIVITY</Text>
        <Text style={styles.title}>Points History</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.color.brandPrimary} />
        </View>
      ) : txns.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={42} color={theme.color.onSurfaceTertiary} />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptySub}>
            Visit PlayGolf or redeem a reward to see activity here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={txns}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: insets.bottom + 120,
          }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
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
                    { backgroundColor: isEarn ? theme.color.brandTertiary : theme.color.surfaceTertiary },
                  ]}
                >
                  <Ionicons
                    name={isEarn ? 'arrow-up-circle-outline' : 'gift-outline'}
                    size={20}
                    color={isEarn ? theme.color.brandPrimary : theme.color.onSurfaceSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rowSub}>
                    {formatDate(item.created_at)}
                    {item.redemption_code ? ` · Code ${item.redemption_code}` : ''}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.amount,
                    { color: isEarn ? theme.color.brandPrimary : theme.color.onSurfaceSecondary },
                  ]}
                >
                  {isEarn ? '+' : '−'}{item.points.toLocaleString()}
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
    borderBottomWidth: 0.5,
    borderBottomColor: theme.color.border,
  },
  eyebrow: { color: theme.color.onSurfaceTertiary, letterSpacing: 2, fontSize: 10 },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 32, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32 },
  emptyTitle: { color: theme.color.onSurface, fontSize: 16, marginTop: 8 },
  emptySub: { color: theme.color.onSurfaceTertiary, fontSize: 13, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { color: theme.color.onSurface, fontSize: 15 },
  rowSub: { color: theme.color.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  amount: { fontSize: 16, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: theme.color.divider },
});
