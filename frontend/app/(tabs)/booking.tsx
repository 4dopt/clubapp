import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { theme } from '@/src/theme';
import { QrModal } from '@/src/components/QrModal';

type Activity = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  location: string;
  info: string;
};

const ACTIVITIES: Activity[] = [
  {
    id: 'range',
    title: 'Driving Range',
    description: 'Practice your swing at our premier floodlit range with premium golf balls.',
    imageUrl: 'https://images.unsplash.com/photo-1526323610139-381ca0f77a12?crop=entropy&cs=srgb&fm=jpg&q=85',
    location: 'South Range Bays 1-20',
    info: 'Earn 150 pts on check-in',
  },
  {
    id: 'course',
    title: 'Golf Course',
    description: 'Book tee times for a premium 9 or 18 hole round on our championship fairway.',
    imageUrl: 'https://images.unsplash.com/photo-1561251224-e393160cd769?crop=entropy&cs=srgb&fm=jpg&q=85',
    location: 'Main Clubhouse Tee 1',
    info: 'Championship Course',
  },
  {
    id: 'darts',
    title: 'Interactive Darts',
    description: 'Play dart games with digital scoring in our social darts lounge with food & drinks.',
    imageUrl: 'https://images.unsplash.com/photo-1601646761285-65bfa67cd7a3?crop=entropy&cs=srgb&fm=jpg&q=85',
    location: 'The Spike Bar Lounge',
    info: '4 Social Bays',
  },
  {
    id: 'minigolf',
    title: 'MiniGolf',
    description: 'Enjoy our fun-filled 18-hole adventure putting course with friends and family.',
    imageUrl: 'https://images.unsplash.com/photo-1594589254010-098555e288c2?crop=entropy&cs=srgb&fm=jpg&q=85',
    location: 'West Greens Garden',
    info: '18-Hole Adventure',
  },
];

const DATES = [
  { label: 'Today', value: 'Today, Jun 19' },
  { label: 'Tomorrow', value: 'Tomorrow, Jun 20' },
  { label: 'Sunday', value: 'Sunday, Jun 21' },
];

const TIMES = ['09:00 AM', '10:30 AM', '01:00 PM', '03:30 PM', '06:00 PM', '08:30 PM'];

