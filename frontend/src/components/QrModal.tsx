import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  value: string;
  title: string;
  subtitle?: string;
  footer?: string;
};

export function QrModal({ visible, onClose, value, title, subtitle, footer }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} testID="qr-modal-backdrop">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} testID="qr-modal-close" hitSlop={12}>
              <Ionicons name="close" size={22} color={theme.color.onSurfaceSecondary} />
            </Pressable>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <View style={styles.qrCard} testID="qr-canvas">
            <QRCode
              value={value || 'playgolf'}
              size={220}
              backgroundColor="#EAECE8"
              color="#0E1210"
            />
          </View>

          <Text style={styles.code} selectable testID="qr-value">
            {value}
          </Text>
          {footer ? <Text style={styles.footer}>{footer}</Text> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.color.surfaceSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color.borderStrong,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontSize: 26,
  },
  subtitle: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  qrCard: {
    alignSelf: 'center',
    backgroundColor: theme.color.surfaceInverse,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing.xl,
  },
  code: {
    color: theme.color.brandPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    fontSize: 18,
    marginTop: theme.spacing.lg,
  },
  footer: {
    color: theme.color.onSurfaceTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 18,
  },
});
