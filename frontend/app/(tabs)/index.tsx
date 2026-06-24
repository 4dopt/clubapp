import { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/src/auth';
import { api, type Reward } from '@/src/api';
import { theme, tierMeta } from '@/src/theme';
import { MembershipCard } from '@/src/components/MembershipCard';
import { QrModal } from '@/src/components/QrModal';

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, refresh } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [addingPoints, setAddingPoints] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // QR Check-in states
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const cooldownRef = useRef<boolean>(false);

  const load = useCallback(async () => {
    try {
      const list = await api.rewards();
      setRewards(list);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), load()]);
    setRefreshing(false);
  };

  const simulateVisit = async () => {
    setScanError(null);
    setScanModalOpen(true);
    if (!permission?.granted && permission?.canAskAgain) {
      await requestPermission();
    }
  };

  const handleCheckInCode = async (code: string) => {
    if (checkingCode) return;
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setCheckingCode(true);
    setScanError(null);
    try {
      if (cleanCode.toUpperCase() === 'PLAYGOLF-CHECKIN') {
        if (!token) throw new Error('Not logged in');
        await api.addPoints(token, 150, 'Range visit (QR Check-in)');
        await refresh();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setToast('+150 points credited');
        setTimeout(() => setToast(null), 2200);
        setScanModalOpen(false);
      } else {
        setScanError('Invalid check-in code. Please check the QR code or try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e: any) {
      setScanError(e.message || 'Verification failed. Try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCheckingCode(false);
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (checkingCode || !scanModalOpen) return;
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 2500);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await handleCheckInCode(data);
  };

  if (!user) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.color.brandPrimary} />
      </View>
    );
  }

  const meta = tierMeta[user.tier];
  const progressTotal = meta.next - meta.prev;
  const progressDone = Math.max(0, Math.min(progressTotal, user.lifetime_points - meta.prev));
  const pct = user.tier === 'Platinum' ? 1 : progressDone / progressTotal;
  const pointsToNext = user.tier === 'Platinum' ? 0 : meta.next - user.lifetime_points;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: theme.spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.brandPrimary}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>WELCOME BACK</Text>
            <Text style={styles.greetingName}>Hi, {user.name.split(' ')[0]}</Text>
          </View>
          <Pressable
            testID="header-profile-btn"
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {(user.name || 'M').trim().charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {/* Membership card */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <MembershipCard user={user} onPressQR={() => setQrOpen(true)} />
        </View>

        {/* Points display card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <View>
              <Text style={styles.pointsLabel}>YOUR POINTS</Text>
              <View style={styles.pointsValueRow}>
                <Text style={styles.pointsValue} testID="points-balance">
                  {user.points_balance.toLocaleString()}
                </Text>
                <Text style={styles.pointsUnit}>pts</Text>
              </View>
            </View>
            <View style={styles.lifetimeBox}>
              <Text style={styles.lifetimeLabel}>LIFETIME</Text>
              <Text style={styles.lifetimeVal}>{user.lifetime_points.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.progressMetaRow}>
            <Text style={styles.progressLabel}>
              {user.tier === 'Platinum'
                ? 'TOP TIER UNLOCKED'
                : `${pointsToNext.toLocaleString()} pts to ${user.tier === 'Silver' ? 'Gold' : 'Platinum'}`}
            </Text>
            <Text style={styles.progressPct}>{Math.round(pct * 100)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <Pressable
            testID="action-show-qr"
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            onPress={() => setQrOpen(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.color.brandTertiary }]}>
              <Ionicons name="qr-code" size={18} color={theme.color.brandPrimary} />
            </View>
            <Text style={styles.actionLabel}>Show QR</Text>
          </Pressable>
          <Pressable
            testID="action-simulate-visit"
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            onPress={simulateVisit}
            disabled={addingPoints}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.color.accentSoft }]}>
              {addingPoints ? (
                <ActivityIndicator color={theme.color.accent} size="small" />
              ) : (
                <Ionicons name="golf" size={18} color={theme.color.accent} />
              )}
            </View>
            <Text style={styles.actionLabel}>Log Visit</Text>
          </Pressable>
          <Pressable
            testID="action-view-rewards"
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            onPress={() => router.push('/(tabs)/rewards')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FCEFD2' }]}>
              <Ionicons name="gift" size={18} color="#B36F00" />
            </View>
            <Text style={styles.actionLabel}>Rewards</Text>
          </Pressable>
        </View>

        {/* Book Now Banner */}
        <Pressable
          testID="book-now-banner"
          style={({ pressed }) => [
            styles.bookBanner,
            pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }
          ]}
          onPress={() => router.push('/(tabs)/booking')}
        >
          <LinearGradient
            colors={['#0E5A3A', '#093A26']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bookBannerGradient}
          >
            <View style={styles.bookBannerContent}>
              <View style={styles.bookBannerTextSection}>
                <Text style={styles.bookBannerEyebrow}>RESERVATIONS</Text>
                <Text style={styles.bookBannerTitle}>Book a Session</Text>
                <Text style={styles.bookBannerSub}>
                  Reserve range bays, tee times, interactive darts, or minigolf.
                </Text>
              </View>
              <View style={styles.bookBannerAction}>
                <View style={styles.bookBannerBtn}>
                  <Text style={styles.bookBannerBtnText}>Book Now</Text>
                  <Ionicons name="arrow-forward" size={14} color="#0E5A3A" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Featured rewards */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>EXCLUSIVE FOR MEMBERS</Text>
            <Text style={styles.sectionTitle}>Featured rewards</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/rewards')}
            testID="see-all-rewards"
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAll}>See all</Text>
            <Ionicons name="arrow-forward" size={12} color={theme.color.brandPrimary} />
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={theme.color.brandPrimary} style={{ marginTop: 24 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.md, paddingRight: theme.spacing.lg }}
          >
            {rewards.slice(0, 6).map((r) => {
              const canAfford = user.points_balance >= r.points_cost;
              return (
                <Pressable
                  key={r.id}
                  testID={`featured-reward-${r.id}`}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/reward/${r.id}`)}
                >
                  <Image source={{ uri: r.image_url }} style={styles.featuredImg} contentFit="cover" />
                  <View style={styles.featuredBadge}>
                    <Ionicons name="flash" size={10} color={theme.color.brandPrimary} />
                    <Text style={styles.featuredBadgeText}>{r.points_cost.toLocaleString()}</Text>
                  </View>
                  <View style={styles.featuredBody}>
                    <Text style={styles.featuredCategory}>{r.category.toUpperCase()}</Text>
                    <Text style={styles.featuredTitle} numberOfLines={2}>{r.title}</Text>
                    {!canAfford ? (
                      <Text style={styles.featuredLocked}>
                        Need {(r.points_cost - user.points_balance).toLocaleString()} more
                      </Text>
                    ) : (
                      <Text style={styles.featuredReady}>Ready to redeem</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </ScrollView>

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 100 }]} testID="toast">
          <Ionicons name="checkmark-circle" size={18} color={theme.color.accent} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      <QrModal
        visible={qrOpen}
        onClose={() => setQrOpen(false)}
        value={user.member_id}
        title="Your Member Pass"
        subtitle="Show this to club staff to earn points"
        footer="Staff will scan to credit points after your visit."
      />

      {/* Check-in Scanner Modal */}
      <Modal
        visible={scanModalOpen}
        animationType="slide"
        onRequestClose={() => setScanModalOpen(false)}
      >
        <View style={[styles.scanModalContainer, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.scanModalHeader}>
            <View>
              <Text style={styles.scanModalEyebrow}>MEMBER CHECK-IN</Text>
              <Text style={styles.scanModalTitle}>Scan QR Code</Text>
            </View>
            <Pressable
              testID="close-scan-modal"
              onPress={() => setScanModalOpen(false)}
              style={styles.scanModalCloseBtn}
            >
              <Ionicons name="close" size={24} color={theme.color.onSurface} />
            </Pressable>
          </View>

          {/* Error Message */}
          {scanError ? (
            <View style={styles.scanErrorContainer} testID="scan-error">
              <Ionicons name="alert-circle-outline" size={18} color={theme.color.error} />
              <Text style={styles.scanErrorText}>{scanError}</Text>
            </View>
          ) : null}

          {/* Scanner view */}
          <View style={styles.scanContentContainer}>
            {permission?.granted ? (
              <View style={styles.cameraWrapper}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={checkingCode ? undefined : handleBarcodeScanned}
                />

                {/* Viewfinder overlay */}
                {!checkingCode && (
                  <View style={styles.viewfinder} pointerEvents="none">
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                  </View>
                )}

                <View style={styles.cameraHintBar}>
                  <Ionicons name="information-circle-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.hintText}>
                    {checkingCode ? 'Verifying code...' : 'Scan the PlayGolf check-in QR code'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.cameraFallback}>
                <Ionicons name="camera-outline" size={48} color={theme.color.brandPrimary} style={{ marginBottom: 12 }} />
                <Text style={styles.fallbackTitle}>Camera access needed</Text>
                <Text style={styles.fallbackSub}>
                  Please allow camera access to scan physical QR codes at the club counter.
                </Text>
                {permission?.canAskAgain === false ? (
                  <Pressable onPress={() => Linking.openSettings()} style={styles.fallbackBtn}>
                    <Text style={styles.fallbackBtnText}>Open Settings</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={requestPermission} style={styles.fallbackBtn}>
                    <Text style={styles.fallbackBtnText}>Allow camera</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Footer controls */}
          <View style={styles.scanModalFooter}>
            {/* Developer help hint */}
            {__DEV__ && (
              <Pressable
                style={styles.devHintBox}
                onPress={() => handleCheckInCode('PLAYGOLF-CHECKIN')}
                testID="dev-simulate-scan-btn"
              >
                <Text style={styles.devHintText}>
                  [DEV] Tap here to simulate scanning correct QR code (PLAYGOLF-CHECKIN)
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  greetingName: {
    color: theme.color.onSurface,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.color.brandPrimary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  pointsCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 20,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  pointsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pointsLabel: {
    color: theme.color.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  pointsValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  pointsValue: {
    color: theme.color.onSurface,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 48,
  },
  pointsUnit: {
    color: theme.color.brandPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  lifetimeBox: {
    backgroundColor: theme.color.brandTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  lifetimeLabel: {
    color: theme.color.brandPrimary,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  lifetimeVal: {
    color: theme.color.brandPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },

  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    marginBottom: 6,
  },
  progressLabel: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressPct: {
    color: theme.color.brandPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.color.surfaceTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.color.accent,
    borderRadius: 3,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    gap: 8,
  },
  actionPressed: { transform: [{ scale: 0.97 }] },
  actionIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: {
    color: theme.color.onSurface,
    fontSize: 12,
    fontWeight: '600',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.md,
  },
  sectionEyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  sectionTitle: {
    color: theme.color.onSurface,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAll: {
    color: theme.color.brandPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  featuredCard: {
    width: 200,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  featuredImg: { width: '100%', height: 140 },
  featuredBadge: {
    position: 'absolute',
    top: 10, right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredBadgeText: {
    color: theme.color.brandPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  featuredBody: { padding: theme.spacing.md },
  featuredCategory: {
    color: theme.color.brandPrimary,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  featuredTitle: {
    color: theme.color.onSurface,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 19,
  },
  featuredReady: {
    color: theme.color.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  featuredLocked: {
    color: theme.color.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },

  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.color.onSurface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  toastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Scanner modal styles
  scanModalContainer: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  scanModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderColor: theme.color.border,
  },
  scanModalEyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  scanModalTitle: {
    color: theme.color.onSurface,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  scanModalCloseBtn: {
    padding: 8,
  },
  scanErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FCECEC',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#F5C6C6',
  },
  scanErrorText: {
    color: theme.color.error,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  scanContentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: theme.spacing.lg,
  },
  cameraWrapper: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    marginHorizontal: theme.spacing.lg,
  },
  cameraHintBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  viewfinder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 220,
    height: 220,
    marginTop: -110,
    marginLeft: -110,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.color.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  manualEntryContainer: {
    paddingHorizontal: theme.spacing.xxl,
    alignItems: 'center',
    width: '100%',
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.color.onSurface,
    marginTop: 8,
  },
  manualSubtitle: {
    fontSize: 13,
    color: theme.color.onSurfaceSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: theme.spacing.xl,
    lineHeight: 18,
  },
  manualInput: {
    width: '100%',
    height: 52,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: theme.color.borderStrong,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    fontWeight: '700',
    color: theme.color.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  submitBtn: {
    backgroundColor: theme.color.brandPrimary,
    width: '100%',
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.xl,
    padding: 8,
  },
  switchModeText: {
    color: theme.color.brandPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  scanModalFooter: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
    gap: 12,
  },
  footerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  footerToggleText: {
    color: theme.color.brandPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  cameraFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    backgroundColor: theme.color.surfaceSecondary,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.onSurface,
    marginTop: 12,
    textAlign: 'center',
  },
  fallbackSub: {
    fontSize: 13,
    color: theme.color.onSurfaceTertiary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
  },
  fallbackBtn: {
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  fallbackBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  devHintBox: {
    backgroundColor: '#FDF6E2',
    borderWidth: 1,
    borderColor: '#F5E0A3',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  devHintText: {
    color: '#8C6B12',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  bookBanner: {
    marginTop: theme.spacing.xl,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  bookBannerGradient: {
    padding: theme.spacing.lg,
  },
  bookBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookBannerTextSection: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  bookBannerEyebrow: {
    color: theme.color.gold,
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '800',
    marginBottom: 4,
  },
  bookBannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  bookBannerSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  bookBannerAction: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBannerBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookBannerBtnText: {
    color: '#0E5A3A',
    fontSize: 12,
    fontWeight: '700',
  },
});
