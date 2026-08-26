import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { tierMeta } from '../theme';
import type { User } from '../api';

const LOGO = require('../../assets/images/icon.png');

interface Props {
  user: User;
  onShowQr?: () => void;
  onPressQr?: () => void;
}

export function MembershipCard({ user, onShowQr, onPressQr }: Props) {
  const meta = tierMeta[user.tier] || tierMeta.Silver;
  const handlePress = onShowQr || onPressQr;

  return (
    <Pressable
      testID="membership-card"
      onPress={handlePress}
      style={({ pressed }) => [styles.cardContainer, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <LinearGradient
        colors={meta.cardGradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Background glow effect */}
        <View style={styles.glow} />

        {/* Top Header */}
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
          <View style={styles.tierBadge}>
            <Ionicons name={meta.icon as any} size={14} color="#FFFFFF" />
            <Text style={styles.tierText}>{(user.tier || 'Member').toUpperCase()}</Text>
          </View>
        </View>

        {/* Middle Content */}
        <View style={styles.body}>
          <Text style={styles.memberName}>{user.name || 'Member'}</Text>
          <Text style={styles.memberId}>{user.member_id || 'PG-100234'}</Text>
        </View>

        {/* Bottom Footer */}
        <View style={styles.footer}>
          <View style={styles.pointsCol}>
            <Text style={styles.pointsLabel}>LIFETIME POINTS</Text>
            <Text style={styles.pointsVal}>{(user.points_ytd || user.points || 0).toLocaleString()} PTS</Text>
          </View>

          {handlePress ? (
            <View style={styles.qrBadge}>
              <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
              <Text style={styles.qrBadgeText}>Scan Card</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  card: {
    padding: 24,
    minHeight: 210,
    justifyContent: 'space-between',
  },
  glow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 130,
    height: 32,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  body: {
    marginTop: 20,
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  memberId: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  pointsCol: {},
  pointsLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pointsVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  qrBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
