import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { adminApi, type Reward } from '@/src/api';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';
import * as ImagePicker from 'expo-image-picker';

const CATEGORIES = ['range', 'course', 'proshop', 'cafe', 'lessons'];

type Editing = Partial<Reward> & { id?: string };

const DEFAULT_NEW: Editing = {
  title: '',
  description: '',
  points_cost: 100,
  category: 'range',
  image_url: 'https://images.unsplash.com/photo-1526323610139-381ca0f77a12?crop=entropy&cs=srgb&fm=jpg&q=80',
  active: true,
  redemption_type: 'qr',
  discount_code: '',
};

export default function AdminRewards() {
  const insets = useSafeAreaInsets();
  const { token: adminToken } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        if (!adminToken) return;
        setUploading(true);
        setError(null);
        try {
          const uploadedUrl = await adminApi.uploadRewardImage(adminToken, pickedUri);
          setEditing((e) => ({ ...e!, image_url: uploadedUrl }));
        } catch (err: any) {
          setError(err.message || 'Failed to upload image');
        } finally {
          setUploading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to launch image picker');
    }
  };

  const load = useCallback(async () => {
    if (!adminToken) return;
    try {
      const list = await adminApi.listRewards(adminToken);
      setRewards(list);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminToken]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const startNew = () => { setError(null); setEditing({ ...DEFAULT_NEW }); };
  const startEdit = (r: Reward) => { setError(null); setEditing({ ...r }); };
  const cancel = () => { setEditing(null); setError(null); };

  const save = async () => {
    if (!adminToken || !editing) return;
    if (!editing.title?.trim() || !editing.description?.trim() || !editing.image_url?.trim()) {
      setError('Title, description, and image URL are required'); return;
    }
    if (editing.redemption_type === 'discount' && !editing.discount_code?.trim()) {
      setError('Discount code is required for discount rewards'); return;
    }
    const cost = Number(editing.points_cost);
    if (!cost || cost <= 0) { setError('Points cost must be > 0'); return; }
    setSaving(true);
    try {
      if (editing.id) {
        await adminApi.updateReward(adminToken, editing.id, {
          title: editing.title, description: editing.description,
          points_cost: cost, category: editing.category!,
          image_url: editing.image_url, active: editing.active ?? true,
          redemption_type: editing.redemption_type ?? 'qr',
          discount_code: editing.redemption_type === 'discount' ? editing.discount_code?.trim() : null,
        });
      } else {
        await adminApi.createReward(adminToken, {
          title: editing.title!, description: editing.description!,
          points_cost: cost, category: editing.category!,
          image_url: editing.image_url!, active: editing.active ?? true,
          redemption_type: editing.redemption_type ?? 'qr',
          discount_code: editing.redemption_type === 'discount' ? editing.discount_code?.trim() : null,
        });
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: Reward) => {
    if (!adminToken) return;
    try {
      await adminApi.updateReward(adminToken, r.id, { active: !r.active });
      await load();
    } catch { /* ignore */ }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View>
          <Text style={styles.eyebrow}>STAFF · CATALOG</Text>
          <Text style={styles.title}>Rewards</Text>
        </View>
        <Pressable testID="add-reward-btn" onPress={startNew} style={styles.addBtn}>
          <Ionicons name="add" size={18} color={theme.color.onBrandPrimary} />
          <Text style={styles.addText}>New</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.color.brandPrimary} /></View>
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md,
            paddingBottom: insets.bottom + 120,
          }}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
          renderItem={({ item }) => (
            <View style={[styles.row, !item.active && styles.rowInactive]} testID={`admin-reward-${item.id}`}>
              <Image source={{ uri: item.image_url }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowCategory}>{item.category.toUpperCase()}</Text>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.rowCost}>{item.points_cost.toLocaleString()} pts</Text>
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => startEdit(item)} testID={`edit-${item.id}`} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={18} color={theme.color.brandPrimary} />
                </Pressable>
                <Pressable
                  onPress={() => toggleActive(item)}
                  testID={`toggle-${item.id}`}
                  style={[styles.iconBtn, item.active ? styles.iconActive : styles.iconInactive]}
                >
                  <Ionicons name={item.active ? 'eye-outline' : 'eye-off-outline'} size={18} color={item.active ? theme.color.accent : theme.color.onSurfaceTertiary} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={cancel} statusBarTranslucent>
        <Pressable style={modalStyles.backdrop} onPress={cancel}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={modalStyles.handle} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
                <Text style={modalStyles.title}>{editing?.id ? 'Edit reward' : 'New reward'}</Text>

                <FormField label="TITLE" value={editing?.title || ''} onChange={(v) => setEditing((e) => ({ ...e!, title: v }))} testID="reward-title" />
                <FormField label="DESCRIPTION" value={editing?.description || ''} onChange={(v) => setEditing((e) => ({ ...e!, description: v }))} multiline testID="reward-description" />
                <FormField label="POINTS COST" value={String(editing?.points_cost ?? '')} onChange={(v) => setEditing((e) => ({ ...e!, points_cost: parseInt(v.replace(/\D/g, ''), 10) || 0 }))} keyboardType="number-pad" testID="reward-cost" />

                <Text style={modalStyles.label}>CATEGORY</Text>
                <View style={modalStyles.chips}>
                  {CATEGORIES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setEditing((e) => ({ ...e!, category: c }))}
                      style={[modalStyles.chip, editing?.category === c && modalStyles.chipActive]}
                      testID={`cat-${c}`}
                    >
                      <Text style={[modalStyles.chipText, editing?.category === c && modalStyles.chipTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={modalStyles.label}>REDEMPTION TYPE</Text>
                <View style={modalStyles.chips}>
                  <Pressable
                    onPress={() => setEditing((e) => ({ ...e!, redemption_type: 'qr' }))}
                    style={[modalStyles.chip, (editing?.redemption_type ?? 'qr') === 'qr' && modalStyles.chipActive]}
                    testID="type-qr"
                  >
                    <Text style={[modalStyles.chipText, (editing?.redemption_type ?? 'qr') === 'qr' && modalStyles.chipTextActive]}>
                      QR Code (Scanned by Admin)
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditing((e) => ({ ...e!, redemption_type: 'discount' }))}
                    style={[modalStyles.chip, editing?.redemption_type === 'discount' && modalStyles.chipActive]}
                    testID="type-discount"
                  >
                    <Text style={[modalStyles.chipText, editing?.redemption_type === 'discount' && modalStyles.chipTextActive]}>
                      Discount Code (Static Voucher)
                    </Text>
                  </Pressable>
                </View>

                {editing?.redemption_type === 'discount' ? (
                  <FormField
                    label="DISCOUNT CODE"
                    value={editing?.discount_code || ''}
                    onChange={(v) => setEditing((e) => ({ ...e!, discount_code: v }))}
                    testID="reward-discount-code"
                  />
                ) : null}

                <Text style={modalStyles.label}>REWARD IMAGE</Text>
                <View style={modalStyles.imageUploadContainer}>
                  {editing?.image_url ? (
                    <View style={modalStyles.previewContainer}>
                      <Image source={{ uri: editing.image_url }} style={modalStyles.imagePreview} contentFit="cover" />
                      <Pressable
                        onPress={() => setEditing((e) => ({ ...e!, image_url: '' }))}
                        style={modalStyles.removeBtn}
                      >
                        <Ionicons name="trash" size={16} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={pickImage}
                    disabled={uploading}
                    style={({ pressed }) => [
                      modalStyles.uploadBtn,
                      pressed && { opacity: 0.8 },
                      uploading && { backgroundColor: theme.color.surfaceTertiary }
                    ]}
                    testID="reward-image-upload"
                  >
                    {uploading ? (
                      <View style={modalStyles.uploadInner}>
                        <ActivityIndicator color={theme.color.brandPrimary} size="small" />
                        <Text style={modalStyles.uploadText}>Uploading image...</Text>
                      </View>
                    ) : (
                      <View style={modalStyles.uploadInner}>
                        <Ionicons name="cloud-upload-outline" size={20} color={theme.color.brandPrimary} />
                        <Text style={modalStyles.uploadText}>
                          {editing?.image_url ? 'Choose another image' : 'Upload image from library'}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                {error ? <Text style={modalStyles.error}>{error}</Text> : null}

                <View style={modalStyles.actionsRow}>
                  <Pressable onPress={cancel} style={[modalStyles.btn, modalStyles.btnGhost]} testID="cancel-edit">
                    <Text style={modalStyles.btnGhostText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={save} disabled={saving} style={[modalStyles.btn, modalStyles.btnPrimary]} testID="save-reward">
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={modalStyles.btnPrimaryText}>{editing?.id ? 'Save' : 'Create'}</Text>}
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

function FormField({
  label, value, onChange, keyboardType, multiline, testID,
}: { label: string; value: string; onChange: (v: string) => void; keyboardType?: any; multiline?: boolean; testID?: string }) {
  return (
    <>
      <Text style={modalStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[modalStyles.input, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
        placeholderTextColor="rgba(255, 255, 255, 0.3)"
        testID={testID}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060B08' },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    backgroundColor: '#060B08',
  },
  eyebrow: { color: '#E6C25F', letterSpacing: 1.5, fontSize: 10, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#0E5A3A',
    borderRadius: theme.radius.pill,
  },
  addText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  row: {
    flexDirection: 'row', gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#0F1512',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  rowInactive: { opacity: 0.4 },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#1C2521' },
  rowCategory: { color: '#E6C25F', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  rowTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 2 },
  rowCost: { color: '#7B8E85', fontSize: 12, marginTop: 2, fontWeight: '600' },
  actions: { gap: 6 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconActive: { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
  iconInactive: { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6, 11, 8, 0.85)' },
  sheet: {
    backgroundColor: '#0F1512',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: theme.spacing.xl,
    maxHeight: '92%',
  },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.12)', alignSelf: 'center', marginBottom: theme.spacing.md },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginBottom: theme.spacing.sm },
  label: { color: '#E6C25F', fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginTop: theme.spacing.md, marginBottom: 6 },
  input: {
    backgroundColor: '#151E19',
    borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1,
    borderRadius: theme.radius.md,
    color: '#FFFFFF', fontSize: 14,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#151E19',
  },
  chipActive: { backgroundColor: '#0E5A3A', borderColor: '#0E5A3A' },
  chipText: { color: '#7B8E85', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  error: { marginTop: 10, color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', borderRadius: theme.radius.md, padding: 10, fontSize: 12 },

  actionsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  btn: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: '#1A231F', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  btnGhostText: { color: '#7B8E85', fontWeight: '700', fontSize: 14 },
  btnPrimary: { backgroundColor: '#0E5A3A' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  imageUploadContainer: {
    marginTop: 6,
    gap: 12,
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 18,
    backgroundColor: '#151E19',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    color: '#E6C25F',
    fontSize: 13,
    fontWeight: '700',
  },
});
