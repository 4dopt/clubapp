import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adminApi, type User, type Transaction } from '@/src/api';
import { useAdminAuth } from '@/src/admin-auth';
import { theme, tierMeta } from '@/src/theme';

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { adminToken } = useAdminAuth();

  const [user, setUser] = useState<User | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustOp, setAdjustOp] = useState<'add' | 'subtract' | 'set'>('add');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!adminToken || !id) return;
    try {
      const r = await adminApi.getMember(adminToken, String(id));
      setUser(r.user);
      setTxns(r.transactions);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminToken, id]);

  useEffect(() => { load(); }, [load]);

  const updateTier = async (tier: 'Silver' | 'Gold' | 'Platinum') => {
    if (!adminToken || !user) return;
    try {
      const u = await adminApi.updateMember(adminToken, user.id, { tier });
      setUser(u);
      await load();
    } catch (e: any) { setErr(e.message || 'Update failed'); }
  };

  const toggleSuspend = async () => {
    if (!adminToken || !user) return;
    try {
      const u = await adminApi.updateMember(adminToken, user.id, { suspended: !user.suspended });
      setUser(u);
    } catch (e: any) { setErr(e.message || 'Update failed'); }
  };

  const submitAdjust = async () => {
    if (!adminToken || !user) return;
    const n = parseInt(adjustAmount.replace(/\D/g, ''), 10);
    if (!n || n <= 0) { setErr('Enter a valid amount'); return; }
    setSubmitting(true); setErr(null);
    try {
      let newBalance = user.points_balance;
      if (adjustOp === 'add') newBalance = user.points_balance + n;
      else if (adjustOp === 'subtract') newBalance = Math.max(0, user.points_balance - n);
      else newBalance = n;
      const u = await adminApi.updateMember(adminToken, user.id, { points_balance: newBalance });
      setUser(u);
      setShowAdjust(false);
      setAdjustAmount('');
      await load();
    } catch (e: any) {
      setErr(e.message || 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.color.brandPrimary} />
      </View>
    );
  }

  const meta = tierMeta[user.tier];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom + 80 }}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} testID="back-btn" style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={theme.color.onSurface} />
            <Text style={styles.backText}>Members</Text>
          </Pressable>
        </View>

        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: meta.bg, borderColor: meta.color }]}>
            <Text style={[styles.avatarText, { color: meta.color }]}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.phone}>{user.email || user.phone || 'No email'}</Text>
          <Text style={styles.memberId}>{user.member_id}</Text>
          {user.suspended ? (
            <View style={styles.suspendedTag}>
              <Ionicons name="ban" size={11} color={theme.color.error} />
              <Text style={styles.suspendedText}>SUSPENDED</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.points_balance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>BALANCE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.lifetime_points.toLocaleString()}</Text>
            <Text style={styles.statLabel}>LIFETIME</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: meta.color }]}>{user.tier}</Text>
            <Text style={styles.statLabel}>TIER</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <Pressable
            testID="adjust-points"
            onPress={() => { setShowAdjust(true); setAdjustOp('add'); }}
            style={styles.actionBtn}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.color.brandPrimary} />
            <Text style={styles.actionText}>Adjust points</Text>
          </Pressable>
          <Pressable
            testID="toggle-suspend"
            onPress={toggleSuspend}
            style={[styles.actionBtn, user.suspended && styles.actionDanger]}
          >
            <Ionicons name={user.suspended ? 'checkmark-circle-outline' : 'ban-outline'} size={18} color={user.suspended ? theme.color.accent : theme.color.error} />
            <Text style={[styles.actionText, { color: user.suspended ? theme.color.accent : theme.color.error }]}>
              {user.suspended ? 'Reactivate' : 'Suspend'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>OVERRIDE TIER</Text>
        <View style={styles.tierRow}>
          {(['Silver', 'Gold', 'Platinum'] as const).map((t) => {
            const tm = tierMeta[t];
            const active = user.tier === t;
            return (
              <Pressable
                key={t}
                testID={`set-tier-${t}`}
                onPress={() => updateTier(t)}
                style={[styles.tierChip, active && { backgroundColor: tm.bg, borderColor: tm.color }]}
              >
                <Ionicons name="trophy" size={11} color={active ? tm.color : theme.color.onSurfaceTertiary} />
                <Text style={[styles.tierChipText, active && { color: tm.color }]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>RECENT TRANSACTIONS</Text>
        <View style={styles.txnCard}>
          {txns.length === 0 ? (
            <Text style={styles.empty}>No activity yet</Text>
          ) : (
            txns.slice(0, 15).map((t, i, arr) => (
              <View key={t.id} style={[txnStyles.row, i < arr.length - 1 && txnStyles.divider]}>
                <View
                  style={[
                    txnStyles.iconWrap,
                    { backgroundColor: t.type === 'earn' ? theme.color.accentSoft : t.type === 'redeem' ? '#FCEFD2' : theme.color.surfaceTertiary },
                  ]}
                >
                  <Ionicons
                    name={t.type === 'earn' ? 'arrow-up' : t.type === 'redeem' ? 'gift' : 'sync'}
                    size={14}
                    color={t.type === 'earn' ? theme.color.accent : t.type === 'redeem' ? '#B36F00' : theme.color.onSurfaceSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={txnStyles.title} numberOfLines={1}>
                    {t.title}{t.by_admin ? ' · STAFF' : ''}{t.used ? ' · USED' : ''}
                  </Text>
                  <Text style={txnStyles.date}>{formatDate(t.created_at)}</Text>
                </View>
                <Text style={[txnStyles.amount, { color: t.type === 'earn' ? theme.color.accent : theme.color.onSurfaceSecondary }]}>
                  {t.type === 'earn' ? '+' : t.type === 'redeem' ? '−' : t.points >= 0 ? '+' : '−'}{Math.abs(t.points).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>

        {err ? <Text style={styles.errBanner}>{err}</Text> : null}
      </ScrollView>

      <Modal visible={showAdjust} transparent animationType="slide" onRequestClose={() => setShowAdjust(false)} statusBarTranslucent>
        <Pressable style={ms.backdrop} onPress={() => setShowAdjust(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={ms.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={ms.handle} />
              <Text style={ms.title}>Adjust points</Text>
              <Text style={ms.sub}>Current balance: {user.points_balance.toLocaleString()}</Text>

              <View style={ms.opRow}>
                {(['add', 'subtract', 'set'] as const).map((op) => (
                  <Pressable
                    key={op}
                    onPress={() => setAdjustOp(op)}
                    style={[ms.op, adjustOp === op && ms.opActive]}
                    testID={`op-${op}`}
                  >
                    <Text style={[ms.opText, adjustOp === op && ms.opTextActive]}>
                      {op === 'add' ? 'Add' : op === 'subtract' ? 'Subtract' : 'Set to'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                testID="adjust-amount"
                value={adjustAmount}
                onChangeText={(v) => setAdjustAmount(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.color.onSurfaceTertiary}
                style={ms.input}
                autoFocus
              />

              {err ? <Text style={ms.error}>{err}</Text> : null}

              <View style={ms.actionsRow}>
                <Pressable onPress={() => setShowAdjust(false)} style={[ms.btn, ms.btnGhost]}>
                  <Text style={ms.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submitAdjust} disabled={submitting} style={[ms.btn, ms.btnPrimary]} testID="adjust-submit">
                  {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={ms.btnPrimaryText}>Confirm</Text>}
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  topBar: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2 },
  backText: { color: theme.color.onSurface, fontSize: 14, fontWeight: '600' },

  identity: { alignItems: 'center', paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md },
  avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '800' },
  name: { color: theme.color.onSurface, fontSize: 22, fontWeight: '800', marginTop: theme.spacing.md, letterSpacing: -0.4 },
  phone: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 2 },
  memberId: { color: theme.color.brandPrimary, fontSize: 13, marginTop: 4, fontWeight: '700', letterSpacing: 1.5 },
  suspendedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: theme.spacing.md, backgroundColor: '#FBE8E8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill },
  suspendedText: { color: theme.color.error, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border, borderWidth: 1, borderRadius: 16,
    paddingVertical: theme.spacing.lg,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: theme.color.onSurface, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { color: theme.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 1.5, fontWeight: '700', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: theme.color.divider, marginVertical: 4 },

  actionsGrid: { flexDirection: 'row', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.color.surfaceSecondary, borderColor: theme.color.border, borderWidth: 1,
    borderRadius: theme.radius.pill, paddingVertical: 12,
  },
  actionDanger: { borderColor: '#FBE8E8' },
  actionText: { color: theme.color.brandPrimary, fontSize: 13, fontWeight: '700' },

  sectionLabel: {
    color: theme.color.brandPrimary, letterSpacing: 1.5, fontSize: 10, fontWeight: '700',
    marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  tierRow: { flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.lg, flexWrap: 'wrap' },
  tierChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSecondary,
  },
  tierChipText: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontWeight: '700' },

  txnCard: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16, borderWidth: 1, borderColor: theme.color.border,
    paddingHorizontal: theme.spacing.lg,
  },
  empty: { padding: theme.spacing.lg, textAlign: 'center', color: theme.color.onSurfaceTertiary, fontSize: 13 },

  errBanner: {
    margin: theme.spacing.lg,
    color: theme.color.error, backgroundColor: '#FBE8E8', borderColor: '#F0C5C5', borderWidth: 1,
    borderRadius: theme.radius.md, padding: 10, fontSize: 13, textAlign: 'center',
  },
});

const txnStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.color.onSurface, fontSize: 13, fontWeight: '700' },
  date: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800' },
});

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,22,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.color.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: theme.spacing.xl },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: theme.color.borderStrong, alignSelf: 'center', marginBottom: theme.spacing.md },
  title: { color: theme.color.onSurface, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 4 },
  opRow: { flexDirection: 'row', gap: 8, marginTop: theme.spacing.lg },
  op: {
    flex: 1, paddingVertical: 10, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSecondary, alignItems: 'center',
  },
  opActive: { backgroundColor: theme.color.brandPrimary, borderColor: theme.color.brandPrimary },
  opText: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontWeight: '700' },
  opTextActive: { color: '#FFFFFF' },
  input: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.md,
    fontSize: 28, fontWeight: '800', textAlign: 'center',
    color: theme.color.onSurface, paddingVertical: 14,
  },
  error: { marginTop: 10, color: theme.color.error, backgroundColor: '#FBE8E8', borderWidth: 1, borderColor: '#F0C5C5', borderRadius: theme.radius.md, padding: 10, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  btn: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  btnGhostText: { color: theme.color.onSurface, fontWeight: '700', fontSize: 14 },
  btnPrimary: { backgroundColor: theme.color.brandPrimary },
  btnPrimaryText: { color: theme.color.onBrandPrimary, fontWeight: '800', fontSize: 14 },
});
