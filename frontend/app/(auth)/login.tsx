import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

const BG =
  'https://images.unsplash.com/photo-1709525616662-8d9f9a995ceb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxnb2xmJTIwY291cnNlJTIwZ29sZGVuJTIwaG91cnxlbnwwfHx8fDE3ODE2MTY5Nzd8MA&ixlib=rb-4.1.0&q=85';

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    setError(null);
    if (phone.trim().length < 6) {
      setError('Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const r = await api.requestOtp(phone.trim());
      setDevOtp(r.dev_otp);
      setStep('otp');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError(null);
    if (otp.trim().length < 4) {
      setError('Enter the 4-digit code');
      return;
    }
    setLoading(true);
    try {
      const r = await api.verifyOtp(phone.trim(), otp.trim(), name.trim() || undefined);
      await signIn(r.token, r.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.root} onPress={Keyboard.dismiss}>
      <Image source={{ uri: BG }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['rgba(14,18,16,0.2)', 'rgba(14,18,16,0.85)', 'rgba(14,18,16,0.98)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.top, { paddingTop: insets.top + 32 }]}>
        <Text style={styles.eyebrow}>PRIVATE MEMBERS&apos; CLUB</Text>
        <Text style={styles.wordmark}>PlayGolf</Text>
        <View style={styles.rule} />
        <Text style={styles.tagline}>Driving Range · Course · Cafe</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}
      >
        {step === 'phone' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Member phone number</Text>
            <TextInput
              testID="login-phone-input"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 123 4567"
              placeholderTextColor={theme.color.onSurfaceTertiary}
              keyboardType="phone-pad"
              style={styles.input}
              autoFocus
            />
            <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>
              Your name (new members only)
            </Text>
            <TextInput
              testID="login-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Alex Morgan"
              placeholderTextColor={theme.color.onSurfaceTertiary}
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              testID="login-send-otp-button"
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
              onPress={sendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.color.onBrandPrimary} />
              ) : (
                <Text style={styles.ctaText}>Send Code</Text>
              )}
            </Pressable>
            <Text style={styles.hint}>
              Demo mode — any phone works. Code is sent instantly.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Verification code sent to</Text>
            <Text style={styles.phoneEcho}>{phone}</Text>
            <TextInput
              testID="login-otp-input"
              value={otp}
              onChangeText={setOtp}
              placeholder="0000"
              placeholderTextColor={theme.color.onSurfaceTertiary}
              keyboardType="number-pad"
              maxLength={4}
              style={[styles.input, styles.otpInput]}
              autoFocus
            />
            {devOtp ? (
              <Text testID="dev-otp-hint" style={styles.hint}>
                Demo code: {devOtp}
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              testID="login-verify-button"
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
              onPress={verify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.color.onBrandPrimary} />
              ) : (
                <Text style={styles.ctaText}>Verify & Enter</Text>
              )}
            </Pressable>

            <Pressable
              testID="login-change-phone"
              onPress={() => {
                setStep('phone');
                setOtp('');
                setError(null);
              }}
              style={styles.linkBtn}
            >
              <Text style={styles.link}>Change phone number</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  top: { paddingHorizontal: theme.spacing.xl, alignItems: 'center' },
  eyebrow: {
    color: theme.color.onSurfaceTertiary,
    letterSpacing: 4,
    fontSize: 11,
  },
  wordmark: {
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontSize: 64,
    marginTop: theme.spacing.md,
    fontWeight: '400',
  },
  rule: {
    width: 48,
    height: 1,
    backgroundColor: theme.color.brandPrimary,
    marginVertical: theme.spacing.md,
  },
  tagline: {
    color: theme.color.onSurfaceSecondary,
    letterSpacing: 2,
    fontSize: 12,
  },
  bottom: {
    marginTop: 'auto',
    paddingHorizontal: theme.spacing.xl,
  },
  form: {
    backgroundColor: 'rgba(22,27,24,0.85)',
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
  },
  label: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    marginTop: theme.spacing.sm,
    color: theme.color.onSurface,
    fontSize: 18,
    paddingVertical: 12,
    borderBottomColor: theme.color.borderStrong,
    borderBottomWidth: 1,
  },
  otpInput: {
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
  },
  phoneEcho: {
    color: theme.color.brandPrimary,
    fontSize: 16,
    marginTop: 6,
    marginBottom: theme.spacing.md,
  },
  cta: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: theme.color.onBrandPrimary,
    fontWeight: '500',
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hint: {
    color: theme.color.onSurfaceTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  error: {
    marginTop: theme.spacing.md,
    color: theme.color.onError,
    backgroundColor: 'rgba(138,51,51,0.25)',
    borderColor: theme.color.error,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  linkBtn: { alignItems: 'center', marginTop: theme.spacing.lg },
  link: { color: theme.color.brandPrimary, fontSize: 13, letterSpacing: 1 },
});
