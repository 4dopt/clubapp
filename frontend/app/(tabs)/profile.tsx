import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/src/auth';
import { api } from '@/src/api';
import { theme, tierMeta } from '@/src/theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, refresh, signOut } = useAuth();
  
  const [benefitsModalOpen, setBenefitsModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const performUpgrade = async (targetTier: 'Gold' | 'Platinum') => {
    if (!token || upgrading) return;
    setUpgrading(true);
    try {
      await api.upgradeTier(token, targetTier);
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Tier Upgraded!',
        `Congratulations! You are now a ${targetTier} Member.`,
        [{ text: 'Great', onPress: () => setUpgradeModalOpen(false) }]
      );
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message || 'Failed to upgrade tier. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  if (!user) return null;
  const meta = tierMeta[user.tier];

  const doSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Sign out?')) doSignOut();
      return;
    }
    Alert.alert('Sign out?', 'You can sign back in any time with your email.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.identityCard}>
          <View style={[styles.avatar, { backgroundColor: meta.bg, borderColor: meta.color }]}>
            <Text style={[styles.avatarText, { color: meta.color }]}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.phone}>{user.email || user.phone || 'No email'}</Text>
          <View style={[styles.tierPill, { backgroundColor: meta.bg }]}>
            <Ionicons name="trophy" size={11} color={meta.color} />
            <Text style={[styles.tierText, { color: meta.color }]}>{user.tier} Member</Text>
          </View>
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
            <Text style={styles.statValue}>{user.member_id.replace('PG-', '')}</Text>
            <Text style={styles.statLabel}>MEMBER ID</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>MEMBERSHIP</Text>
        <View style={styles.card}>
          <Row icon="trophy-outline" label="Tier" value={user.tier} />
          <Row
            icon="calendar-outline"
            label="Member since"
            value={new Date(user.joined_at).toLocaleDateString(undefined, {
              month: 'long', year: 'numeric',
            })}
          />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <Row
            icon="time-outline"
            label="Transaction History"
            value=""
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/history');
            }}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>TIER BENEFITS</Text>
        <View style={styles.card}>
          {benefitsFor(user.tier).map((b, i, arr) => (
            <Row key={b} icon="checkmark-circle" label={b} value="" last={i === arr.length - 1} />
          ))}
        </View>

        {/* Upgrade Box section */}
        <View style={styles.upgradeBox}>
          <View style={styles.upgradeHeader}>
            <Ionicons name="sparkles" size={18} color={theme.color.gold} />
            <Text style={styles.upgradeBoxTitle}>Premium Tiers</Text>
          </View>
          <Text style={styles.upgradeBoxSub}>
            Elevate your golf club experience with priority booking, discounts, and point boosters.
          </Text>
          
          <View style={styles.upgradeActionsRow}>
            <Pressable
              testID="show-benefits-btn"
              onPress={() => setBenefitsModalOpen(true)}
              style={({ pressed }) => [styles.upgradeSecondaryBtn, pressed && styles.pressedState]}
            >
              <Ionicons name="gift-outline" size={16} color={theme.color.brandPrimary} />
              <Text style={styles.upgradeSecondaryBtnText}>Show Benefits</Text>
            </Pressable>
            
            {user.tier !== 'Platinum' ? (
              <Pressable
                testID="upgrade-membership-btn"
                onPress={() => setUpgradeModalOpen(true)}
                style={({ pressed }) => [styles.upgradePrimaryBtn, pressed && styles.pressedState]}
              >
                <Ionicons name="trending-up" size={16} color="#FFFFFF" />
                <Text style={styles.upgradePrimaryBtnText}>Upgrade</Text>
              </Pressable>
            ) : (
              <View style={styles.highestTierPill}>
                <Ionicons name="checkmark-circle" size={14} color={theme.color.success} />
                <Text style={styles.highestTierText}>Highest Tier Active</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          testID="logout-button"
          onPress={confirmLogout}
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.color.error} />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.versionText}>PlayGolf · v1.0.0</Text>
      </ScrollView>

      {/* Benefits Modal */}
      <Modal
        visible={benefitsModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBenefitsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEyebrow}>PLAYGOLF CLUB</Text>
              <Text style={styles.modalTitle}>Membership Benefits</Text>
              <Pressable
                testID="close-benefits-modal"
                onPress={() => setBenefitsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={theme.color.onSurface} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Silver Tier */}
              <View style={[styles.benefitTierCard, user.tier === 'Silver' && styles.activeTierBorder]}>
                <View style={styles.benefitTierHeader}>
                  <View style={[styles.tierIndicator, { backgroundColor: tierMeta.Silver.bg }]}>
                    <Text style={[styles.tierIndicatorText, { color: tierMeta.Silver.color }]}>SILVER</Text>
                  </View>
                  {user.tier === 'Silver' && <Text style={styles.activeLabel}>Current Tier</Text>}
                </View>
                <Text style={styles.tierStatusDesc}>Included for all registered golfers.</Text>
                <View style={styles.benefitsList}>
                  <BenefitRow text="Earn 1 point per $1 spent on visits" />
                  <BenefitRow text="Access to members-only rewards catalog" />
                  <BenefitRow text="150 bonus points on birthday" />
                </View>
              </View>

              {/* Gold Tier */}
              <View style={[styles.benefitTierCard, user.tier === 'Gold' && styles.activeTierBorder]}>
                <View style={styles.benefitTierHeader}>
                  <View style={[styles.tierIndicator, { backgroundColor: tierMeta.Gold.bg }]}>
                    <Text style={[styles.tierIndicatorText, { color: tierMeta.Gold.color }]}>GOLD</Text>
                  </View>
                  {user.tier === 'Gold' && <Text style={styles.activeLabel}>Current Tier</Text>}
                </View>
                <Text style={styles.tierStatusDesc}>Upgrade instantly to access Gold status benefits.</Text>
                <View style={styles.benefitsList}>
                  <BenefitRow text="1.25× points multiplier on all visits" />
                  <BenefitRow text="10% discount at the pro shop" />
                  <BenefitRow text="Exclusive lounge access & refreshments" />
                  <BenefitRow text="Prioritized customer support response" />
                </View>
              </View>

              {/* Platinum Tier */}
              <View style={[styles.benefitTierCard, user.tier === 'Platinum' && styles.activeTierBorder]}>
                <View style={styles.benefitTierHeader}>
                  <View style={[styles.tierIndicator, { backgroundColor: tierMeta.Platinum.bg }]}>
                    <Text style={[styles.tierIndicatorText, { color: tierMeta.Platinum.color }]}>PLATINUM</Text>
                  </View>
                  {user.tier === 'Platinum' && <Text style={styles.activeLabel}>Current Tier</Text>}
                </View>
                <Text style={styles.tierStatusDesc}>Upgrade instantly to unlock elite golf club benefits.</Text>
                <View style={styles.benefitsList}>
                  <BenefitRow text="1.5× points multiplier on all visits" />
                  <BenefitRow text="Priority tee-time reservations" />
                  <BenefitRow text="Complimentary large range bucket monthly" />
                  <BenefitRow text="2 free guest passes per quarter" />
                  <BenefitRow text="Exclusive invitations to member tournaments" />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Upgrade Modal */}
      <Modal
        visible={upgradeModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUpgradeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEyebrow}>MEMBERSHIP PORTAL</Text>
              <Text style={styles.modalTitle}>Upgrade Membership</Text>
              <Pressable
                testID="close-upgrade-modal"
                onPress={() => setUpgradeModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={theme.color.onSurface} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.upgradeModalPrompt}>
                Upgrade your status to experience premium benefits instantly. Select a tier below:
              </Text>

              {user.tier === 'Silver' && (
                <Pressable
                  testID="upgrade-to-gold-option"
                  style={({ pressed }) => [styles.tierUpgradeOption, pressed && styles.pressedState]}
                  onPress={() => performUpgrade('Gold')}
                  disabled={upgrading}
                >
                  <View style={[styles.tierHeaderRow, { backgroundColor: tierMeta.Gold.bg }]}>
                    <Text style={[styles.tierOptionName, { color: tierMeta.Gold.color }]}>GOLD MEMBERSHIP</Text>
                    <Ionicons name="arrow-forward" size={16} color={tierMeta.Gold.color} />
                  </View>
                  <View style={styles.tierOptionBody}>
                    <Text style={styles.tierOptionBenefit}>• 1.25× point booster</Text>
                    <Text style={styles.tierOptionBenefit}>• 10% pro shop discount</Text>
                    <Text style={styles.tierOptionBenefit}>• Member lounge access</Text>
                  </View>
                </Pressable>
              )}

              {(user.tier === 'Silver' || user.tier === 'Gold') && (
                <Pressable
                  testID="upgrade-to-platinum-option"
                  style={({ pressed }) => [styles.tierUpgradeOption, pressed && styles.pressedState]}
                  onPress={() => performUpgrade('Platinum')}
                  disabled={upgrading}
                >
                  <View style={[styles.tierHeaderRow, { backgroundColor: tierMeta.Platinum.bg }]}>
                    <Text style={[styles.tierOptionName, { color: tierMeta.Platinum.color }]}>PLATINUM MEMBERSHIP</Text>
                    <Ionicons name="arrow-forward" size={16} color={tierMeta.Platinum.color} />
                  </View>
                  <View style={styles.tierOptionBody}>
                    <Text style={styles.tierOptionBenefit}>• 1.5× point booster</Text>
                    <Text style={styles.tierOptionBenefit}>• Priority tee-time booking</Text>
                    <Text style={styles.tierOptionBenefit}>• Free range bucket monthly</Text>
                  </View>
                </Pressable>
              )}

              {upgrading && (
                <ActivityIndicator color={theme.color.brandPrimary} style={{ marginTop: 24 }} />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ icon, label, value, last, onPress }: { icon: any; label: string; value: string; last?: boolean; onPress?: () => void }) {
  const content = (
    <>
      <View style={rowStyles.iconWrap}>
        <Ionicons name={icon} size={16} color={theme.color.brandPrimary} />
      </View>
      <Text style={rowStyles.label}>{label}</Text>
      {value ? <Text style={rowStyles.value}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.color.onSurfaceTertiary} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[rowStyles.row, !last && rowStyles.rowDivider]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[rowStyles.row, !last && rowStyles.rowDivider]}>
      {content}
    </View>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitListItem}>
      <Ionicons name="checkmark-circle" size={16} color={theme.color.brandPrimary} />
      <Text style={styles.benefitListText}>{text}</Text>
    </View>
  );
}

