import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { api, type Reward, type User } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

export default function RewardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [reward, setReward] = useState<Reward | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<{ discount_code?: string; qr_code_token?: string; redemption_id?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([api.me(token), api.rewards(token)])
      .then(([u, list]) => {
        setUser(u);
        const found = list.find((r) => r.id === id);
        setReward(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, id]);

  const redeem = async () => {
    if (!token || !reward || !user) return;
    setRedeeming(true);
    setError(null);
    try {
      const res = await api.redeemReward(token, reward.id);
      setResult(res);
      const updated = await api.me(token);
      setUser(updated);
    } catch (e: any) {
      setError(e.message || 'Redemption failed');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading || !reward || !user) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.color.brandPrimary} />
      </View>
    );
  }

  const canAfford = user.points >= reward.points_cost;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: reward.image_url }} style={styles.heroImage} contentFit="cover" />
          <Pressable
            testID="reward-detail-back"
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.color.onSurface} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{reward.category.toUpperCase()}</Text>
          </View>

          <Text style={styles.title}>{reward.title}</Text>

          <View style={styles.costRow}>
            <Ionicons name="gift" size={20} color={theme.color.brandPrimary} />
            <Text style={styles.costText}>{reward.points_cost.toLocaleString()} points</Text>
          </View>

          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.desc}>{reward.description}</Text>

          <Text style={styles.sectionHeader}>How to Redeem</Text>
          <Text style={styles.desc}>
            {reward.redemption_type === 'discount'
              ? 'Click Redeem to instantly unlock your unique discount code for use at checkout.'
              : 'Click Redeem to generate a QR code token. Show this QR code to staff at the clubhouse or range to claim your reward.'}
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            testID="redeem-reward-btn"
            style={({ pressed }) => [
              styles.cta,
              !canAfford && styles.ctaDisabled,
              pressed && canAfford && { opacity: 0.9 },
            ]}
            onPress={redeem}
            disabled={!canAfford || redeeming}
          >
            {redeeming ? (
              <ActivityIndicator color={theme.color.onBrandPrimary} />
            ) : (
              <Text style={styles.ctaText}>
                {canAfford ? `Redeem for ${reward.points_cost.toLocaleString()} Pts` : 'Not Enough Points'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Result Modal */}
      <Modal visible={!!result} transparent animationType="slide" onRequestClose={() => setResult(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Ionicons name="checkmark-circle" size={48} color={theme.color.brandPrimary} style={{ alignSelf: 'center' }} />
            <Text style={styles.modalTitle}>Reward Unlocked!</Text>
            <Text style={styles.modalSub}>You have successfully redeemed {reward.title}.</Text>

            {result?.discount_code ? (
              <View style={styles.codeWrap}>
                <Text style={styles.codeLabel}>YOUR DISCOUNT CODE</Text>
                <Text style={styles.codeValue} testID="discount-code-value">{result.discount_code}</Text>
              </View>
            ) : null}

            {result?.qr_code_token ? (
              <View style={styles.qrWrap}>
                <Text style={styles.codeLabel}>SHOW THIS QR CODE TO STAFF</Text>
                <View style={styles.qrBox}>
                  <QRCode value={result.qr_code_token} size={180} />
                </View>
                <Text style={styles.qrTokenText}>{result.qr_code_token}</Text>
              </View>
            ) : null}

            <Pressable testID="close-redemption-modal" style={styles.closeBtn} onPress={() => { setResult(null); router.back(); }}>
              <Text style={styles.closeBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { justifyContent: 'center', alignItems: 'center' },
  heroWrap: { width: '100%', height: 260, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute', left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: theme.spacing.xl },
  catBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.color.accentSoft,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: theme.radius.pill, marginBottom: theme.spacing.sm,
  },
  catText: { color: theme.color.brandPrimary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: { color: theme.color.onSurface, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: theme.spacing.sm },
  costText: { color: theme.color.brandPrimary, fontSize: 18, fontWeight: '800' },
  sectionHeader: { color: theme.color.onSurface, fontSize: 16, fontWeight: '700', marginTop: theme.spacing.xl, marginBottom: 6 },
  desc: { color: theme.color.onSurfaceSecondary, fontSize: 14, lineHeight: 22 },
  errorText: { color: theme.color.error, marginTop: theme.spacing.md, fontSize: 14, fontWeight: '600' },
  cta: {
    marginTop: theme.spacing.xxl,
    backgroundColor: theme.color.brandPrimary,
    paddingVertical: 16, borderRadius: theme.radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: theme.color.surfaceTertiary },
  ctaText: { color: theme.color.onBrandPrimary, fontWeight: '800', fontSize: 16 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: theme.spacing.xl },
  modalSheet: { backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, padding: theme.spacing.xl },
  modalTitle: { color: theme.color.onSurface, fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  modalSub: { color: theme.color.onSurfaceSecondary, fontSize: 14, textAlign: 'center', marginTop: 6 },
  codeWrap: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border,
    borderRadius: theme.radius.md, padding: 16, alignItems: 'center', marginTop: 20,
  },
  codeLabel: { color: theme.color.brandPrimary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  codeValue: { color: theme.color.onSurface, fontSize: 24, fontWeight: '800', letterSpacing: 3, marginTop: 6 },
  qrWrap: { alignItems: 'center', marginTop: 20 },
  qrBox: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: theme.radius.md, marginTop: 10 },
  qrTokenText: { color: theme.color.onSurfaceSecondary, fontSize: 11, marginTop: 8 },
  closeBtn: { marginTop: 24, backgroundColor: theme.color.brandPrimary, paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center' },
  closeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
