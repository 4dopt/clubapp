import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Modal, TextInput,
  Platform, KeyboardAvoidingView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { adminApi } from '@/src/api';
import { useAdminAuth } from '@/src/admin-auth';
import { theme } from '@/src/theme';

type ResultState =
  | { kind: 'idle' }
  | { kind: 'credited'; member: any; points: number; tier: string }
  | { kind: 'verified'; member: any; transaction: any }
  | { kind: 'already-used'; member: any; transaction: any }
  | { kind: 'error'; message: string };

const MEMBER_ID_RE = /^PG-\d{4,8}$/i;

export default function AdminScan() {
  const insets = useSafeAreaInsets();
  const { adminToken } = useAdminAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [showCreditSheet, setShowCreditSheet] = useState(false);
  const [creditMember, setCreditMember] = useState<string | null>(null);
  const [creditPoints, setCreditPoints] = useState('150');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState>({ kind: 'idle' });
  const cooldownRef = useRef<boolean>(false);

  useFocusEffect(useCallback(() => {
    return () => {
      // reset on blur
      setResult({ kind: 'idle' });
      setScannedValue(null);
      cooldownRef.current = false;
    };
  }, []));

  useEffect(() => {
    if (Platform.OS !== 'web' && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleScanned = async (raw: string) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 2500);
    const v = raw.trim();
    setScannedValue(v);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await handleCode(v);
  };

  const handleCode = async (v: string) => {
    if (!adminToken) return;
    if (MEMBER_ID_RE.test(v)) {
      // Member ID — show credit sheet
      setCreditMember(v.toUpperCase());
      setCreditPoints('150');
      setShowCreditSheet(true);
      return;
    }
    // Else: redemption code
    try {
      const r = await adminApi.verifyRedemption(adminToken, v);
      if (r.already_used) {
        setResult({ kind: 'already-used', member: r.member, transaction: r.transaction });
      } else {
        setResult({ kind: 'verified', member: r.member, transaction: r.transaction });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      setResult({ kind: 'error', message: e.message || 'Invalid code' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const submitCredit = async () => {
    if (!adminToken || !creditMember) return;
    const pts = parseInt(creditPoints, 10);
    if (!pts || pts <= 0) { return; }
    setSubmitting(true);
    try {
      const r = await adminApi.creditPoints(adminToken, creditMember, pts);
      setResult({ kind: 'credited', member: r.user, points: pts, tier: r.user.tier });
      setShowCreditSheet(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setResult({ kind: 'error', message: e.message || 'Failed to credit' });
      setShowCreditSheet(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetScan = () => {
    setResult({ kind: 'idle' });
    setScannedValue(null);
    cooldownRef.current = false;
  };

  const submitManual = () => {
    const v = manualInput.trim();
    if (!v) return;
    setManualInput('');
    setShowManual(false);
    handleScanned(v);
  };

  // Determine camera state
  const hasCameraSupport = Platform.OS !== 'web';
  const cameraGranted = !!permission?.granted;
  const isResultOpen = result.kind !== 'idle';

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View>
          <Text style={styles.eyebrow}>STAFF SCANNER</Text>
          <Text style={styles.title}>Scan or enter</Text>
        </View>
        <Pressable
          testID="open-manual-entry"
          onPress={() => setShowManual(true)}
          style={styles.headerBtn}
        >
          <Ionicons name="keypad-outline" size={18} color={theme.color.brandPrimary} />
          <Text style={styles.headerBtnText}>Manual</Text>
        </Pressable>
      </View>

      {/* Camera viewfinder */}
      <View style={styles.cameraWrap}>
        {hasCameraSupport ? (
          cameraGranted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={isResultOpen ? undefined : ({ data }) => handleScanned(data)}
            />
          ) : (
            <View style={styles.cameraFallback}>
              <Ionicons name="camera-outline" size={42} color={theme.color.onSurfaceTertiary} />
              <Text style={styles.fallbackTitle}>Camera access needed</Text>
              <Text style={styles.fallbackSub}>
                Allow camera so staff can scan member cards & redemption codes.
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
          )
        ) : (
          <View style={styles.cameraFallback}>
            <Ionicons name="laptop-outline" size={42} color={theme.color.onSurfaceTertiary} />
            <Text style={styles.fallbackTitle}>Use the app on a phone to scan</Text>
            <Text style={styles.fallbackSub}>Camera scanning only works on iOS/Android. On web, tap Manual to enter a code.</Text>
          </View>
        )}

        {/* Viewfinder overlay */}
        {cameraGranted && !isResultOpen ? (
          <View style={styles.viewfinder} pointerEvents="none">
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        ) : null}

        <View style={styles.hintBar}>
          <Ionicons name="information-circle-outline" size={14} color="#FFFFFF" />
          <Text style={styles.hintText}>
            {isResultOpen ? 'Tap below to scan again' : 'Point camera at member QR or redemption code'}
          </Text>
        </View>
      </View>

      {/* Result panel */}
      {isResultOpen ? (
        <View style={[styles.resultPanel, { paddingBottom: insets.bottom + 100 }]} testID="scan-result">
          {result.kind === 'credited' ? (
            <ResultCard
              tone="success"
              icon="checkmark-circle"
              title={`+${result.points} points credited`}
              subtitle={`${result.member.name} · ${result.member.member_id}`}
              detail={`New balance: ${result.member.points_balance.toLocaleString()} · ${result.tier}`}
            />
          ) : null}
          {result.kind === 'verified' ? (
            <ResultCard
              tone="success"
              icon="ribbon"
              title="Redemption verified"
              subtitle={`${result.member?.name || ''} · ${result.transaction.title}`}
              detail={`Code ${result.transaction.redemption_code} marked as used`}
            />
          ) : null}
          {result.kind === 'already-used' ? (
            <ResultCard
              tone="warn"
              icon="alert-circle"
              title="Code already used"
              subtitle={`${result.member?.name || ''} · ${result.transaction.title}`}
              detail={`Used at ${result.transaction.used_at ? new Date(result.transaction.used_at).toLocaleString() : '—'}`}
            />
          ) : null}
          {result.kind === 'error' ? (
            <ResultCard tone="error" icon="close-circle" title="Could not scan" subtitle={result.message} />
          ) : null}

          <Pressable testID="scan-again" onPress={resetScan} style={styles.againBtn}>
            <Ionicons name="qr-code-outline" size={18} color={theme.color.onBrandPrimary} />
            <Text style={styles.againText}>Scan another</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Credit sheet */}
      <Modal visible={showCreditSheet} transparent animationType="slide" onRequestClose={() => setShowCreditSheet(false)} statusBarTranslucent>
        <Pressable style={modalStyles.backdrop} onPress={() => setShowCreditSheet(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>Credit points</Text>
              <Text style={modalStyles.member}>{creditMember}</Text>

              <Text style={modalStyles.label}>POINTS TO ADD</Text>
              <TextInput
                testID="credit-points-input"
                value={creditPoints}
                onChangeText={(v) => setCreditPoints(v.replace(/\D/g, '').slice(0, 5))}
                keyboardType="number-pad"
                style={modalStyles.input}
                autoFocus
              />
              <View style={modalStyles.presetsRow}>
                {[50, 100, 150, 300, 500].map((p) => (
                  <Pressable
                    key={p}
                    testID={`preset-${p}`}
                    onPress={() => setCreditPoints(String(p))}
                    style={[modalStyles.preset, creditPoints === String(p) && modalStyles.presetActive]}
                  >
                    <Text style={[modalStyles.presetText, creditPoints === String(p) && modalStyles.presetTextActive]}>
                      +{p}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={modalStyles.actionsRow}>
                <Pressable
                  onPress={() => setShowCreditSheet(false)}
                  style={[modalStyles.action, modalStyles.actionGhost]}
                  testID="credit-cancel"
                >
                  <Text style={modalStyles.actionGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submitCredit}
                  disabled={submitting}
                  style={[modalStyles.action, modalStyles.actionPrimary]}
                  testID="credit-submit"
                >
                  {submitting ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : <Text style={modalStyles.actionPrimaryText}>Credit</Text>}
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Manual entry */}
      <Modal visible={showManual} transparent animationType="slide" onRequestClose={() => setShowManual(false)} statusBarTranslucent>
        <Pressable style={modalStyles.backdrop} onPress={() => setShowManual(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>Manual entry</Text>
              <Text style={modalStyles.memberSub}>
                Enter a member ID (e.g. PG-123456) or 8-character redemption code.
              </Text>
              <TextInput
                testID="manual-input"
                value={manualInput}
                onChangeText={(v) => setManualInput(v.toUpperCase())}
                placeholder="PG-123456 or 8-char code"
                placeholderTextColor={theme.color.onSurfaceTertiary}
                autoCapitalize="characters"
                autoFocus
                style={modalStyles.input}
              />
              <View style={modalStyles.actionsRow}>
                <Pressable onPress={() => setShowManual(false)} style={[modalStyles.action, modalStyles.actionGhost]}>
                  <Text style={modalStyles.actionGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submitManual}
                  style={[modalStyles.action, modalStyles.actionPrimary]}
                  testID="manual-submit"
                >
                  <Text style={modalStyles.actionPrimaryText}>Submit</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

function ResultCard({
  tone, icon, title, subtitle, detail,
}: { tone: 'success' | 'warn' | 'error'; icon: any; title: string; subtitle: string; detail?: string }) {
  const bg = tone === 'success' ? theme.color.accentSoft : tone === 'warn' ? '#FCEFD2' : '#FBE8E8';
  const fg = tone === 'success' ? theme.color.accent : tone === 'warn' ? '#B36F00' : theme.color.error;
  return (
    <View style={[styles.resultCard, { backgroundColor: bg, borderColor: fg }]}>
      <View style={[styles.resultIcon, { backgroundColor: fg }]}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <Text style={[styles.resultTitle, { color: fg }]}>{title}</Text>
      <Text style={styles.resultSubtitle}>{subtitle}</Text>
      {detail ? <Text style={styles.resultDetail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: theme.color.surface,
  },
  eyebrow: { color: theme.color.brandPrimary, letterSpacing: 1.5, fontSize: 10, fontWeight: '700' },
  title: { color: theme.color.onSurface, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: theme.color.brandTertiary,
    borderRadius: theme.radius.pill,
  },
  headerBtnText: { color: theme.color.brandPrimary, fontSize: 12, fontWeight: '700' },

  cameraWrap: {
    margin: theme.spacing.lg,
    aspectRatio: 1,
    backgroundColor: '#0F1B16',
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFallback: {
    flex: 1, alignSelf: 'stretch',
    backgroundColor: theme.color.surfaceTertiary,
    alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: 8,
  },
  fallbackTitle: { color: theme.color.onSurface, fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  fallbackSub: { color: theme.color.onSurfaceSecondary, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  fallbackBtn: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: 10,
    backgroundColor: theme.color.brandPrimary, borderRadius: theme.radius.pill,
  },
  fallbackBtnText: { color: theme.color.onBrandPrimary, fontSize: 13, fontWeight: '700' },

  viewfinder: {
    ...StyleSheet.absoluteFillObject,
    margin: theme.spacing.xxl,
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#FFFFFF', borderWidth: 0 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },

  hintBar: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,27,22,0.65)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },
  hintText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  resultPanel: { paddingHorizontal: theme.spacing.lg },
  resultCard: { borderRadius: 20, padding: theme.spacing.xl, borderWidth: 1, alignItems: 'center' },
  resultIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 20, fontWeight: '800', marginTop: theme.spacing.md, textAlign: 'center' },
  resultSubtitle: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginTop: 4, textAlign: 'center' },
  resultDetail: { fontSize: 12, color: theme.color.onSurfaceTertiary, marginTop: 6, textAlign: 'center' },
  againBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  againText: { color: theme.color.onBrandPrimary, fontSize: 14, fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,22,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: theme.spacing.xl,
  },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: theme.color.borderStrong, alignSelf: 'center', marginBottom: theme.spacing.md },
  title: { color: theme.color.onSurface, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  member: { color: theme.color.brandPrimary, fontSize: 16, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  memberSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 4 },
  label: { color: theme.color.brandPrimary, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginTop: theme.spacing.lg },
  input: {
    marginTop: 8,
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border, borderWidth: 1,
    borderRadius: theme.radius.md,
    fontSize: 24, fontWeight: '800', letterSpacing: -0.5,
    color: theme.color.onSurface, paddingVertical: 14, paddingHorizontal: 16,
  },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md },
  preset: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSecondary,
  },
  presetActive: { borderColor: theme.color.brandPrimary, backgroundColor: theme.color.brandTertiary },
  presetText: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontWeight: '700' },
  presetTextActive: { color: theme.color.brandPrimary },
  actionsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl },
  action: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  actionGhost: { backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  actionGhostText: { color: theme.color.onSurface, fontWeight: '700', fontSize: 14 },
  actionPrimary: { backgroundColor: theme.color.brandPrimary },
  actionPrimaryText: { color: theme.color.onBrandPrimary, fontWeight: '800', fontSize: 14 },
});
