import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { tierMeta } from '../theme';
import type { User } from '../api';

const LOGO = require('../../assets/images/playgolf-logo-light.png');

interface Props {
  user: User;
  onShowQr?: () => void;
}

export function MembershipCard({ user, onShowQr }: Props) {
  const meta = tierMeta[user.tier] || tierMeta.Silver;

  return (
    <Pressable
      testID="membership-card"
      style={({ pressed }) => [styles.cardWrap, pressed && { transform: [{ scale: 0.98 }] }]}
      onPress={onShowQr}
    >
      <LinearGradient colors={meta.gradientColors} locations={meta.gradientLocations} style={styles.cardBg}>
        {/* Subtle decorative circles */}
        <View style={styles.circleBg1} />
        <View style={styles.circleBg2} />

        {/* Top bar: Club Logo & Tier Badge */}
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logoImage} contentFit="contain" />
          <View style={[styles.badge, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
            <Text style={[styles.badgeText, { color: meta.badgeColor }]}>{user.tier.toUpperCase()}</Text>
          </View>
        </View>

        {/* Center: Member Info & QR Code preview */}
        <View style={styles.body}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>MEMBER</Text>
            <Text style={styles.memberName} numberOfLines={1}>{user.name}</Text>
            <Text style={styles.memberId}>ID: {user.member_id}</Text>
          </View>

          <View style={styles.qrPreviewWrap}>
            <View style={styles.qrBox}>
              <QRCode value={user.qr_token || user.member_id} size={54} />
            </View>
            <Ionicons name="scan" size={12} color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }} />
          </View>
        </View>

        {/* Bottom Bar: Points & Progress */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.label}>CURRENT BALANCE</Text>
            <Text style={styles.ptsVal}>{user.points.toLocaleString()} <Text style={styles.ptsUnit}>PTS</Text></Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>TIER PROGRESS</Text>
            <Text style={styles.ytdVal}>{user.points_ytd.toLocaleString()} pts YTD</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0E5A3A',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardBg: {
    padding: 22,
    minHeight: 210,
    justify: 'space-between',
    position: 'relative',
  },
  circleBg1: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  circleBg2: {
    position: 'absolute',
    left: -60,
    bottom: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  header: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
  },
  logoImage: {
    width: 140,
    height: 36,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  body: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  memberId: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
  },
  qrPreviewWrap: {
    alignItems: 'center',
  },
  qrBox: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 12,
  },
  ptsVal: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  ptsUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  ytdVal: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});
