import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adminApi, type User, type RewardRedemption } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme, tierMeta } from '@/src/theme';

export default function AdminMemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token: adminToken } = useAuth();

  const [member, setMember] = useState<User | null>(null);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!adminToken || !id) return;
    try {
      const data = await adminApi.getMemberDetail(adminToken, id);
      setMember(data.user);
      setRedemptions(data.redemptions);
    } catch (e: any) {
      setError(e.message || 'Member not found');
    } finally {
      setLoading(false);
    }
  }, [adminToken, id]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logVisit = async () => {
    if (!adminToken || !member) return;
    try {
      const res = await adminApi.logVisit(adminToken, member.member_id);
      Alert.alert('Visit Logged', `+100 pts added for ${res.member_name}`);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to log visit');
    }
  };

  const submitAdjust = async () => {
    if (!adminToken || !id) return;
    const num = parseInt(delta, 10);
    if (isNaN(num) || num === 0) {
      setError('Enter a non-zero integer (e.g. +500 or -200)');
      return;
    }
    if (!reason.trim()) {
      setError('A brief reason is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.adjustPoints(adminToken, id, num, reason.trim());
      setAdjustModal(false);
      setDelta('');
      setReason('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fulfillRedemption = async (redemptionId: string) => {
    if (!adminToken) return;
    try {
      await adminApi.fulfillRedemption(adminToken, redemptionId);
      await load();
    } catch (e: any) {
      Alert.alert('Fulfillment Failed', e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerRoot}>
        <ActivityIndicator color="#E6C25F" size="large" />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.centerRoot}>
        <Text style={{ color: '#FFFFFF', fontSize: 16 }}>{error || 'Member not found'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back to Members</Text>
        </Pressable>
      </View>
    );
  }

  const meta = tierMeta[member.tier];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom + 100 }}>
        {/* Top Navigation */}
        <Pressable onPress={() => router.back()} style={styles.topBack} testID="admin-member-back">
          <Ionicons name="arrow-back" size={20} color="#E6C25F" />
          <Text style={styles.topBackText}>Members</Text>
        </Pressable>

        {/* Member Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarBigText}>{member.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberSub}>{member.email} · ID {member.member_id}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.tierPill, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
              <Text style={[styles.tierText, { color: meta.badgeColor }]}>{member.tier} Tier</Text>
            </View>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{member.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>POINTS BALANCE</Text>
            <Text style={styles.statVal}>{member.points.toLocaleString()}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TIER PROGRESS</Text>
            <Text style={styles.statVal}>{member.points_ytd.toLocaleString()} pts</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable onPress={logVisit} style={[styles.actionBtn, styles.btnPrimary]} testID="admin-log-visit-btn">
            <Ionicons name="location" size={16} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>Log Visit (+100)</Text>
          </Pressable>

          <Pressable onPress={() => { setError(null); setAdjustModal(true); }} style={[styles.actionBtn, styles.btnSecondary]} testID="admin-adjust-points-btn">
            <Ionicons name="swap-vertical" size={16} color="#E6C25F" />
            <Text style={styles.btnSecondaryText}>Adjust Pts</Text>
          </Pressable>
        </View>

        {/* Redemptions & Activity Section */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>PENDING REDEMPTIONS</Text>
          {redemptions.length === 0 ? (
            <Text style={styles.emptyText}>No redemption history</Text>
          ) : (
            redemptions.map((r) => (
              <View key={r.id} style={styles.redemptionCard} testID={`redemption-card-${r.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.redTitle}>{r.reward_title}</Text>
                  <Text style={styles.redSub}>
                    Cost: {r.points_cost} pts · Code: {r.discount_code || 'QR'}
                  </Text>
                  <Text style={[styles.statusText, r.fulfilled ? styles.fulfilled : styles.pending]}>
                    {r.fulfilled ? 'FULFILLED' : 'PENDING'}
                  </Text>
                </View>

                {!r.fulfilled ? (
                  <Pressable
                    onPress={() => fulfillRedemption(r.id)}
                    style={styles.fulfillBtn}
                    testID={`fulfill-btn-${r.id}`}
                  >
                    <Text style={styles.fulfillText}>Fulfill</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Point Adjustment Modal */}
      <Modal visible={adjustModal} transparent animationType="slide" onRequestClose={() => setAdjustModal(false)} statusBarTranslucent>
        <Pressable style={styles.modalBackdrop} onPress={() => setAdjustModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Adjust Points for {member.name}</Text>
            <Text style={styles.modalSub}>Use positive numbers to add, negative numbers to deduct.</Text>

            <Text style={styles.fieldLabel}>POINTS DELTA (+/-)</Text>
            <TextInput
              value={delta}
              onChangeText={setDelta}
              placeholder="e.g. 500 or -250"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numbers-and-punctuation"
              style={styles.modalInput}
              testID="adjust-pts-delta-input"
            />

            <Text style={styles.fieldLabel}>REASON / NOTES</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Tournament winner, Range pass refund"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.modalInput}
              testID="adjust-pts-reason-input"
            />

            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setAdjustModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable onPress={submitAdjust} disabled={submitting} style={styles.modalSave} testID="submit-adjust-pts-btn">
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSaveText}>Apply Adjustment</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060B08' },
  centerRoot: { flex: 1, backgroundColor: '#060B08', alignItems: 'center', justifyContent: 'center', padding: 24 },
  topBack: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: theme.spacing.lg, paddingVertical: 8 },
  topBackText: { color: '#E6C25F', fontSize: 14, fontWeight: '700' },

  profileHeader: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  avatarBig: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#18241F', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarBigText: { color: '#E6C25F', fontSize: 28, fontWeight: '800' },
  memberName: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  memberSub: { color: '#7B8E85', fontSize: 13, marginTop: 4 },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tierPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: theme.radius.pill, borderWidth: 1 },
  tierText: { fontSize: 11, fontWeight: '700' },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill, backgroundColor: 'rgba(255,255,255,0.06)' },
  roleText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 12, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md },
  statBox: { flex: 1, backgroundColor: '#0F1512', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statLabel: { color: '#7B8E85', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  statVal: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 12, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: theme.radius.pill },
  btnPrimary: { backgroundColor: '#0E5A3A' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  btnSecondary: { backgroundColor: '#151E19', borderWidth: 1, borderColor: 'rgba(230,194,95,0.3)' },
  btnSecondaryText: { color: '#E6C25F', fontWeight: '700', fontSize: 13 },

  sectionWrap: { marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl },
  sectionTitle: { color: '#7B8E85', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontStyle: 'italic' },
  redemptionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1512', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  redTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  redSub: { color: '#7B8E85', fontSize: 12, marginTop: 2 },
  statusText: { fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  pending: { color: '#F59E0B' },
  fulfilled: { color: '#10B981' },
  fulfillBtn: { backgroundColor: '#0E5A3A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radius.pill },
  fulfillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  backBtn: { marginTop: 16, backgroundColor: '#0E5A3A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.pill },
  backBtnText: { color: '#FFFFFF', fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(6,11,8,0.85)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0F1512', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  modalSub: { color: '#7B8E85', fontSize: 12, marginTop: 4 },
  fieldLabel: { color: '#E6C25F', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 16, marginBottom: 6 },
  modalInput: { backgroundColor: '#151E19', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: theme.radius.md, color: '#FFFFFF', padding: 12, fontSize: 14 },
  modalError: { color: '#EF4444', fontSize: 12, marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: '#18241F' },
  modalCancelText: { color: '#7B8E85', fontWeight: '700' },
  modalSave: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: '#0E5A3A' },
  modalSaveText: { color: '#FFFFFF', fontWeight: '800' },
});
