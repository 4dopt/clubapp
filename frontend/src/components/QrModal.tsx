import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Image } from 'expo-image';
import { theme } from '../theme';
import type { User } from '../api';

interface Props {
  visible: boolean;
  onClose: () => void;
  user: User | null;
}

export function QrModal({ visible, onClose, user }: Props) {
  if (!user) return null;

  const qrValue = user.member_id || user.qr_token || 'PG-100234';
  const qrImageUri = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrValue)}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Member Digital Pass</Text>
            <Pressable testID="close-qr-modal" onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.color.onSurfaceSecondary} />
            </Pressable>
          </View>

          <View style={styles.qrContainer}>
            <View style={styles.qrFrame}>
              {Platform.OS === 'web' ? (
                <Image source={{ uri: qrImageUri }} style={{ width: 220, height: 220 }} contentFit="contain" />
              ) : (
                <QRCode value={qrValue} size={220} />
              )}
            </View>
          </View>

          <View style={styles.meta}>
            <Text style={styles.name}>{user.name || 'Member'}</Text>
            <Text style={styles.sub}>Member ID: {user.member_id || 'PG-100234'}</Text>
            <Text style={styles.hint}>
              Show this QR code to the staff at the range or clubhouse to check in and earn points.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  sheet: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.color.onSurface,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.color.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.lg,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  qrFrame: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
  },
  meta: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  name: {
    color: theme.color.onSurface,
    fontSize: 20,
    fontWeight: '800',
  },
  sub: {
    color: theme.color.brandPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 1,
  },
  hint: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
});