function benefitsFor(tier: 'Silver' | 'Gold' | 'Platinum') {
  if (tier === 'Platinum') return [
    '1.5× points on every visit',
    'Priority tee-time booking',
    'Complimentary range bucket monthly',
    'Guest passes included',
  ];
  if (tier === 'Gold') return [
    '1.25× points on every visit',
    'Pro shop discount 10%',
    'Lounge access',
  ];
  return [
    'Earn points on every visit',
    'Members-only rewards catalog',
    'Birthday bonus points',
  ];
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  eyebrow: {
    color: theme.color.brandPrimary,
    letterSpacing: 1.5, fontSize: 10, fontWeight: '700',
  },
  title: {
    color: theme.color.onSurface,
    fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2,
  },

  identityCard: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '800' },
  name: { color: theme.color.onSurface, fontSize: 22, fontWeight: '800', marginTop: theme.spacing.md, letterSpacing: -0.4 },
  phone: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 4 },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: theme.radius.pill, marginTop: theme.spacing.md,
  },
  tierText: { fontSize: 11, letterSpacing: 1, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: theme.color.onSurface, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  statLabel: { color: theme.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 1.5, marginTop: 4, fontWeight: '700' },
  statDivider: { width: 1, backgroundColor: theme.color.divider, marginVertical: 4 },

  sectionLabel: {
    color: theme.color.brandPrimary,
    letterSpacing: 1.5, fontSize: 10, fontWeight: '700',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border, borderWidth: 1, borderRadius: 16,
    paddingHorizontal: theme.spacing.lg,
  },

  logout: {
    marginTop: theme.spacing.xxl,
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: '#F0C5C5',
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: { color: theme.color.error, letterSpacing: 0.5, fontSize: 14, fontWeight: '700' },
  versionText: { color: theme.color.onSurfaceTertiary, fontSize: 11, textAlign: 'center', marginTop: theme.spacing.lg },

  // Upgrade section styles
  upgradeBox: {
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: '#E6D3A0', // warm gold border
    borderRadius: 20,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    shadowColor: theme.color.gold,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  upgradeBoxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.color.onSurface,
  },
  upgradeBoxSub: {
    fontSize: 13,
    color: theme.color.onSurfaceSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  upgradeActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  upgradePrimaryBtn: {
    flex: 1.3,
    backgroundColor: theme.color.brandPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  upgradePrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  upgradeSecondaryBtn: {
    flex: 1,
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.borderStrong,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  upgradeSecondaryBtnText: {
    color: theme.color.brandPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  pressedState: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  highestTierPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.color.brandTertiary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  highestTierText: {
    color: theme.color.brandPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 27, 22, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.color.border,
    position: 'relative',
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.color.brandPrimary,
    letterSpacing: 1.5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.color.onSurface,
    marginTop: 2,
  },
  modalCloseBtn: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: theme.spacing.lg + 4,
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },

  // Benefits list styling
  benefitTierCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 20,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  activeTierBorder: {
    borderColor: theme.color.accent,
    borderWidth: 1.5,
  },
  benefitTierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tierIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.accent,
  },
  tierStatusDesc: {
    fontSize: 12,
    color: theme.color.onSurfaceSecondary,
    marginBottom: theme.spacing.md,
  },
  benefitsList: {
    gap: 10,
  },
  benefitListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  benefitListText: {
    color: theme.color.onSurface,
    fontSize: 13,
    fontWeight: '600',
  },

  // Upgrade option styling
  upgradeModalPrompt: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  tierUpgradeOption: {
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
  },
  tierOptionName: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tierOptionBody: {
    padding: theme.spacing.lg,
    gap: 8,
  },
  tierOptionBenefit: {
    color: theme.color.onSurface,
    fontSize: 13,
    fontWeight: '600',
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: theme.spacing.md, gap: theme.spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  iconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: theme.color.brandTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { flex: 1, color: theme.color.onSurface, fontSize: 14, fontWeight: '600' },
  value: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontWeight: '600' },
});
