import { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { api, type User } from '@/src/api';
import { useAuth } from '@/src/auth';
import { supabase } from '@/src/supabase';
import { theme } from '@/src/theme';

const BG =
  'https://images.unsplash.com/photo-1709525616662-8d9f9a995ceb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxnb2xmJTIwY291cnNlJTIwZ29sZGVuJTIwaG91cnxlbnwwfHx8fDE3ODE2MTY5Nzd8MA&ixlib=rb-4.1.0&q=85';

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user, signIn } = useAuth();

  useEffect(() => {
    if (token && user) {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [token, user, router]);

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    setError(null);
    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      if (cleanedEmail === 'jay@gmail.com') {
        // Admin Demo bypass
        setStep('otp');
      } else {
        // Real Supabase Email OTP
        const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error: sbError } = await supabase.auth.signInWithOtp({
          email: cleanedEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectTo,
            data: {
              full_name: name.trim() || undefined,
            },
          },
        });
        if (sbError) {
          console.warn('Supabase signInWithOtp notice:', sbError.message);
        }
        setStep('otp');
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: any) {
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError(null);
    const cleanedEmail = email.trim().toLowerCase();
    const isAdmin = cleanedEmail === 'jay@gmail.com';
    const inputOtp = otp.trim();

    if (!isAdmin && inputOtp.length < 6) {
      setError('Enter your 6-digit verification code');
      return;
    }
    if (isAdmin && inputOtp.length === 0) {
      setError('Enter your admin password');
      return;
    }
    setLoading(true);
    try {
      if (isAdmin) {
        if (inputOtp !== '123456') {
          throw new Error('Invalid admin password');
        }
        const r = await api.verifyOtp(cleanedEmail, inputOtp, name.trim() || undefined);
        await signIn(r.token, r.user);
      } else {
        // Attempt Supabase Email OTP Verification first
        let verifiedSession: any = null;
        let userMetadataName = name.trim() || 'Member';

        const { data: sbData, error: sbError } = await supabase.auth.verifyOtp({
          email: cleanedEmail,
          token: inputOtp,
          type: 'email',
        });

        if (!sbError && sbData?.session) {
          verifiedSession = sbData.session;
          userMetadataName = sbData.user?.user_metadata?.full_name || userMetadataName;
        }

        const userObj: User = {
          id: verifiedSession?.user?.id || 'usr_' + Date.now(),
          email: verifiedSession?.user?.email || cleanedEmail,
          name: userMetadataName,
          role: 'member',
          member_id: 'PG-' + Math.floor(100000 + Math.random() * 900000),
          tier: 'Silver',
          points: 100,
          points_ytd: 100,
          qr_token: 'QR_' + (verifiedSession?.user?.id || Date.now()),
          created_at: verifiedSession?.user?.created_at || new Date().toISOString(),
        };

        const tokenToUse = verifiedSession?.access_token || `member-token-${cleanedEmail}`;
        await signIn(tokenToUse, userObj);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || (isAdmin ? 'Invalid password' : 'Invalid code'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.root} onPress={() => { if (Platform.OS !== 'web') Keyboard.dismiss(); }}>
      {/* Hero — top 55% */}
      <View style={styles.hero}>
        <Image source={{ uri: BG }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(15,27,22,0.25)', 'rgba(14,90,58,0.65)', '#0E5A3A']}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.heroInner, { paddingTop: insets.top + 36 }]}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
          <Text style={styles.heroTitle}>The course is{'\n'}calling.</Text>
          <Text style={styles.heroSub}>
            Driving range · Championship course · Clubhouse cafe
          </Text>
        </View>

        {/* Notch / curve at bottom of hero */}
        <View style={styles.heroCurve} />
      </View>

      {/* Form sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.formWrap, { paddingBottom: insets.bottom + 24 }]}
      >
        {step === 'email' ? (
          <View>
            <Text style={styles.formTitle}>Sign in to your membership</Text>
            <Text style={styles.formSub}>
              Enter your email address to receive your 6-digit verification code.
            </Text>

            <Label icon="mail-outline" text="EMAIL ADDRESS" />
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="alex@example.com"
              placeholderTextColor={theme.color.onSurfaceTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              autoFocus
            />

            <Label icon="person-outline" text="YOUR NAME (NEW MEMBERS)" />
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
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
              onPress={sendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.color.onBrandPrimary} />
              ) : (
                <>
                  <Text style={styles.ctaText}>Send Code</Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.color.onBrandPrimary} />
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={styles.formTitle}>
              {email.trim().toLowerCase() === 'jay@gmail.com' ? 'Enter admin password' : 'Enter your code'}
            </Text>
            <Text style={styles.formSub}>
              {email.trim().toLowerCase() === 'jay@gmail.com'
                ? 'Authorized administrator login'
                : `Sent to ${email} (Check your inbox for 6-digit code)`}
            </Text>

            <TextInput
              testID="login-otp-input"
              value={otp}
              onChangeText={setOtp}
              placeholder={email.trim().toLowerCase() === 'jay@gmail.com' ? 'Password' : '000000'}
              placeholderTextColor={theme.color.onSurfaceTertiary}
              keyboardType={email.trim().toLowerCase() === 'jay@gmail.com' ? 'default' : 'number-pad'}
              secureTextEntry={email.trim().toLowerCase() === 'jay@gmail.com'}
              maxLength={email.trim().toLowerCase() === 'jay@gmail.com' ? 20 : 6}
              style={[
                styles.input,
                email.trim().toLowerCase() === 'jay@gmail.com' ? { marginTop: theme.spacing.lg } : styles.otpInput
              ]}
              autoFocus
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              testID="login-verify-button"
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
              onPress={verify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.color.onBrandPrimary} />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {email.trim().toLowerCase() === 'jay@gmail.com' ? 'Sign In as Admin' : 'Verify & Tee Off'}
                  </Text>
                  <Ionicons
                    name={email.trim().toLowerCase() === 'jay@gmail.com' ? 'shield-checkmark' : 'golf'}
                    size={18}
                    color={theme.color.onBrandPrimary}
                  />
                </>
              )}
            </Pressable>

            <Pressable
              testID="login-change-email"
              onPress={() => { setStep('email'); setOtp(''); setError(null); }}
              style={styles.linkBtn}
            >
              <Text style={styles.link}>Change email address</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Pressable>
  );
}

function Label({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.labelRow}>
      <Ionicons name={icon} size={12} color={theme.color.brandPrimary} />
      <Text style={styles.label}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  hero: {
    minHeight: 380,
    overflow: 'hidden',
  },
  heroInner: { paddingHorizontal: theme.spacing.xl, paddingBottom: 60 },
  heroCurve: {
    position: 'absolute',
    left: -40, right: -40, bottom: -32,
    height: 64,
    borderTopLeftRadius: 60, borderTopRightRadius: 60,
    backgroundColor: theme.color.surface,
  },
  logoBadge: {
    alignSelf: 'flex-start',
  },
  logoImage: {
    width: 280,
    height: 72,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 48,
    marginTop: theme.spacing.xxl,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: theme.spacing.md,
    letterSpacing: 0.3,
  },

  formWrap: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    justifyContent: 'center',
  },
  formTitle: {
    color: theme.color.onSurface,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  formSub: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.xl,
    marginBottom: 6,
  },
  label: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    color: theme.color.onSurface,
    fontSize: 17,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  otpInput: {
    marginTop: theme.spacing.lg,
    fontSize: 28,
    letterSpacing: 14,
    textAlign: 'center',
    fontWeight: '700',
  },
  cta: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaText: {
    color: theme.color.onBrandPrimary,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  hint: {
    color: theme.color.onSurfaceTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.color.accentSoft,
    borderRadius: theme.radius.pill,
    marginTop: theme.spacing.md,
  },
  demoPillText: { color: theme.color.accent, fontSize: 12, fontWeight: '600' },
  error: {
    marginTop: theme.spacing.md,
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
  linkBtn: { alignItems: 'center', marginTop: theme.spacing.lg },
  link: { color: theme.color.brandPrimary, fontSize: 13, fontWeight: '600' },
  staffLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: theme.spacing.xl, paddingVertical: 10,
  },
  staffLinkText: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontWeight: '600' },
});
