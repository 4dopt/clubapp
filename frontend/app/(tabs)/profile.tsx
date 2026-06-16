import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform } from 'react-native';
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

  const doSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Sign out?')) doSignOut();
      return;
    }
    Alert.alert('Sign out?', 'You can sign back in any time with your phone.', [
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
          <Text style={styles.phone}>{user.phone}</Text>
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
          <Row icon="ribbon-outline" label="Lifetime points" value={user.lifetime_points.toLocaleString()} last />
        </View>

        <Text style={styles.sectionLabel}>TIER BENEFITS</Text>
        <View style={styles.card}>
          {benefitsFor(user.tier).map((b, i, arr) => (
            <Row key={b} icon="checkmark-circle" label={b} value="" last={i === arr.length - 1} />
          ))}
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
    </View>
  );
}

function Row({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.rowDivider]}>
      <View style={rowStyles.iconWrap}>
        <Ionicons name={icon} size={16} color={theme.color.brandPrimary} />
      </View>
      <Text style={rowStyles.label}>{label}</Text>
      {value ? <Text style={rowStyles.value}>{value}</Text> : null}
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
