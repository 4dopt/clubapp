import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAdminAuth } from '@/src/admin-auth';
import { theme } from '@/src/theme';

export default function AdminLogin() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { adminToken, signIn } = useAdminAuth();

  useEffect(() => {
    if (adminToken) {
      router.replace('/(admin)/(tabs)/dashboard');
    }
  }, [adminToken]);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (pin.length < 4) { setError('Enter the staff PIN'); return; }
    setLoading(true); setError(null);
    try {
      await signIn(pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(admin)/(tabs)/dashboard');
    } catch (e: any) {
      setError(e.message || 'Wrong PIN');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={[styles.root, { paddingTop: insets.top }]} onPress={() => { if (Platform.OS !== 'web') Keyboard.dismiss(); }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace('/(auth)/login')} testID="back-to-member" style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.color.onSurface} />
          <Text style={styles.backText}>Member sign in</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
      >
        <View style={styles.iconHero}>
          <Ionicons name="shield-checkmark" size={36} color={theme.color.brandPrimary} />
        </View>
        <Text style={styles.eyebrow}>STAFF ACCESS</Text>
        <Text style={styles.title}>Enter staff PIN</Text>
        <Text style={styles.sub}>Only authorized employees can sign in here.</Text>

        <TextInput
          testID="admin-pin-input"
          value={pin}
          onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 8))}
          placeholder="• • • • • •"
          placeholderTextColor={theme.color.onSurfaceTertiary}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          style={styles.input}
          autoFocus
        />
        <Text style={styles.devHint}>Demo PIN: 123456</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          testID="admin-login-submit"
          onPress={submit}
          disabled={loading}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        >
          {loading ? (
            <ActivityIndicator color={theme.color.onBrandPrimary} />
          ) : (
            <>
              <Text style={styles.ctaText}>Sign in</Text>
              <Ionicons name="arrow-forward" size={18} color={theme.color.onBrandPrimary} />
            </>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  topBar: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: theme.color.onSurface, fontSize: 14, fontWeight: '600' },

  center: { flex: 1, padding: theme.spacing.xl, justifyContent: 'center' },
  iconHero: {
    alignSelf: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.color.brandTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 11, letterSpacing: 1.8, fontWeight: '700',
    textAlign: 'center', marginTop: theme.spacing.lg,
  },
  title: {
    color: theme.color.onSurface,
    fontSize: 28, fontWeight: '800', letterSpacing: -0.6,
    textAlign: 'center', marginTop: 4,
  },
  sub: {
    color: theme.color.onSurfaceSecondary, fontSize: 13,
    textAlign: 'center', marginTop: 6,
  },
  input: {
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border, borderWidth: 1,
    borderRadius: theme.radius.md,
    fontSize: 28, fontWeight: '800',
    letterSpacing: 12, textAlign: 'center',
    color: theme.color.onSurface,
    paddingVertical: 16, marginTop: theme.spacing.xl,
  },
  devHint: { color: theme.color.onSurfaceTertiary, fontSize: 12, textAlign: 'center', marginTop: 8 },
  cta: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  ctaText: { color: theme.color.onBrandPrimary, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  error: {
    marginTop: theme.spacing.md,
    color: theme.color.error,
    backgroundColor: '#FBE8E8',
    borderColor: '#F0C5C5', borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 10, paddingHorizontal: 12,
    fontSize: 13, textAlign: 'center',
  },
});
