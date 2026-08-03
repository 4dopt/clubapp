import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/src/theme';

export default function Booking() {
  const insets = useSafeAreaInsets();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const slots = ['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM'];

  const book = () => {
    if (!selectedSlot) return;
    Alert.alert('Booking Confirmed', `Tee time reserved for Today at ${selectedSlot}.`);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + 100, paddingHorizontal: theme.spacing.lg }}>
        <Text style={styles.eyebrow}>TEE TIMES & BAY RESERVATIONS</Text>
        <Text style={styles.title}>Book a Session</Text>
        <Text style={styles.sub}>Select your preferred slot for the driving range or 18-hole championship course.</Text>

        <Text style={styles.label}>TODAY'S AVAILABLE SLOTS</Text>
        <View style={styles.grid}>
          {slots.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSelectedSlot(s)}
              style={[styles.slotCard, selectedSlot === s && styles.slotCardActive]}
            >
              <Ionicons name="time-outline" size={16} color={selectedSlot === s ? '#FFFFFF' : theme.color.brandPrimary} />
              <Text style={[styles.slotText, selectedSlot === s && styles.slotTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={book}
          disabled={!selectedSlot}
          style={({ pressed }) => [styles.btn, !selectedSlot && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.btnText}>Reserve Tee Time</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  eyebrow: { color: theme.color.brandPrimary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: theme.color.onSurface, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 14, marginTop: 6 },
  label: { color: theme.color.brandPrimary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  grid: { gap: 10 },
  slotCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border,
    padding: 16, borderRadius: theme.radius.md,
  },
  slotCardActive: { backgroundColor: theme.color.brandPrimary, borderColor: theme.color.brandPrimary },
  slotText: { color: theme.color.onSurface, fontWeight: '700', fontSize: 15 },
  slotTextActive: { color: '#FFFFFF' },
  btn: {
    marginTop: theme.spacing.xl, backgroundColor: theme.color.brandPrimary,
    paddingVertical: 16, borderRadius: theme.radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
