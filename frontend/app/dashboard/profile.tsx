import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MembershipCard } from '@/src/components/MembershipCard';
import { QrModal } from '@/src/components/QrModal';
import { api, type User } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { token, user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(authUser || null);
  const [qrOpen, setQrOpen] = useState(false);

  const currentUser = user || authUser;

  useEffect(() => {
    if (token) {
      api.me(token)
        .then((u) => { if (u) setUser(u); })
        .catch(() => { if (authUser) setUser(authUser); });
    }
  }, [token, authUser]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + 100, paddingHorizontal: theme.spacing.lg }}>
        <Text style={styles.eyebrow}>DIGITAL MEMBERSHIP CARD</Text>
        <Text style={styles.title}>Member Pass</Text>

        {currentUser ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <MembershipCard user={currentUser} onShowQr={() => setQrOpen(true)} />
            <Pressable onPress={() => setQrOpen(true)} style={styles.btn}>
              <Text style={styles.btnText}>Open Fullscreen QR Code</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      <QrModal visible={qrOpen} onClose={() => setQrOpen(false)} user={currentUser} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  eyebrow: { color: theme.color.brandPrimary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: theme.color.onSurface, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  btn: {
    marginTop: theme.spacing.xl, backgroundColor: theme.color.brandPrimary,
    paddingVertical: 16, borderRadius: theme.radius.pill, alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
