import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { adminApi } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

export default function AdminScan() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token: adminToken } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [manualId, setManualId] = useState('');
  const [rewardCode, setRewardCode] = useState('');
  const [mode, setMode] = useState<'checkin' | 'reward'>('checkin');
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setError(null);
    setSuccess(null);

    // If string is 6-digit member ID
    if (/^\d{6}$/.test(data.trim())) {
      await processMemberId(data.trim());
    } else if (data.trim().startsWith('rw_')) {
      await processRewardQr(data.trim());
    } else {
      setError(`Unrecognized QR format: ${data}`);
      setTimeout(() => setScanned(false), 3000);
    }
  };

  const processMemberId = async (memberId: string) => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await adminApi.logVisit(adminToken, memberId);
      setSuccess(`Check-in logged for ${res.member_name} (${res.member_id})! +100 pts added.`);
      setTimeout(() => {
        router.push(`/admin/member/${res.user_id}`);
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'Member check-in failed');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const processRewardQr = async (qrToken: string) => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await adminApi.fulfillRewardQr(adminToken, qrToken);
      setSuccess(`Fulfilled "${res.redemption.reward_title}" for ${res.member.name}!`);
    } catch (e: any) {
      setError(e.message || 'Fulfillment failed');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const submitManualMember = () => {
    if (!manualId.trim()) return;
    processMemberId(manualId.trim());
  };

  const submitManualReward = () => {
    if (!rewardCode.trim()) return;
    processRewardQr(rewardCode.trim());
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom + 120 }}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>STAFF · SCANNER</Text>
          <Text style={styles.title}>Scan & Log</Text>
        </View>

        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => { setMode('checkin'); setError(null); setSuccess(null); }}
            style={[styles.modeBtn, mode === 'checkin' && styles.modeBtnActive]}
          >
            <Ionicons name="person" size={16} color={mode === 'checkin' ? '#FFFFFF' : '#7B8E85'} />
            <Text style={[styles.modeText, mode === 'checkin' && styles.modeTextActive]}>Member Check-In</Text>
          </Pressable>
          <Pressable
            onPress={() => { setMode('reward'); setError(null); setSuccess(null); }}
            style={[styles.modeBtn, mode === 'reward' && styles.modeBtnActive]}
          >
            <Ionicons name="gift" size={16} color={mode === 'reward' ? '#FFFFFF' : '#7B8E85'} />
            <Text style={[styles.modeText, mode === 'reward' && styles.modeTextActive]}>Redeem Reward</Text>
          </Pressable>
        </View>

        {/* Camera Viewfinder */}
        <View style={styles.cameraBox}>
          {!permission?.granted ? (
            <View style={styles.permWrap}>
              <Ionicons name="camera-outline" size={48} color="#E6C25F" />
              <Text style={styles.permText}>Camera access required to scan member QR codes</Text>
              <Pressable onPress={requestPermission} style={styles.permBtn}>
                <Text style={styles.permBtnText}>Grant Camera Permission</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.overlay}>
                <View style={styles.targetBox}>
                  <View style={[styles.corner, styles.tl]} />
                  <View style={[styles.corner, styles.tr]} />
                  <View style={[styles.corner, styles.bl]} />
                  <View style={[styles.corner, styles.br]} />
                </View>
              </View>
            </CameraView>
          )}
        </View>

        {loading ? (
          <View style={styles.feedbackBox}>
            <ActivityIndicator color="#E6C25F" size="small" />
            <Text style={styles.feedbackText}>Processing scan...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.feedbackBox, styles.errorBox]}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={[styles.feedbackText, { color: '#EF4444' }]}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={[styles.feedbackBox, styles.successBox]}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={[styles.feedbackText, { color: '#10B981' }]}>{success}</Text>
          </View>
        ) : null}

        {/* Manual Input Fallbacks */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.manualWrap}>
          <Text style={styles.manualTitle}>Manual Entry Fallback</Text>
          {mode === 'checkin' ? (
            <View style={styles.inputRow}>
              <TextInput
                value={manualId}
                onChangeText={setManualId}
                placeholder="Enter 6-digit Member ID (e.g. 104928)"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
                testID="manual-member-id-input"
              />
              <Pressable onPress={submitManualMember} disabled={loading} style={styles.submitBtn} testID="submit-manual-member">
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                value={rewardCode}
                onChangeText={setRewardCode}
                placeholder="Enter Reward Redemption Token (rw_...)"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                style={styles.input}
                testID="manual-reward-token-input"
              />
              <Pressable onPress={submitManualReward} disabled={loading} style={styles.submitBtn} testID="submit-manual-reward">
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060B08' },
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  eyebrow: { color: '#E6C25F', letterSpacing: 1.5, fontSize: 10, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  modeToggle: {
    flexDirection: 'row', gap: 8, marginHorizontal: theme.spacing.lg, marginVertical: theme.spacing.md,
    backgroundColor: '#0F1512', padding: 4, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: theme.radius.pill,
  },
  modeBtnActive: { backgroundColor: '#0E5A3A' },
  modeText: { color: '#7B8E85', fontSize: 12, fontWeight: '700' },
  modeTextActive: { color: '#FFFFFF' },

  cameraBox: {
    height: 280, marginHorizontal: theme.spacing.lg, borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#000000', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative', justifyContent: 'center', alignItems: 'center',
  },
  permWrap: { padding: 24, alignItems: 'center', gap: 12 },
  permText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, textAlign: 'center' },
  permBtn: { backgroundColor: '#0E5A3A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.pill },
  permBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  targetBox: { width: 180, height: 180, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#E6C25F' },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },

  feedbackBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md,
    padding: 12, borderRadius: theme.radius.md, backgroundColor: '#0F1512',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  successBox: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  feedbackText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', flex: 1 },

  manualWrap: { marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl },
  manualTitle: { color: '#7B8E85', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: '#0F1512', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1,
    borderRadius: theme.radius.md, color: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#0E5A3A', paddingHorizontal: 16, borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
});
