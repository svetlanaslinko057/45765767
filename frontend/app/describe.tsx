import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
  Pressable, Image,
} from 'react-native';
import {
  useFonts as useInstrument,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
} from '@expo-google-fonts/instrument-sans';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../src/auth';
import { useMe } from '../src/use-me';
import api from '../src/api';
import { runtime } from '../src/runtime';
import { ApiError } from '../src/runtime-client';
import { resolveUserEntry } from '../src/resolve-entry';
import {
  hasWelcomeBeenSeenInSession,
  consumeJustLeftWelcome,
} from '../src/welcome-session';
import { F, usePalette, type Palette } from '../src/design-tokens';
import { useTheme } from '../src/theme-context';
import { GravityCTA } from '../src/gravity-cta';

/**
 * L0 entry point — Visitor describe-your-product flow.
 *
 * Conservative material-only pass over the cognitive-monochrome grammar
 * established in /welcome. Everything that affects mechanics
 * (validation, autosave timing, flow order, estimation sequencing) is
 * preserved verbatim from the previous implementation. Only the
 * surface — substrate, typography, signal expression, telemetry,
 * field materiality, CTA gravity, quiet states — has been transformed.
 *
 * Hero typography deliberately relaxed from the landing's 42px
 * declaration to a 28px utilitarian heading: input flow is cognition
 * under interaction, not rhetoric. Less gravity, more breathing room
 * for the user to think inside.
 *
 * Error state: no red box, no alarm icon. Quiet `ERR ·` mono prefix +
 * primary text. Quiet seriousness, not alarm semantics.
 *
 * Mode cards: neutral substrate with sage-only signal for the active
 * choice. Per-mode marketing colors (purple/sage/amber from the data
 * model) are intentionally NOT rendered — modes differentiate through
 * typography hierarchy and active state, not loud chromatic identity.
 */

type Mode = 'ai' | 'hybrid' | 'dev';

/**
 * MODES represent three PRODUCTION METHODS of the same product scope.
 * Data identical to previous implementation — visual rendering changed.
 */
const MODES: {
  id: Mode;
  label: string;
  headline: string;
  bullets: string[];
  popular?: boolean;
}[] = [
  {
    id: 'ai',
    label: 'AI Build',
    headline: 'Fastest, lowest cost',
    bullets: [
      'Full product scope',
      'Built entirely with AI-generated code',
      'Delivered quickly',
      'May require post-launch fixes',
    ],
  },
  {
    id: 'hybrid',
    label: 'AI + Engineering',
    headline: 'Balanced speed & quality',
    bullets: [
      'AI foundation + human review',
      'Production-ready',
      'Optimized architecture',
      'Stable launch',
    ],
    popular: true,
  },
  {
    id: 'dev',
    label: 'Full Engineering',
    headline: 'Maximum quality & control',
    bullets: [
      'Built by senior developers',
      'Custom architecture',
      'Full QA & validation',
      'Highest reliability',
    ],
  },
];

const MIN_GOAL = 40;
const MAX_GOAL = 3000;
const MAX_FILE_BYTES = 400_000;

/** Gibberish / nonsense detector — UNCHANGED. */
function isGibberish(text: string): boolean {
  const clean = text.trim();
  if (clean.length < MIN_GOAL) return true;
  const letters = clean.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '');
  if (letters.length < 20) return true;
  const words = clean.split(/\s+/).filter(w => w.length > 1);
  if (words.length < 5) return true;
  if (/(.)\1{5,}/.test(clean)) return true;
  if (/^([^\s])\1+$/.test(clean.replace(/\s/g, ''))) return true;
  return false;
}

