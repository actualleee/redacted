import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius } from '../../../theme';
import { SexLogs, DailyLogs } from '../../../db/queries';

export default function QuickLogFAB({ date, onLogged, accent }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [note, setNote] = useState('');
  const [bbt, setBbt] = useState('');
  const [sexProtected, setSexProtected] = useState(true);
  const c = accent || colors.primary;

  async function logSex() { await SexLogs.add(date, { protected: sexProtected ? 1 : 0 }); close(); onLogged?.(); }
  async function logNote() { if (!note.trim()) return; await DailyLogs.update(date, { notes: note.trim() }); close(); onLogged?.(); }
  async function logBBT() { const t = parseFloat(bbt); if (isNaN(t)) return; await DailyLogs.update(date, { bbt: t }); close(); onLogged?.(); }
  function close() { setOpen(false); setMode(null); setNote(''); setBbt(''); }

  return (
    <>
      <TouchableOpacity style={[styles.fab, { backgroundColor: c }]} onPress={() => setOpen(true)}>
        <Text style={styles.fabText}>+ Log</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close} />
          <View style={styles.sheet}>
            {!mode ? (
              <>
                <Text style={styles.sheetTitle}>Quick Log</Text>
                {[
                  { key: 'sex', emoji: '🌿', label: 'Sexual activity' },
                  { key: 'note', emoji: '📝', label: 'Add note' },
                  { key: 'bbt', emoji: '🌡', label: 'Basal body temp' },
                ].map(item => (
                  <TouchableOpacity key={item.key} style={styles.option} onPress={() => setMode(item.key)}>
                    <Text style={styles.optionEmoji}>{item.emoji}</Text>
                    <Text style={styles.optionLabel}>{item.label}</Text>
                    <Text style={styles.optionArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : mode === 'sex' ? (
              <>
                <Text style={styles.sheetTitle}>Sexual activity</Text>
                <View style={styles.toggleRow}>
                  {['Protected', 'Unprotected'].map((label, i) => (
                    <TouchableOpacity key={label}
                      style={[styles.toggleBtn, (i === 0) === sexProtected && { borderColor: c, backgroundColor: c + '22' }]}
                      onPress={() => setSexProtected(i === 0)}>
                      <Text style={[styles.toggleText, (i === 0) === sexProtected && { color: c }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c }]} onPress={logSex}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </>
            ) : mode === 'note' ? (
              <>
                <Text style={styles.sheetTitle}>Note</Text>
                <TextInput style={styles.input} value={note} onChangeText={setNote}
                  placeholder="How are you feeling today?" placeholderTextColor={colors.textMuted} multiline autoFocus />
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c }]} onPress={logNote}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </>
            ) : mode === 'bbt' ? (
              <>
                <Text style={styles.sheetTitle}>Basal Body Temp</Text>
                <Text style={styles.sheetSub}>Take before getting up. Enter in °C.</Text>
                <TextInput style={[styles.input, { textAlign: 'center', fontSize: 32 }]} value={bbt} onChangeText={setBbt}
                  placeholder="36.5" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" autoFocus />
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c }]} onPress={logBBT}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity onPress={close} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{mode ? '← Back' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  fab: { position: 'absolute', bottom: 24, right: 24, borderRadius: radius.full, paddingHorizontal: 28, paddingVertical: 14, elevation: 6 },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  overlay: { flex: 1 },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.md },
  sheetSub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionEmoji: { fontSize: 22, marginRight: spacing.md },
  optionLabel: { flex: 1, fontSize: 16, color: colors.textPrimary },
  optionArrow: { fontSize: 20, color: colors.textMuted },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggleBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  toggleText: { fontSize: 15, color: colors.textSecondary },
  input: { backgroundColor: colors.bgInput, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: colors.border, minHeight: 80, marginBottom: spacing.lg },
  saveBtn: { borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', padding: spacing.sm },
  cancelText: { color: colors.textMuted, fontSize: 14 },
});
