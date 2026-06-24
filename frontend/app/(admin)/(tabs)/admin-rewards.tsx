import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { adminApi, type Reward } from '@/src/api';
import { useAdminAuth } from '@/src/admin-auth';
import { theme } from '@/src/theme';

const CATEGORIES = ['range', 'course', 'proshop', 'cafe', 'lessons'];

type Editing = Partial<Reward> & { id?: string };

const DEFAULT_NEW: Editing = {
  title: '',
  description: '',
  points_cost: 100,
  category: 'range',
  image_url: 'https://images.unsplash.com/photo-1526323610139-381ca0f77a12?crop=entropy&cs=srgb&fm=jpg&q=80',
  active: true,
};

export default function AdminRewards() {
  const insets = useSafeAreaInsets();
  const { adminToken } = useAdminAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const cost = Number(editing.points_cost);
    if (!cost || cost <= 0) { setError('Points cost must be > 0'); return; }
    setSaving(true);
    try {
      if (editing.id) {
        await adminApi.updateReward(adminToken, editing.id, {
          title: editing.title, description: editing.description,
          points_cost: cost, category: editing.category!,
          image_url: editing.image_url, active: editing.active ?? true,
        });
      } else {
        await adminApi.createReward(adminToken, {
          title: editing.title!, description: editing.description!,
          points_cost: cost, category: editing.category!,
          image_url: editing.image_url!, active: editing.active ?? true,
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

              <FormField label="IMAGE URL" value={editing?.image_url || ''} onChange={(v) => setEditing((e) => ({ ...e!, image_url: v }))} testID="reward-image" />

              {error ? <Text style={modalStyles.error}>{error}</Text> : null}

              <View style={modalStyles.actionsRow}>
                <Pressable onPress={cancel} style={[modalStyles.btn, modalStyles.btnGhost]} testID="cancel-edit">
                  <Text style={modalStyles.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={save} disabled={saving} style={[modalStyles.btn, modalStyles.btnPrimary]} testID="save-reward">
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={modalStyles.btnPrimaryText}>{editing?.id ? 'Save' : 'Create'}</Text>}
                </Pressable>
              </View>
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
        placeholderTextColor={theme.color.onSurfaceTertiary}
        testID={testID}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    backgroundColor: theme.color.surface,
  },
  eyebrow: { color: theme.color.brandPrimary, letterSpacing: 1.5, fontSize: 10, fontWeight: '700' },
  title: { color: theme.color.onSurface, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
  },
  addText: { color: theme.color.onBrandPrimary, fontSize: 13, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  row: {
    flexDirection: 'row', gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: theme.color.border,
    alignItems: 'center',
  },
  rowInactive: { opacity: 0.55 },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: theme.color.surfaceTertiary },
  rowCategory: { color: theme.color.brandPrimary, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  rowTitle: { color: theme.color.onSurface, fontSize: 14, fontWeight: '700', marginTop: 2 },
  rowCost: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 2, fontWeight: '600' },
  actions: { gap: 6 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.color.brandTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  iconActive: { backgroundColor: theme.color.accentSoft },
  iconInactive: { backgroundColor: theme.color.surfaceTertiary },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,22,0.55)' },
  sheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: theme.spacing.xl,
    maxHeight: '92%',
  },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: theme.color.borderStrong, alignSelf: 'center', marginBottom: theme.spacing.md },
  title: { color: theme.color.onSurface, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginBottom: theme.spacing.sm },
  label: { color: theme.color.brandPrimary, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginTop: theme.spacing.md, marginBottom: 6 },
  input: {
    backgroundColor: theme.color.surfaceSecondary,
    borderColor: theme.color.border, borderWidth: 1,
    borderRadius: theme.radius.md,
    color: theme.color.onSurface, fontSize: 14,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSecondary,
  },
  chipActive: { backgroundColor: theme.color.brandPrimary, borderColor: theme.color.brandPrimary },
  chipText: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  error: { marginTop: 10, color: theme.color.error, backgroundColor: '#FBE8E8', borderWidth: 1, borderColor: '#F0C5C5', borderRadius: theme.radius.md, padding: 10, fontSize: 12 },

  actionsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  btn: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  btnGhostText: { color: theme.color.onSurface, fontWeight: '700', fontSize: 14 },
  btnPrimary: { backgroundColor: theme.color.brandPrimary },
  btnPrimaryText: { color: theme.color.onBrandPrimary, fontWeight: '800', fontSize: 14 },
});
