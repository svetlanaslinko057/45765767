/**
 * Global Settings — lite version
 *
 * Goals (per Feb-2026 spec):
 *   • Real two-language switch (English / Русский) that takes effect immediately
 *     across screens that consume `useT()`. Persisted to AsyncStorage and to
 *     backend (`PATCH /account/me { language }`) when authed.
 *   • Real 2FA toggle wired to `account_layer` endpoints
 *     (`POST /account/me/2fa/enable`, `…/disable/request`, `…/disable/confirm`).
 *   • Theme choice (dark/light) — UI preference saved; full light-render lands
 *     in next release, so we surface a clear notice when light is picked.
 *   • Account utilities — export & delete are surfaced but routed via support
 *     until the destructive flow has full backend coverage.
 */
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../src/theme';
import { useTheme } from '../src/theme-context';
import { useMe } from '../src/use-me';
import { useT, LangCode } from '../src/i18n';
import api from '../src/api';

export default function Settings() {
  const router = useRouter();
  const { me, refresh } = useMe();
  const { t, lang, setLang, langs } = useT();
  const { theme, setTheme } = useTheme();

  // ---- 2FA state (real backend) ----
  const [twoFA, setTwoFA] = useState<boolean>(false);
  const [twoFABusy, setTwoFABusy] = useState(false);
  const [otpModal, setOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/account/me');
        setTwoFA(!!r.data?.two_factor_enabled);
      } catch {/* unauth — leave default */}
    })();
  }, []);

  const updateTheme = async (next: 'dark' | 'light') => {
    // ThemeProvider owns persistence (AsyncStorage `atlas-theme`) and the
    // palette swap. `key={theme}` inside the provider forces every
    // StyleSheet.create() in the subtree to rebuild with the new colours,
    // so we don't need any remount logic here.
    await setTheme(next);
  };

  const updateLang = async (code: LangCode) => {
    await setLang(code);
  };

  // ---- 2FA flow ----
  const onTwoFAToggle = async (next: boolean) => {
    if (twoFABusy) return;
    if (next === twoFA) return;
    setTwoFABusy(true);
    try {
      if (next) {
        await api.post('/account/me/2fa/enable');
        setTwoFA(true);
        Alert.alert(t('settings.twofa'), t('settings.twofa_on'));
      } else {
        // Disabling requires OTP confirmation.
        const r = await api.post('/account/me/2fa/disable/request');
        const dev = r?.data?.dev_code || null;
        setOtpDevCode(dev);
        setOtpCode('');
        setOtpModal(true);
      }
    } catch (e: any) {
      Alert.alert(t('error.generic'), e?.response?.data?.detail || String(e));
    } finally {
      setTwoFABusy(false);
    }
  };

  const confirmDisable = async () => {
    if (!otpCode.trim()) return;
    setOtpSubmitting(true);
    try {
      await api.post('/account/me/2fa/disable/confirm', { code: otpCode.trim() });
      setTwoFA(false);
      setOtpModal(false);
      setOtpCode('');
      setOtpDevCode(null);
      Alert.alert(t('settings.twofa'), t('settings.twofa_off'));
    } catch (e: any) {
      Alert.alert(t('error.generic'), e?.response?.data?.detail || String(e));
    } finally {
      setOtpSubmitting(false);
    }
  };

  const initial = (me?.name || me?.email || 'U').charAt(0).toUpperCase();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('settings.title'),
          headerStyle: { backgroundColor: T.bg },
          headerTitleStyle: { color: T.text },
          headerTintColor: T.text,
        }}
      />
      <ScrollView style={s.container} contentContainerStyle={s.content} testID="settings-screen">
        {/* Identity */}
        <Text style={s.section}>{t('settings.section.identity')}</Text>
        <View style={s.card}>
          <View style={s.identityRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{me?.name || t('profile.you')}</Text>
              {!!me?.email && <Text style={s.email}>{me.email}</Text>}
            </View>
          </View>
          <TouchableOpacity
            testID="settings-edit-profile"
            style={s.linkBtn}
            onPress={() => router.push('/client/account' as any)}
          >
            <Ionicons name="create-outline" size={16} color={T.primary} />
            <Text style={s.linkBtnText}>{t('settings.edit_profile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Security */}
        <Text style={s.section}>{t('settings.section.security')}</Text>
        <View style={s.card}>
          <Row icon="key-outline" label={t('settings.signin_method')} value={me?.email ? t('settings.signin_value') : '—'} />
          <Row
            icon="shield-checkmark-outline"
            label={t('settings.twofa')}
            right={
              twoFABusy ? (
                <ActivityIndicator color={T.primary} />
              ) : (
                <Switch
                  testID="settings-2fa"
                  value={twoFA}
                  onValueChange={onTwoFAToggle}
                  trackColor={{ false: T.surface2, true: T.primary }}
                  thumbColor={T.text}
                />
              )
            }
          />
          <TouchableOpacity
            testID="settings-change-email"
            style={s.linkBtn}
            onPress={() => router.push('/client/account' as any)}
          >
            <Ionicons name="mail-outline" size={16} color={T.primary} />
            <Text style={s.linkBtnText}>{t('settings.change_email')}</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <Text style={s.section}>{t('settings.section.appearance')}</Text>
        <View style={s.card}>
          <Text style={s.subLabel}>{t('settings.theme')}</Text>
          <View style={s.choices}>
            {(['dark', 'light'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                testID={`settings-theme-${m}`}
                style={[s.choice, theme === m && s.choiceActive]}
                onPress={() => updateTheme(m)}
              >
                <Ionicons
                  name={m === 'dark' ? 'moon' : 'sunny'}
                  size={16}
                  color={theme === m ? T.primary : T.textMuted}
                />
                <Text style={[s.choiceText, theme === m && s.choiceTextActive]}>
                  {m === 'dark' ? t('settings.theme.dark') : t('settings.theme.light')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.divider} />

          <Text style={s.subLabel}>{t('settings.language')}</Text>
          <View style={s.choices}>
            {langs.map((l) => (
              <TouchableOpacity
                key={l.code}
                testID={`settings-lang-${l.code}`}
                style={[s.choice, lang === l.code && s.choiceActive]}
                onPress={() => updateLang(l.code)}
              >
                <Ionicons
                  name={lang === l.code ? 'checkmark-circle' : 'globe-outline'}
                  size={14}
                  color={lang === l.code ? T.primary : T.textMuted}
                />
                <Text style={[s.choiceText, lang === l.code && s.choiceTextActive]}>
                  {l.native}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account */}
        <Text style={s.section}>{t('settings.section.account')}</Text>
        <View style={s.card}>
          <TouchableOpacity
            testID="settings-export-data"
            style={s.linkBtn}
            onPress={() => Alert.alert(t('settings.export_data'), t('settings.export_msg'))}
          >
            <Ionicons name="download-outline" size={16} color={T.text} />
            <Text style={[s.linkBtnText, { color: T.text }]}>{t('settings.export_data')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="settings-delete-account"
            style={s.linkBtn}
            onPress={() => Alert.alert(t('settings.delete_account'), t('settings.delete_msg'))}
          >
            <Ionicons name="trash-outline" size={16} color={T.danger} />
            <Text style={[s.linkBtnText, { color: T.danger }]}>{t('settings.delete_account')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: T.xl }} />
        <Text style={s.versionText}>{t('settings.version')}</Text>
      </ScrollView>

      {/* OTP confirmation modal — required for 2FA disable */}
      <Modal visible={otpModal} animationType="fade" transparent onRequestClose={() => setOtpModal(false)}>
        <View style={s.otpBackdrop}>
          <View style={s.otpCard}>
            <Text style={s.otpTitle}>{t('settings.twofa_disable_title')}</Text>
            <Text style={s.otpSub}>
              {otpDevCode ? `${t('common.dev_mode')}: ${otpDevCode}` : t('settings.twofa_disable_msg')}
            </Text>
            <TextInput
              testID="settings-2fa-otp"
              style={s.otpInput}
              placeholder="123456"
              placeholderTextColor={T.textMuted}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <View style={s.otpActions}>
              <TouchableOpacity
                testID="settings-2fa-cancel"
                style={s.otpCancel}
                onPress={() => { setOtpModal(false); setOtpCode(''); setOtpDevCode(null); }}
              >
                <Text style={s.otpCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="settings-2fa-submit"
                style={[s.otpSubmit, (otpSubmitting || !otpCode.trim()) && { opacity: 0.6 }]}
                onPress={confirmDisable}
                disabled={otpSubmitting || !otpCode.trim()}
              >
                <Text style={s.otpSubmitText}>{otpSubmitting ? '…' : t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Row({ icon, label, value, right }: { icon: any; label: string; value?: string; right?: React.ReactNode }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={18} color={T.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {!!value && <Text style={s.rowValue}>{value}</Text>}
      </View>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: T.lg, paddingBottom: T.xl * 2 },
  section: {
    color: T.textMuted, fontSize: 12, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginTop: T.md, marginBottom: T.sm, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.radius,
    borderWidth: 1, borderColor: T.border,
    padding: T.md,
    marginBottom: T.sm,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: T.md, marginBottom: T.md },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: T.primaryBg,
    borderWidth: 1, borderColor: T.primaryBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: T.primary, fontSize: 24, fontWeight: '800' },
  name: { color: T.text, fontSize: 18, fontWeight: '700' },
  email: { color: T.textMuted, fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: T.sm, paddingVertical: 8 },
  rowLabel: { color: T.text, fontSize: 14, fontWeight: '600' },
  rowValue: { color: T.textMuted, fontSize: 12, marginTop: 2 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10,
  },
  linkBtnText: { color: T.primary, fontSize: 13, fontWeight: '600' },
  subLabel: { color: T.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: T.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1, borderColor: T.border,
    backgroundColor: T.bg,
  },
  choiceActive: {
    borderColor: T.primary,
    backgroundColor: T.primaryBg,
  },
  choiceText: { color: T.textMuted, fontSize: 13, fontWeight: '600' },
  choiceTextActive: { color: T.primary },
  divider: { height: 1, backgroundColor: T.border, marginVertical: T.md },
  versionText: { color: T.textMuted, fontSize: 11, textAlign: 'center', opacity: 0.6 },

  /* OTP modal */
  otpBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: T.md },
  otpCard: {
    backgroundColor: T.surface,
    borderRadius: T.radius,
    borderWidth: 1, borderColor: T.border,
    padding: T.lg,
    gap: T.md,
  },
  otpTitle: { color: T.text, fontSize: 18, fontWeight: '800' },
  otpSub: { color: T.textMuted, fontSize: 13 },
  otpInput: {
    backgroundColor: T.bg,
    borderRadius: T.radiusSm,
    padding: 12,
    color: T.text, fontSize: 20, fontWeight: '700',
    borderWidth: 1, borderColor: T.border,
    textAlign: 'center', letterSpacing: 8,
  },
  otpActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: T.sm },
  otpCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: T.radiusSm, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
  otpCancelText: { color: T.text, fontWeight: '700' },
  otpSubmit: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: T.radiusSm, backgroundColor: T.primary },
  otpSubmitText: { color: T.bg, fontWeight: '800' },
});
