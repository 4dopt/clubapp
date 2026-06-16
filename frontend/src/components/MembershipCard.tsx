import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme, tierMeta } from '@/src/theme';
import type { User } from '@/src/api';

const CARD_BG =
  'https://images.unsplash.com/photo-1709525617237-778500c895a8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwzfHxnb2xmJTIwY291cnNlJTIwZ29sZGVuJTIwaG91cnxlbnwwfHx8fDE3ODE2MTY5Nzd8MA&ixlib=rb-4.1.0&q=85';

type Props = {
  user: User;
  onPressQR?: () => void;
};

export function MembershipCard({ user, onPressQR }: Props) {
  const meta = tierMeta[user.tier];
  return (
    <Pressable testID="membership-card" onPress={onPressQR} style={styles.wrap}>
      <Image source={{ uri: CARD_BG }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['rgba(14,18,16,0.55)', 'rgba(14,18,16,0.88)', 'rgba(14,18,16,0.96)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topRow}>
        <View>
          <Text style={styles.brandSmall}>PlayGolf</Text>
          <Text style={styles.brandSub}>MEMBER CARD</Text>
        </View>
        <View style={[styles.tierPill, { borderColor: meta.color }]}>
          <View style={[styles.tierDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.tierText, { color: meta.color }]}>
            {user.tier.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.middle}>
        <Text style={styles.eyebrow}>MEMBER</Text>
        <Text style={styles.memberName} numberOfLines={1}>
          {user.name}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.eyebrow}>ID</Text>
          <Text style={styles.memberId}>{user.member_id}</Text>
        </View>
        <View style={styles.qrBtn} testID="card-qr-button">
          <Ionicons name="qr-code-outline" size={22} color={theme.color.brandPrimary} />
          <Text style={styles.qrLabel}>SHOW QR</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 230,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandSmall: {
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontSize: 24,
    fontWeight: '400',
  },
  brandSub: {
    color: theme.color.onSurfaceTertiary,
    letterSpacing: 3,
    fontSize: 9,
    marginTop: 2,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(14,18,16,0.4)',
  },
  tierDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  tierText: { fontSize: 10, letterSpacing: 2, fontWeight: '500' },
  middle: { marginTop: 4 },
  eyebrow: {
    color: theme.color.onSurfaceTertiary,
    letterSpacing: 2,
    fontSize: 10,
  },
  memberName: {
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontSize: 30,
    marginTop: 4,
    fontWeight: '400',
  },
  memberId: {
    color: theme.color.brandPrimary,
    fontSize: 16,
    marginTop: 4,
    letterSpacing: 2,
  },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.brandPrimary,
    backgroundColor: 'rgba(212,175,55,0.08)',
    gap: 8,
  },
  qrLabel: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    letterSpacing: 2,
  },
});
