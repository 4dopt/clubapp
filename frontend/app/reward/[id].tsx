import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { api, type Reward } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';
import { QrModal } from '@/src/components/QrModal';

export default function RewardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, refresh } = useAuth();

  const [reward, setReward] = useState<Reward | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const r = await api.reward(String(id));
        setReward(r);
      } catch (e: any) { setError(e.message || 'Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const onRedeem = async () => {
    if (!token || !reward) return;
    setError(null);
    setRedeeming(true);
    try {
      const r = await api.redeem(token, reward.id);
      setCode(r.redemption_code);
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || 'Could not redeem');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setRedeeming(false); }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.color.brandPrimary} />
      </View>
    );
  }

  if (!reward) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>{error || 'Reward not found'}</Text>
      </View>
    );
  }

  const balance = user?.points_balance ?? 0;
  const canAfford = balance >= reward.points_cost;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: reward.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={['rgba(15,27,22,0.25)', 'rgba(15,27,22,0)', 'rgba(244,241,234,1)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            testID="reward-back-button"
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + 12 }]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.color.onSurface} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.category}>{reward.category.toUpperCase()}</Text>
              <Text style={styles.title} testID="reward-title">{reward.title}</Text>
            </View>
            <View style={styles.costPill}>
              <Ionicons name="flash" size={12} color={theme.color.onBrandPrimary} />
              <Text style={styles.costText}>{reward.points_cost.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.balanceRow}>
            <Ionicons name="wallet-outline" size={14} color={theme.color.onSurfaceSecondary} />
            <Text style={styles.balanceHint}>Your balance: <Text style={styles.balanceVal}>{balance.toLocaleString()} pts</Text></Text>
          </View>

          <Text style={styles.sectionLabel}>ABOUT</Text>
          <Text style={styles.description}>{reward.description}</Text>

          <Text style={styles.sectionLabel}>HOW TO REDEEM</Text>
          <View style={styles.stepsCard}>
            <Step n={1} text="Tap Redeem below — points are deducted instantly." />
            <Step n={2} text="A unique code & QR is generated for staff to scan." />
            <Step n={3} text="Present it at the counter to claim your reward." last />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          testID="redeem-button"
          disabled={!canAfford || redeeming}
          onPress={onRedeem}
          style={({ pressed }) => [
            styles.redeemBtn,
            !canAfford && styles.redeemBtnDisabled,
            pressed && canAfford && { opacity: 0.9 },
          ]}
        >
          {redeeming ? (
            <ActivityIndicator color={theme.color.onBrandPrimary} />
          ) : (
            <>
              <Text style={[styles.redeemText, !canAfford && styles.redeemTextDisabled]}>
                {canAfford
                  ? `Redeem · ${reward.points_cost.toLocaleString()} pts`
                  : `Need ${(reward.points_cost - balance).toLocaleString()} more pts`}
              </Text>
              {canAfford ? (
                <Ionicons name="arrow-forward" size={16} color={theme.color.onBrandPrimary} />
              ) : null}
            </>
          )}
        </Pressable>
      </View>

      <QrModal
        visible={!!code}
        onClose={() => { setCode(null); router.back(); }}
        value={code || ''}
        title="Reward Unlocked"
        subtitle={reward.title}
        footer="Present this QR to staff to claim your reward. Code is single-use."
      />
    </View>
  );
}

function Step({ n, text, last }: { n: number; text: string; last?: boolean }) {
  return (
    <View style={[stepStyles.row, !last && stepStyles.divider]}>
      <View style={stepStyles.num}><Text style={stepStyles.numText}>{n}</Text></View>
      <Text style={stepStyles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  heroWrap: { height: 280, width: '100%', backgroundColor: theme.color.surfaceTertiary },
  backBtn: {
    position: 'absolute', left: theme.spacing.lg,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  body: { padding: theme.spacing.xl, marginTop: -20 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  category: { color: theme.color.brandPrimary, letterSpacing: 1.5, fontSize: 11, fontWeight: '700' },
  title: { color: theme.color.onSurface, fontSize: 26, fontWeight: '800', marginTop: 4, letterSpacing: -0.6, lineHeight: 32 },
  costPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    marginTop: 4,
  },
  costText: { color: theme.color.onBrandPrimary, fontSize: 13, fontWeight: '800' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.md },
  balanceHint: { color: theme.color.onSurfaceSecondary, fontSize: 13 },
  balanceVal: { color: theme.color.onSurface, fontWeight: '700' },

  sectionLabel: {
    color: theme.color.brandPrimary, letterSpacing: 1.5, fontSize: 10, fontWeight: '700',
    marginTop: theme.spacing.xl, marginBottom: theme.spacing.md,
  },
  description: { color: theme.color.onSurfaceSecondary, fontSize: 14, lineHeight: 22 },
  stepsCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border, borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    marginTop: theme.spacing.lg,
    color: theme.color.error,
    backgroundColor: '#FBE8E8',
    borderColor: '#F0C5C5',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.color.surface,
    borderTopWidth: 0.5,
    borderTopColor: theme.color.border,
  },
  redeemBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  redeemBtnDisabled: { backgroundColor: theme.color.surfaceTertiary, shadowOpacity: 0 },
  redeemText: { color: theme.color.onBrandPrimary, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  redeemTextDisabled: { color: theme.color.onSurfaceTertiary },
});

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md },
  divider: { borderBottomColor: theme.color.divider, borderBottomWidth: 1 },
  num: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: theme.color.brandPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: theme.color.onBrandPrimary, fontSize: 12, fontWeight: '800' },
  text: { flex: 1, color: theme.color.onSurfaceSecondary, fontSize: 13, lineHeight: 20 },
});