export default function Index() {
  const router = useRouter();
  const P = usePalette();
  const { theme } = useTheme();
  // Asset filenames are reversed in this codebase: `evax-logo.png` is the
  // WHITE wordmark (for dark substrate); `evax-logo-light.png` is the BLACK
  // wordmark (for light substrate). Pick the one that contrasts with the
  // active substrate so the brand mark is always visible.
  const brandLogo = theme === 'dark'
    ? require('../assets/images/evax-logo.png')
    : require('../assets/images/evax-logo-light.png');
  const s = useMemo(() => makeStyles(P), [P]);
  const { token, loading: authLoading } = useAuth();
  const { me, loading: meLoading } = useMe();
  const [fontsLoaded] = useInstrument({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    JetBrainsMono_500Medium,
  });
  // True for one render after the user clicked "See my product plan" on
  // /welcome. Drives the visual continuity strip ("STEP 1 OF 3").
  const [cameFromWelcome, setCameFromWelcome] = useState(false);

  // Authed redirect: if a signed-in visitor lands here, send them to their
  // role-specific home. (Guests reach /describe only via the welcome CTA;
  // the / route handles the guest → /welcome gate centrally.)
  useEffect(() => {
    if (authLoading || meLoading) return;
    if (token && me) router.replace(resolveUserEntry(me) as any);
  }, [authLoading, meLoading, token, me, router]);

  useEffect(() => {
    if (hasWelcomeBeenSeenInSession() && consumeJustLeftWelcome()) {
      setCameFromWelcome(true);
    }
  }, []);

  const [goal, setGoal] = useState('');
  const [mode, setMode] = useState<Mode>('hybrid');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [attachment, setAttachment] = useState<{ name: string; text: string } | null>(null);

  const goalLen = goal.length;
  const isTooShort = goalLen < MIN_GOAL || isGibberish(goal);
  const charHint =
    goalLen === 0
      ? 'min 40 chars'
      : isTooShort
        ? `${goalLen} / 40 — keep going`
        : `${goalLen} / ${MAX_GOAL}`;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsing, setParsing] = useState(false);

  const onPickFile = async () => {
    if (parsing) return;
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['text/*', 'application/pdf', 'application/vnd.openxmlformats-officedocument.*', 'image/*'],
      });
      if (res.canceled) return;
      const f = res.assets?.[0];
      if (!f) return;
      const blobRes = await fetch(f.uri);
      const blob = await blobRes.blob();
      if (blob.size > MAX_FILE_BYTES) {
        setError('File too large. Please keep brief under 400KB.');
        return;
      }
      const file = new File([blob], f.name || 'brief', { type: f.mimeType || blob.type });
      await parseAndAttach(file);
    } catch (e: any) {
      setError(e?.message || 'Could not read file.');
    }
  };

  const onFileChosen = async (e: any) => {
    const file: File | undefined = e?.target?.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('File too large. Please keep brief under 400KB.');
      e.target.value = '';
      return;
    }
    await parseAndAttach(file);
    e.target.value = '';
  };

  const parseAndAttach = async (file: File) => {
    setParsing(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file as any);
      const { data } = await api.post('/visitor/parse-file', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const text = String(data?.text || '').trim();
      const name = String(data?.name || file.name);
      if (!text) {
        setError('Could not extract text from this file. Type or paste your idea instead.');
        return;
      }
      setAttachment({ name, text });
      if (goal.trim().length === 0) setGoal(text.slice(0, MAX_GOAL));
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'File parsing failed.');
    } finally {
      setParsing(false);
    }
  };

  const estimateProduct = async () => {
    if (busy) return;
    const g = goal.trim();
    if (g.length < MIN_GOAL || isGibberish(g)) {
      setError('Please describe your product more fully. Minimum 40 characters, 5+ words.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body: any = { goal: g, mode };
      if (attachment) body.attachment = { name: attachment.name, text: attachment.text };
      const data = await runtime.post<any>('/visitor/estimate', body);
      if (data?.clarity === 'low') {
        router.push({
          pathname: '/estimate-improve',
          params: {
            goal: g, mode,
            message: data.message || '',
            suggestions: JSON.stringify(data.suggestions || []),
          },
        } as any);
        return;
      }
      router.push({
        pathname: '/estimate-result',
        params: { data: JSON.stringify(data), goal: g, mode },
      } as any);
    } catch (e: any) {
      const msg = e instanceof ApiError
        ? (e.payload?.detail || e.message)
        : (e?.response?.data?.detail || e?.message || 'Could not calculate. Try again.');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const goLogin = () => router.push('/auth' as any);

  if (authLoading || (token && meLoading) || !fontsLoaded) {
    return (
      <View style={s.loading} testID="visitor-loading">
        <ActivityIndicator size="small" color={P.signal} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="visitor-home"
      >
        {/* Self-contained brand mark — replaces the global AppHeader which
            is suppressed on visitor entrance surfaces. ALWAYS the canonical
            PNG — never text — so the wordmark cannot drift through refactors. */}
        <View
          style={{ marginBottom: 32, alignItems: 'flex-start' }}
          testID="visitor-brand"
        >
          <Image
            source={brandLogo}
            style={{ width: 140, height: 32 }}
            resizeMode="contain"
            accessibilityLabel="EVA-X"
          />
        </View>

        {/* Continuity strip — when user comes from /welcome.
            Demoted from glowing primary card to mono telemetry band. */}
        {cameFromWelcome && (
          <View style={s.continuity} testID="continuity-strip">
            <Text style={s.continuityEyebrow}>STEP 01 / 03</Text>
            <Text style={s.continuityTitle}>Let&apos;s build your product</Text>
            <Text style={s.continuitySub}>Describe your idea below ↓</Text>
          </View>
        )}
        {!cameFromWelcome && (
          <Text style={s.heroTitle}>Build products.{'\n'}Not tickets.</Text>
        )}
        <Text style={s.heroSub}>
          {cameFromWelcome
            ? 'A few sentences is enough. We turn it into a full product plan with modules, timeline, and price.'
            : 'Describe what you want. See the real plan in 30 seconds — no sign-up required.'}
        </Text>

        {/* Field eyebrow + character counter — mono telemetry */}
        <View style={s.eyebrowRow}>
          <Text style={s.eyebrow}>DESCRIBE YOUR PRODUCT</Text>
          <Text
            style={[
              s.charHint,
              isTooShort && goalLen > 0 && { color: P.textSecondary },
            ]}
          >
            {charHint}
          </Text>
        </View>

        {/* Textarea — warm institutional surface. Generous padding (16/14),
            substrate Layer 2 fill, subtle 1px border. NO glow on focus,
            NO heavy outline. The error state nudges the border to a quiet
            warm gray; it does NOT flip to red alarm. */}
        <TextInput
          testID="visitor-goal-input"
          style={[s.input, error && isTooShort ? s.inputError : null]}
          placeholder={'Example: "A marketplace for freelance chefs with booking, reviews, Stripe payouts, and push reminders for Russian and English users."'}
          placeholderTextColor={P.textTertiary}
          value={goal}
          onChangeText={(v) => {
            const trimmed = v.length > MAX_GOAL ? v.slice(0, MAX_GOAL) : v;
            setGoal(trimmed);
            if (error) setError('');
          }}
          maxLength={MAX_GOAL}
          multiline
          textAlignVertical="top"
        />

        {/* Attachment row — institutional, mono label, no green */}
        <View style={s.attachRow}>
          <TouchableOpacity
            testID="visitor-attach-btn"
            style={s.attachBtn}
            onPress={onPickFile}
            disabled={parsing}
            activeOpacity={0.7}
          >
            {parsing
              ? <ActivityIndicator size="small" color={P.textSecondary} />
              : <Text style={s.attachGlyph}>+</Text>}
            <Text style={s.attachText} numberOfLines={1} ellipsizeMode="middle">
              {parsing
                ? 'READING FILE…'
                : attachment
                  ? `ATTACHED · ${attachment.name.toUpperCase()}`
                  : 'ATTACH BRIEF'}
            </Text>
          </TouchableOpacity>
          {attachment && !parsing && (
            <TouchableOpacity
              testID="visitor-attach-clear"
              onPress={() => setAttachment(null)}
              hitSlop={8}
            >
              <Text style={s.attachClear}>×</Text>
            </TouchableOpacity>
          )}
          {Platform.OS === 'web' && (
            // @ts-ignore — only exists on web
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp,.heic,.heif,.bmp,.gif,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
              style={{ display: 'none' }}
              onChange={onFileChosen}
            />
          )}
        </View>

        {/* Autosave / analyzing signal — quiet mono telemetry. The dot is
            tertiary while the user is still typing (system is observing,
            not asserting) and shifts to sage when input is plan-ready.
            NO pulse, NO animation — institutional background calm. */}
        {!error && goalLen > 0 && (
          <View style={s.analyzingRow} testID="visitor-analyzing">
            <View
              style={[
                s.signalDot,
                { backgroundColor: isTooShort ? P.textTertiary : P.signal },
              ]}
            />
            <Text style={s.analyzingText}>
              {isTooShort ? 'ANALYZING · KEEP DESCRIBING' : 'READY TO PLAN'}
            </Text>
          </View>
        )}

        {/* Error state — quiet seriousness, NOT alarm. Single mono
            `ERR ·` prefix + primary text. No red bg, no icon, no border. */}
        {error ? (
          <View style={s.errorRow} testID="visitor-error">
            <Text style={s.errorPrefix}>ERR ·</Text>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Section header — production methods */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Choose how we build your product</Text>
          <Text style={s.sectionSub}>
            All options deliver the full product. The difference is speed,
            cost, and reliability.
          </Text>
        </View>

        {/* Mode cards — neutral substrate, sage signal on active only.
            Per-mode marketing colors intentionally NOT rendered. Identity
            comes from typography + state, not chromatic tier. */}
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <Pressable
              key={m.id}
              testID={`visitor-mode-${m.id}`}
              onPress={() => setMode(m.id)}
              style={[s.modeCard, active && s.modeCardActive]}
            >
              {m.popular && (
                <Text style={s.modePopular}>// RECOMMENDED</Text>
              )}
              <View style={s.modeHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modeLabel}>{m.label}</Text>
                  <Text style={s.modeHeadline}>{m.headline}</Text>
                </View>
                <Text
                  style={[
                    s.modeStateMark,
                    active ? { color: P.signal } : { color: P.textTertiary },
                  ]}
                >
                  {active ? '●' : '○'}
                </Text>
              </View>
              <View style={s.modeBullets}>
                {m.bullets.map((b, i) => (
                  <View key={i} style={s.modeBulletRow}>
                    <View style={s.modeBulletBar} />
                    <Text style={s.modeBulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}

        {/* Footer — reinforce "same product" */}
        <Text style={s.sameProductNote}>
          Same product scope across all three options. You're choosing the
          build method, not the feature set.
        </Text>

        {/* Primary CTA — shared GravityCTA. Busy state shifts label to
            "PLANNING…" with mono marker, never spins, never pulses. */}
        <View style={s.ctaBlock}>
          <GravityCTA
            testID="visitor-start-cta"
            label="See my product plan"
            busyLabel="Planning…"
            onPress={estimateProduct}
            disabled={isTooShort}
            busy={busy}
          />
          <Text style={s.ctaHint}>
            REAL PLAN &amp; PRICE · NO SIGN-UP · 30 SECONDS
          </Text>
        </View>

        {/* Tiny login link */}
        <TouchableOpacity
          testID="visitor-login-link"
          onPress={goLogin}
          style={s.loginLink}
        >
          <Text style={s.loginText}>
            Already have an account?{' '}
            <Text style={s.loginAction}>Log in</Text>
          </Text>
        </TouchableOpacity>

        {/* Developer entry — separate institutional surface, no green CTA */}
        <View style={s.devDivider} />
        <View style={s.devCard} testID="visitor-dev-card">
          <Text style={s.devCardEyebrow}>FOR DEVELOPERS</Text>
          <Text style={s.devCardTitle}>
            Join the team building real client products
          </Text>
          <Text style={s.devCardSub}>
            Open tasks, performance tracking, payouts, and growth — all in
            one workspace.
          </Text>
          <TouchableOpacity
            testID="visitor-developer-cta"
            style={s.devCta}
            onPress={() => router.push('/auth?intent=developer' as any)}
            activeOpacity={0.8}
          >
            <Text style={s.devCtaText}>Join as developer</Text>
            <Text style={s.devCtaMarker}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (P: Palette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: P.substrate },
  container: { flex: 1, backgroundColor: P.substrate },
  content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 },
  loading: {
    flex: 1,
    backgroundColor: P.substrate,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Continuity strip — mono telemetry band, NOT a glowing primary card */
  continuity: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: P.operational,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: P.borderSubtle,
    marginBottom: 24,
  },
  continuityEyebrow: {
    fontFamily: F.mono,
    fontSize: 10,
    color: P.signal,
    letterSpacing: 1,
    marginBottom: 8,
  },
  continuityTitle: {
    fontFamily: F.sansMedium,
    fontSize: 22,
    color: P.textPrimary,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  continuitySub: {
    fontFamily: F.sans,
    fontSize: 13,
    color: P.textSecondary,
    marginTop: 6,
  },

  /* Hero — RELAXED from landing's 42px. Input flow is cognition under
     interaction, not declaration. Less rhetorical gravity. */
  heroTitle: {
    fontFamily: F.sansMedium,
    fontSize: 28,
    color: P.textPrimary,
    lineHeight: 32,
    letterSpacing: -0.6,
    marginTop: 8,
  },
  heroSub: {
    fontFamily: F.sans,
    fontSize: 15,
    color: P.textSecondary,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: '95%',
  },

  /* Eyebrow + char hint — twin mono telemetry lines */
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 36,
    marginBottom: 10,
  },
  eyebrow: {
    fontFamily: F.mono,
    fontSize: 10,
    color: P.textTertiary,
    letterSpacing: 1,
  },
  charHint: {
    fontFamily: F.mono,
    fontSize: 10,
    color: P.textTertiary,
    letterSpacing: 0.5,
  },

  /* Textarea — warm institutional surface */
  input: {
    backgroundColor: P.operational,
    borderWidth: 1,
    borderColor: P.borderSubtle,
    borderRadius: 4,
    color: P.textPrimary,
    fontFamily: F.sans,
    fontSize: 15,
    lineHeight: 22,
    padding: 16,
    minHeight: 132,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  inputError: {
    // Quiet seriousness — NOT a red alarm. A slightly contrasted border
    // tells the user "this surface noticed something" without panicking.
    borderColor: P.borderContrast,
  },

  /* Attach row — mono label, no icons */
  attachRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: P.borderSubtle,
    borderRadius: 4,
    backgroundColor: P.operational,
  },
  attachGlyph: {
    fontFamily: F.mono,
    fontSize: 14,
    color: P.textSecondary,
    width: 14,
    textAlign: 'center',
  },
  attachText: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 10,
    color: P.textSecondary,
    letterSpacing: 0.8,
  },
  attachClear: {
    fontFamily: F.mono,
    fontSize: 16,
    color: P.textTertiary,
    paddingHorizontal: 4,
  },

  /* Autosave / analyzing — mono telemetry, no animation */
  analyzingRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signalDot: {
    width: 6,
    height: 6,
    backgroundColor: P.signal,
  },
  analyzingText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: P.textSecondary,
    letterSpacing: 0.8,
  },

  /* Error state — quiet seriousness, NOT alarm */
  errorRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorPrefix: {
    fontFamily: F.mono,
    fontSize: 11,
    color: P.textPrimary,
    letterSpacing: 0.8,
    paddingTop: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: F.sans,
    fontSize: 13,
    color: P.textPrimary,
    lineHeight: 20,
  },

  /* Section header — utilitarian, not declaration */
  sectionHeader: { marginTop: 44, marginBottom: 16 },
  sectionTitle: {
    fontFamily: F.sansMedium,
    fontSize: 20,
    color: P.textPrimary,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontFamily: F.sans,
    fontSize: 13,
    color: P.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },

  /* Mode cards — neutral substrate, sage on active only */
  modeCard: {
    backgroundColor: P.operational,
    borderWidth: 1,
    borderColor: P.borderSubtle,
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  modeCardActive: {
    borderColor: P.signalBorder,
    backgroundColor: P.signalBgSub,
  },
  modePopular: {
    fontFamily: F.mono,
    fontSize: 9,
    color: P.signal,
    letterSpacing: 1,
    marginBottom: 8,
  },
  modeHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modeLabel: {
    fontFamily: F.sansMedium,
    fontSize: 16,
    color: P.textPrimary,
    letterSpacing: -0.2,
  },
  modeHeadline: {
    fontFamily: F.sans,
    fontSize: 12,
    color: P.textSecondary,
    marginTop: 3,
  },
  modeStateMark: {
    fontFamily: F.mono,
    fontSize: 14,
    lineHeight: 18,
    paddingTop: 1,
  },
  modeBullets: { marginTop: 12, gap: 6 },
  modeBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modeBulletBar: {
    width: 1,
    height: 8,
    backgroundColor: P.textTertiary,
  },
  modeBulletText: {
    fontFamily: F.sans,
    fontSize: 13,
    color: P.textSecondary,
    lineHeight: 18,
  },

  sameProductNote: {
    fontFamily: F.sans,
    fontSize: 12,
    color: P.textTertiary,
    marginTop: 18,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  /* CTA block — generous negative space above and below */
  ctaBlock: { marginTop: 36, alignItems: 'center' },
  ctaHint: {
    fontFamily: F.mono,
    fontSize: 10,
    color: P.textTertiary,
    letterSpacing: 1,
    marginTop: 14,
    textAlign: 'center',
  },

  /* Login link */
  loginLink: { marginTop: 32, alignItems: 'center', paddingVertical: 8 },
  loginText: {
    fontFamily: F.sans,
    fontSize: 13,
    color: P.textSecondary,
  },
  loginAction: {
    fontFamily: F.sansMedium,
    color: P.textPrimary,
  },

  /* Dev card — institutional secondary track */
  devDivider: {
    height: 1,
    backgroundColor: P.borderSubtle,
    marginTop: 40,
    marginBottom: 32,
    marginHorizontal: -24,
  },
  devCard: {
    backgroundColor: P.operational,
    borderWidth: 1,
    borderColor: P.borderSubtle,
    borderRadius: 4,
    padding: 20,
  },
  devCardEyebrow: {
    fontFamily: F.mono,
    fontSize: 10,
    color: P.textTertiary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  devCardTitle: {
    fontFamily: F.sansMedium,
    fontSize: 18,
    color: P.textPrimary,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  devCardSub: {
    fontFamily: F.sans,
    fontSize: 13,
    color: P.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  devCta: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: P.borderContrast,
    borderRadius: 4,
    backgroundColor: P.focus,
  },
  devCtaText: {
    fontFamily: F.sansMedium,
    fontSize: 14,
    color: P.textPrimary,
  },
  devCtaMarker: {
    fontFamily: F.mono,
    fontSize: 14,
    color: P.textPrimary,
  },
});
