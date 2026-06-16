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
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} testID="qr-modal-backdrop">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} testID="qr-modal-close" hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.color.onSurfaceSecondary} />
            </Pressable>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <View style={styles.qrCard} testID="qr-canvas">
            <QRCode
              value={value || 'playgolf'}
              size={220}
              backgroundColor="#FFFFFF"
              color={theme.color.brandPrimary}
            />
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>SCAN CODE</Text>
            <Text style={styles.code} selectable testID="qr-value">
              {value}
            </Text>
          </View>

          {footer ? <Text style={styles.footer}>{footer}</Text> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,27,22,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color.borderStrong,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: {
    color: theme.color.onSurface,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.color.surfaceTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  subtitle: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  qrCard: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.lg,
    borderRadius: 24,
    marginTop: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  codeBox: {
    marginTop: theme.spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.color.brandTertiary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  codeLabel: {
    color: theme.color.brandPrimary,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 4,
  },
  code: {
    color: theme.color.brandPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    color: theme.color.onSurfaceTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 18,
  },
});