export default function BookingScreen() {
  const insets = useSafeAreaInsets();

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedDate, setSelectedDate] = useState(DATES[0].value);
  const [selectedTime, setSelectedTime] = useState(TIMES[0]);
  const [players, setPlayers] = useState(2);
  const [confirming, setConfirming] = useState(false);
  const [bookingCode, setBookingCode] = useState<string | null>(null);

  const handleSelectActivity = (activity: Activity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedActivity(activity);
    setSelectedDate(DATES[0].value);
    setSelectedTime(TIMES[0]);
    setPlayers(2);
  };

  const handleConfirm = async () => {
    if (!selectedActivity) return;
    setConfirming(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Simulate booking API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const randomCode = 'PG-RES-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setBookingCode(randomCode);
    setConfirming(false);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text style={styles.eyebrow}>RESERVATIONS</Text>
        <Text style={styles.title}>Book a Session</Text>
        <Text style={styles.sub}>Reserve your spot for range, course, darts, or minigolf</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + 120 }}>
        <View style={styles.cardsContainer}>
          {ACTIVITIES.map((activity) => (
            <Pressable
              key={activity.id}
              testID={`booking-card-${activity.id}`}
              style={({ pressed }) => [styles.activityCard, pressed && styles.cardPressed]}
              onPress={() => handleSelectActivity(activity)}
            >
              <Image source={{ uri: activity.imageUrl }} style={styles.cardImage} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(15, 27, 22, 0.95)']}
                style={styles.gradientOverlay}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{activity.title}</Text>
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>{activity.info}</Text>
                  </View>
                </View>
                <Text style={styles.cardDescription} numberOfLines={2}>{activity.description}</Text>
                
                <View style={styles.cardFooter}>
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={14} color={theme.color.gold} />
                    <Text style={styles.locationText}>{activity.location}</Text>
                  </View>
                  <View style={styles.reserveBtn}>
                    <Text style={styles.reserveBtnText}>Reserve</Text>
                    <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Booking Form Modal */}
      <Modal
        visible={selectedActivity !== null && !bookingCode}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedActivity(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedActivity(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            
            {selectedActivity && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalEyebrow}>BOOKING FOR</Text>
                    <Text style={styles.modalTitle}>{selectedActivity.title}</Text>
                  </View>
                  <Pressable
                    testID="close-booking-modal"
                    onPress={() => setSelectedActivity(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={theme.color.onSurfaceSecondary} />
                  </Pressable>
                </View>

                {/* Date Selection */}
                <Text style={styles.modalSectionLabel}>CHOOSE DATE</Text>
                <View style={styles.chipsRow}>
                  {DATES.map((d) => {
                    const isSelected = selectedDate === d.value;
                    return (
                      <Pressable
                        key={d.value}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedDate(d.value);
                        }}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {d.label}
                        </Text>
                        <Text style={[styles.chipSubText, isSelected && styles.chipSubTextSelected]}>
                          {d.value.split(', ')[1]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Time Selection */}
                <Text style={styles.modalSectionLabel}>CHOOSE TIME</Text>
                <View style={styles.timesGrid}>
                  {TIMES.map((t) => {
                    const isSelected = selectedTime === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedTime(t);
                        }}
                        style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                      >
                        <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                          {t}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Players Selection */}
                <Text style={styles.modalSectionLabel}>NUMBER OF PLAYERS</Text>
                <View style={styles.playersContainer}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPlayers(Math.max(1, players - 1));
                    }}
                    style={styles.playerBtn}
                  >
                    <Ionicons name="remove" size={20} color={theme.color.brandPrimary} />
                  </Pressable>
                  <View style={styles.playerCountBox}>
                    <Text style={styles.playerCountText}>{players}</Text>
                    <Text style={styles.playerCountLabel}>{players === 1 ? 'Player' : 'Players'}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPlayers(Math.min(4, players + 1));
                    }}
                    style={styles.playerBtn}
                  >
                    <Ionicons name="add" size={20} color={theme.color.brandPrimary} />
                  </Pressable>
                </View>

                {/* Confirm CTA */}
                <Pressable
                  testID="confirm-booking-btn"
                  disabled={confirming}
                  onPress={handleConfirm}
                  style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.9 }]}
                >
                  {confirming ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.confirmBtnText}>Confirm Reservation</Text>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reservation Code Modal */}
      {selectedActivity && (
        <QrModal
          visible={!!bookingCode}
          onClose={() => {
            setBookingCode(null);
            setSelectedActivity(null);
          }}
          value={bookingCode || ''}
          title="Reservation Confirmed"
          subtitle={`${selectedActivity.title} · ${players} ${players === 1 ? 'player' : 'players'}`}
          footer={`${selectedDate} at ${selectedTime}\nLocation: ${selectedActivity.location}\n\nPresent this QR to staff when checking in at the club.`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.color.surface,
  },
  eyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  title: {
    color: theme.color.onSurface,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  sub: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  cardsContainer: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  activityCard: {
    height: 190,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
  },
  cardPressed: { transform: [{ scale: 0.99 }] },
  cardImage: { ...StyleSheet.absoluteFillObject },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  cardContent: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: theme.spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  infoBadge: {
    backgroundColor: theme.color.brandTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoBadgeText: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  cardDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: theme.spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: theme.spacing.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: theme.color.onSurfaceInverse,
    fontSize: 11,
    fontWeight: '600',
  },
  reserveBtn: {
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reserveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,27,22,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color.borderStrong,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  modalEyebrow: {
    color: theme.color.onSurfaceTertiary,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  modalTitle: {
    color: theme.color.onSurface,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.color.surfaceTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSectionLabel: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: theme.color.brandTertiary,
    borderColor: theme.color.brandPrimary,
  },
  chipText: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: theme.color.brandPrimary,
  },
  chipSubText: {
    color: theme.color.onSurfaceTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  chipSubTextSelected: {
    color: theme.color.brandPrimary,
    fontWeight: '600',
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  timeChip: {
    width: '31%',
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timeChipSelected: {
    backgroundColor: theme.color.brandPrimary,
    borderColor: theme.color.brandPrimary,
  },
  timeChipText: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
  },
  playersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xl,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingVertical: 12,
  },
  playerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.color.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCountBox: {
    alignItems: 'center',
    width: 80,
  },
  playerCountText: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.color.onSurface,
  },
  playerCountLabel: {
    fontSize: 10,
    color: theme.color.onSurfaceSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: theme.spacing.xl,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
