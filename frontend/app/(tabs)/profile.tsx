import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth';
import { theme, tierMeta } from '@/src/theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();

  if (!user) return null;
  const meta = tierMeta[user.tier];

  const confirmLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in any time with your phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
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

        <View style={styles.identityBlock}>
          <View style={[styles.avatar, { borderColor: meta.color }]}>
            <Text style={[styles.avatarText, { color: meta.color }]}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.phone}>{user.phone}</Text>
          <View style={[styles.tierPill, { borderColor: meta.color }]}>
            <View style={[styles.tierDot, { backgroundColor: meta.color }]} />
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
              month: 'long',
              year: 'numeric',
            })}
          />
          <Row icon="ribbon-outline" label="Lifetime points" value={user.lifetime_points.toLocaleString()} last />
        </View>

        <Text style={styles.sectionLabel}>TIER BENEFITS</Text>
        <View style={styles.card}>
          {benefitsFor(user.tier).map((b, i, arr) => (
            <Row key={b} icon="checkmark-circle-outline" label={b} value="" last={i === arr.length - 1} />
          ))}
        </View>

        <Pressable
          testID="logout-button"
          onPress={confirmLogout}
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.color.onError} />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.rowDivider]}>
      <Ionicons name={icon} size={18} color={theme.color.brandPrimary} />
      <Text style={rowStyles.label}>{label}</Text>
      {value ? <Text style={rowStyles.value}>{value}</Text> : null}
    </View>
  );
}

function benefitsFor(tier: 'Silver' | 'Gold' | 'Platinum') {
  if (tier === 'Platinum') return [
    '1.5x points on every visit',
    'Priority tee-time booking',
    'Complimentary range bucket monthly',
    'Guest passes included',
  ];
  if (tier === 'Gold') return [
    '1.25x points on every visit',
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
  eyebrow: { color: theme.color.onSurfaceTertiary, letterSpacing: 2, fontSize: 10 },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 32, marginTop: 2 },

  identityBlock: { alignItems: 'center', marginTop: theme.spacing.xl, marginBottom: theme.spacing.xl },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 1, backgroundColor: theme.color.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: theme.font.display, fontSize: 36 },
  name: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 24, marginTop: theme.spacing.md },
  phone: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 4 },
  tierPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: theme.radius.pill, borderWidth: 1, marginTop: theme.spacing.md,
  },
  tierDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  tierText: { fontSize: 11, letterSpacing: 2 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 20 },
  statLabel: { color: theme.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 1.5, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: theme.color.border, marginVertical: 8 },

  sectionLabel: {
    color: theme.color.onSurfaceTertiary,
    letterSpacing: 2, fontSize: 10,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
  },

  logout: {
    marginTop: theme.spacing.xxl,
    backgroundColor: 'rgba(138,51,51,0.18)',
    borderColor: theme.color.error,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: { color: theme.color.onError, letterSpacing: 1.5, fontSize: 13, textTransform: 'uppercase' },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  label: { flex: 1, color: theme.color.onSurface, fontSize: 14 },
  value: { color: theme.color.onSurfaceSecondary, fontSize: 13 },
});
