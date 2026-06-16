import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme, tierMeta } from '@/src/theme';
import type { User } from '@/src/api';

type Props = {
  user: User;
  onPressQR?: () => void;
};

export function MembershipCard({ user, onPressQR }: Props) {
  const meta = tierMeta[user.tier];
  return (
    <Pressable testID="membership-card" onPress={onPressQR} style={styles.wrap}>
      <LinearGradient
        colors={meta.gradient}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Decorative golf-course curve */}
      <View style={styles.curveLayer} pointerEvents="none">
        <View style={styles.curve1} />
        <View style={styles.curve2} />
      </View>

      <View style={styles.topRow}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Ionicons name="golf" size={14} color={theme.color.brandPrimary} />
          </View>
          <View>
            <Text style={styles.brandSmall}>PlayGolf</Text>
            <Text style={styles.brandSub}>MEMBER CARD</Text>
          </View>
        </View>
        <View style={[styles.tierPill, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
          <View style={[styles.tierDot, { backgroundColor: '#FFFFFF' }]} />
          <Text style={styles.tierText}>{user.tier.toUpperCase()}</Text>
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
          <Ionicons name="qr-code-outline" size={18} color={theme.color.brandPrimary} />
          <Text style={styles.qrLabel}>SHOW QR</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
    shadowColor: '#0F1B16',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  curveLayer: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  curve1: {
    position: 'absolute',
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: '#FFFFFF',
    top: -180, right: -120,
  },
  curve2: {
    position: 'absolute',
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: '#FFFFFF',
    bottom: -160, left: -60,
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  brandSmall: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2.4,
    fontSize: 8,
    marginTop: 1,
    fontWeight: '600',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    gap: 6,
  },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  tierText: {
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  middle: { marginTop: 4 },
  eyebrow: {
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2,
    fontSize: 9,
    fontWeight: '600',
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 4,
  },
  memberId: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 4,
    letterSpacing: 2,
    fontWeight: '700',
  },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  qrLabel: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
});
