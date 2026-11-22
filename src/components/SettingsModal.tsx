import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Cloud,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  Share,
  Smartphone,
  Type,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  isApiBibleTranslation,
  TRANSLATION_OPTIONS,
  type TranslationCode,
  type TranslationOption,
} from '../services/scriptureApi';
import {
  API_BIBLE_COPYRIGHTS,
  type ApiBibleTranslationCode,
  type ResolvedApiBibleIds,
} from '../services/apiBible';
import type { FontFamilyOption, TextSizeOption } from '../services/userStore';
import { usePWAInstall } from '../hooks/usePWAInstall';

export interface SaveApiBibleKeyResult {
  ok: boolean;
  resolvedIds?: ResolvedApiBibleIds;
  error?: string;
  warning?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  translation: TranslationCode;
  smartGrouping: boolean;
  textSize: TextSizeOption;
  fontFamily: FontFamilyOption;
  redLetter: boolean;
  apiBibleKey: string;
  resolvedApiBibleIds: ResolvedApiBibleIds | null;
  focusApiKeyOnOpen?: boolean;
  initialMissingKeyFor?: ApiBibleTranslationCode | null;
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  onClose: () => void;
  onChangeTranslation: (next: TranslationCode) => void;
  onToggleSmartGrouping: () => void;
  onChangeTextSize: (next: TextSizeOption) => void;
  onChangeFontFamily: (next: FontFamilyOption) => void;
  onToggleRedLetter: () => void;
  onSaveApiBibleKey: (nextKey: string) => Promise<SaveApiBibleKeyResult>;
  onSignIn: () => void;
  onSignOut: () => void;
}

const API_BIBLE_CODES: ApiBibleTranslationCode[] = ['NLT', 'NASB', 'CEV'];
const TEXT_SIZE_OPTIONS: readonly TextSizeOption[] = ['S', 'M', 'L', 'XL'];

const PREVIEW_SIZE_CLASSES: Record<FontFamilyOption, Record<TextSizeOption, string>> = {
  serif: {
    S: 'text-[1.05rem] leading-[1.45]',
    M: 'text-[1.24rem] leading-[1.42]',
    L: 'text-[1.42rem] leading-[1.38]',
    XL: 'text-[1.6rem] leading-[1.35]',
  },
  sans: {
    S: 'text-[0.86rem] leading-[1.52]',
    M: 'text-[0.98rem] leading-[1.5]',
    L: 'text-[1.12rem] leading-[1.46]',
    XL: 'text-[1.26rem] leading-[1.42]',
  },
};

export function SettingsModal({
  isOpen,
  translation,
  smartGrouping,
  textSize,
  fontFamily,
  redLetter,
  apiBibleKey,
  resolvedApiBibleIds,
  focusApiKeyOnOpen = false,
  initialMissingKeyFor = null,
  user,
  authLoading,
  authError,
  onClose,
  onChangeTranslation,
  onToggleSmartGrouping,
  onChangeTextSize,
  onChangeFontFamily,
  onToggleRedLetter,
  onSaveApiBibleKey,
  onSignIn,
  onSignOut,
}: SettingsModalProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const keyInputRef = useRef<HTMLInputElement | null>(null);

  const [keyDraft, setKeyDraft] = useState(apiBibleKey);
  const [showKey, setShowKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    kind: 'saved' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [missingKeyPromptFor, setMissingKeyPromptFor] = useState<ApiBibleTranslationCode | null>(
    null,
  );

  // Sync draft when modal opens or synced cloud key arrives
  useEffect(() => {
    if (!isOpen) return;
    setKeyDraft(apiBibleKey);
    setSaveFeedback(null);

    if (apiBibleKey.trim()) {
      setMissingKeyPromptFor(null);
    } else if (initialMissingKeyFor) {
      setMissingKeyPromptFor(initialMissingKeyFor);
    }

    if (focusApiKeyOnOpen) {
      const timer = window.setTimeout(() => {
        keyInputRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, apiBibleKey, focusApiKeyOnOpen, initialMissingKeyFor]);

  if (!isOpen) return null;

  const hasSavedKey = apiBibleKey.trim().length > 0;
  const trimmedDraft = keyDraft.trim();
  const isDirty = trimmedDraft !== apiBibleKey.trim();
  const activeCopyright = isApiBibleTranslation(translation)
    ? API_BIBLE_COPYRIGHTS[translation]
    : null;

  const authorizedCodes = API_BIBLE_CODES.filter((code) => Boolean(resolvedApiBibleIds?.[code]));

  const handleSelectTranslation = (item: TranslationOption) => {
    if (item.requiresApiBibleKey && !hasSavedKey) {
      setMissingKeyPromptFor(item.code as ApiBibleTranslationCode);
      setSaveFeedback(null);
      keyInputRef.current?.focus();
      keyInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setMissingKeyPromptFor(null);
    onChangeTranslation(item.code);
  };

  const handleSaveKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingKey) return;

    setIsSavingKey(true);
    setSaveFeedback(null);

    try {
      const result = await onSaveApiBibleKey(trimmedDraft);
      if (!result.ok) {
        setSaveFeedback({
          kind: 'error',
          message: result.error ?? 'Could not verify this API.Bible key.',
        });
        return;
      }

      if (!trimmedDraft) {
        setSaveFeedback({
          kind: 'saved',
          message: 'API.Bible key cleared.',
        });
        return;
      }

      if (result.warning) {
        setSaveFeedback({
          kind: 'warning',
          message: result.warning,
        });
      } else {
        const matchedCount = API_BIBLE_CODES.filter((c) => Boolean(result.resolvedIds?.[c])).length;
        setSaveFeedback({
          kind: 'saved',
          message:
            matchedCount > 0
              ? `Key saved${user ? ' & synced to your account' : ''}. ${matchedCount} of 3 API.Bible translations authorized.`
              : `Key saved${user ? ' & synced to your account' : ''}. No NLT, NASB, or CEV IDs were returned for this key.`,
        });
      }

      const pendingCode = missingKeyPromptFor;
      setMissingKeyPromptFor(null);
      if (pendingCode) {
        onChangeTranslation(pendingCode);
      }
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleClearKey = async () => {
    if (isSavingKey) return;
    setKeyDraft('');
    setIsSavingKey(true);
    setSaveFeedback(null);
    try {
      await onSaveApiBibleKey('');
      setSaveFeedback({
        kind: 'saved',
        message: 'API.Bible key removed.',
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  const inlinePromptTranslation: ApiBibleTranslationCode | null =
    !hasSavedKey
      ? missingKeyPromptFor ?? (isApiBibleTranslation(translation) ? translation : null)
      : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="BibleScroll Settings"
    >
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full sm:max-w-md max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[#161B19] border border-[#D4AF37]/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-[#F5F2EA]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {/* Translation Selector */}
          <section className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-[#D4AF37]">
                Scripture Translation
              </h3>
              <p className="text-xs text-[#9CA8A2] mt-1 leading-relaxed">
                BSB and WEB work without a key. Add your personal API.Bible key to read NLT, NASB
                2020, and CEV.
              </p>
            </div>

            {/* API.Bible Key Storage */}
            <form
              onSubmit={handleSaveKeySubmit}
              className={`rounded-xl bg-[#0F1312] border p-3.5 space-y-2.5 transition-colors ${
                inlinePromptTranslation
                  ? 'border-[#D4AF37]/70'
                  : hasSavedKey
                    ? 'border-[#D4AF37]/30'
                    : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="api-bible-key-input"
                  className="flex items-center gap-1.5 text-xs font-medium text-[#F5F2EA]"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" aria-hidden="true" />
                  <span>API.Bible Key</span>
                </label>

                {hasSavedKey && !isDirty && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D4AF37]">
                    <Check className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
                    <span>{user ? 'Saved & synced' : 'Saved'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <input
                    ref={keyInputRef}
                    id="api-bible-key-input"
                    type={showKey ? 'text' : 'password'}
                    value={keyDraft}
                    onChange={(e) => {
                      setKeyDraft(e.target.value);
                      if (saveFeedback) setSaveFeedback(null);
                    }}
                    placeholder="Paste your API.Bible key..."
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full min-h-[44px] pl-3 pr-10 rounded-xl bg-[#161B19] border border-white/10 focus:border-[#D4AF37]/70 focus:outline-none text-xs font-mono text-[#F5F2EA] placeholder:font-ui placeholder:text-[#9CA8A2]/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((prev) => !prev)}
                    aria-label={showKey ? 'Hide API.Bible key' : 'Show API.Bible key'}
                    className="min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] absolute right-1 top-1/2 -translate-y-1/2 transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSavingKey || (!trimmedDraft && !hasSavedKey)}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#D4AF37] text-[#121514] text-xs font-semibold hover:bg-[#E2BF4E] flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors disabled:opacity-45"
                >
                  {isSavingKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Saving</span>
                    </>
                  ) : hasSavedKey && !isDirty ? (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Save Key</span>
                  )}
                </button>
              </div>

              {saveFeedback && (
                <p
                  role={saveFeedback.kind === 'error' ? 'alert' : 'status'}
                  className={`text-[11px] leading-relaxed ${
                    saveFeedback.kind === 'error'
                      ? 'text-amber-300'
                      : saveFeedback.kind === 'warning'
                        ? 'text-amber-200/90'
                        : 'text-[#D4AF37]'
                  }`}
                >
                  {saveFeedback.message}
                </p>
              )}

              {hasSavedKey && (
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#9CA8A2]">
                  <span className="truncate">
                    {authorizedCodes.length > 0
                      ? `Authorized: ${authorizedCodes.join(' · ')}`
                      : 'Stored privately on this device' + (user ? ' & account' : '')}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearKey}
                    disabled={isSavingKey}
                    className="text-[#9CA8A2] hover:text-[#F5F2EA] underline underline-offset-2 shrink-0 transition-colors disabled:opacity-50"
                  >
                    Remove key
                  </button>
                </div>
              )}
            </form>

            {/* Inline prompt when selecting NLT, NASB, or CEV without a saved key */}
            {inlinePromptTranslation && (
              <div
                role="alert"
                className="rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/45 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-[#F5F2EA]"
              >
                <AlertCircle
                  className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">
                  Paste and save your <strong className="text-[#D4AF37]">API.Bible key</strong>{' '}
                  above to unlock{' '}
                  <strong>{inlinePromptTranslation}</strong> and fetch chapters automatically.
                </p>
              </div>
            )}

            {/* Five Translation Cards */}
            <div className="space-y-2">
              {TRANSLATION_OPTIONS.map((item) => {
                const isSelected = translation === item.code;
                const isApiBible = item.requiresApiBibleKey;
                const resolvedId = isApiBible
                  ? resolvedApiBibleIds?.[item.code as ApiBibleTranslationCode]
                  : undefined;

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelectTranslation(item)}
                    aria-pressed={isSelected}
                    className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-[#D4AF37]/12 border-[#D4AF37] text-[#F5F2EA]'
                        : 'bg-[#0F1312] border-white/10 text-[#F5F2EA] hover:border-white/25'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{item.code}</span>
                        <span aria-hidden="true" className="text-[#9CA8A2]">
                          ·
                        </span>
                        <span className="text-sm text-[#F5F2EA]/90">{item.name}</span>
                      </div>
                      <p className="text-xs text-[#9CA8A2] mt-0.5">
                        {item.source}
                        {isApiBible && !hasSavedKey
                          ? ' · API key required'
                          : isApiBible && resolvedId
                            ? ' · Ready'
                            : ''}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#121514] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="h-px bg-white/10" aria-hidden="true" />

          {/* Reading Display: Text Size, Font Family, Red-Letter Words of Jesus */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
              <h3 className="text-xs font-semibold tracking-wide text-[#D4AF37]">
                Reading Display
              </h3>
            </div>

            {/* Live Typography & Red-Letter Preview */}
            <div className="rounded-xl bg-[#0F1312] border border-white/10 px-4 py-3.5 space-y-2">
              <p
                className={`${
                  fontFamily === 'sans'
                    ? 'font-ui font-normal tracking-[-0.005em]'
                    : 'font-scripture font-normal tracking-[0.01em]'
                } text-[#F5F2EA] ${PREVIEW_SIZE_CLASSES[fontFamily][textSize]}`}
              >
                <sup className="font-ui text-[0.48em] font-semibold text-[#D4AF37] mr-1.5 align-super tabular-nums select-none">
                  6
                </sup>
                Jesus answered,{' '}
                <span className={redLetter ? 'text-[#E06C65]' : 'text-[#F5F2EA]'}>
                  “I am the way and the truth and the life.”
                </span>
              </p>
              <p className="text-[11px] text-[#9CA8A2] tracking-wide">John 14:6</p>
            </div>

            {/* Text Size Segmented Control */}
            <div className="space-y-2">
              <span
                id="reading-text-size-label"
                className="block text-xs font-medium text-[#F5F2EA]"
              >
                Text Size
              </span>
              <div
                role="radiogroup"
                aria-labelledby="reading-text-size-label"
                className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#0F1312] border border-white/10"
              >
                {TEXT_SIZE_OPTIONS.map((size) => {
                  const isActive = textSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => onChangeTextSize(size)}
                      className={`min-h-[44px] rounded-lg text-xs tracking-wide transition-colors ${
                        isActive
                          ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                          : 'text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 font-medium'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Family Toggle */}
            <div className="space-y-2">
              <span
                id="reading-font-family-label"
                className="block text-xs font-medium text-[#F5F2EA]"
              >
                Font Family
              </span>
              <div
                role="radiogroup"
                aria-labelledby="reading-font-family-label"
                className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0F1312] border border-white/10"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={fontFamily === 'serif'}
                  onClick={() => onChangeFontFamily('serif')}
                  className={`min-h-[44px] rounded-lg px-3 flex items-center justify-center gap-2 transition-colors ${
                    fontFamily === 'serif'
                      ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                      : 'text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 font-medium'
                  }`}
                >
                  <span className="font-scripture text-lg leading-none">Aa</span>
                  <span className="text-xs">Serif</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={fontFamily === 'sans'}
                  onClick={() => onChangeFontFamily('sans')}
                  className={`min-h-[44px] rounded-lg px-3 flex items-center justify-center gap-2 transition-colors ${
                    fontFamily === 'sans'
                      ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                      : 'text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 font-medium'
                  }`}
                >
                  <span className="font-ui text-sm leading-none">Aa</span>
                  <span className="text-xs">Sans</span>
                </button>
              </div>
            </div>

            {/* Red-Letter Words of Jesus Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={redLetter}
              onClick={onToggleRedLetter}
              className="w-full min-h-[56px] px-4 py-3 rounded-xl bg-[#0F1312] border border-white/10 hover:border-white/25 text-left flex items-center justify-between gap-4 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F5F2EA] flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block w-2.5 h-2.5 rounded-full bg-[#E06C65] shrink-0"
                  />
                  <span>Red-Letter Words of Jesus</span>
                </p>
                <p className="text-xs text-[#9CA8A2] mt-0.5 leading-relaxed">
                  Highlights words spoken by Jesus in warm crimson across the Gospels, Acts,
                  Corinthians, and Revelation.
                </p>
              </div>

              <span
                aria-hidden="true"
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                  redLetter ? 'bg-[#D4AF37] border-[#D4AF37]' : 'bg-white/10 border-white/15'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full transition-transform ${
                    redLetter ? 'translate-x-6 bg-[#121514]' : 'translate-x-1 bg-[#F5F2EA]/80'
                  }`}
                />
              </span>
            </button>
          </section>

          <div className="h-px bg-white/10" aria-hidden="true" />

          {/* Reading Experience: Smart Verse Grouping */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
              <h3 className="text-xs font-semibold tracking-wide text-[#D4AF37]">
                Reading Flow
              </h3>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={smartGrouping}
              onClick={onToggleSmartGrouping}
              className="w-full min-h-[56px] px-4 py-3 rounded-xl bg-[#0F1312] border border-white/10 hover:border-white/25 text-left flex items-center justify-between gap-4 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F5F2EA]">Smart Verse Grouping</p>
                <p className="text-xs text-[#9CA8A2] mt-0.5 leading-relaxed">
                  {smartGrouping
                    ? 'Keeps complete thoughts together in cohesive reels while respecting section headings.'
                    : 'Displays one individual verse per full-screen card.'}
                </p>
              </div>

              <span
                aria-hidden="true"
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                  smartGrouping
                    ? 'bg-[#D4AF37] border-[#D4AF37]'
                    : 'bg-white/10 border-white/15'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full transition-transform ${
                    smartGrouping
                      ? 'translate-x-6 bg-[#121514]'
                      : 'translate-x-1 bg-[#F5F2EA]/80'
                  }`}
                />
              </span>
            </button>
          </section>

          <div className="h-px bg-white/10" aria-hidden="true" />

          {/* Account & Cross-Device Sync */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
              <h3 className="text-xs font-semibold tracking-wide text-[#D4AF37]">
                Cross-Device Sync
              </h3>
            </div>

            {user ? (
              <div className="rounded-xl bg-[#0F1312] border border-white/10 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName ?? 'Signed-in user'}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/40 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-sm font-semibold shrink-0">
                      {(user.displayName ?? user.email ?? 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F5F2EA] truncate">
                      {user.displayName ?? 'Reader'}
                    </p>
                    <p className="text-xs text-[#9CA8A2] truncate">
                      {user.email ?? 'Likes, bookmarks & progress synced'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={authLoading}
                  className="min-h-[44px] px-3.5 rounded-xl border border-white/15 text-xs font-medium text-[#F5F2EA] hover:bg-white/5 flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-[#0F1312] border border-white/10 p-4 space-y-3">
                <p className="text-xs text-[#9CA8A2] leading-relaxed">
                  Your likes, bookmarks, and API.Bible key are saved on this device. Sign in with
                  Google to merge them and keep everything synced across devices.
                </p>

                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={authLoading}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D4AF37] text-[#121514] text-sm font-semibold hover:bg-[#E2BF4E] flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{authLoading ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>

                {authError && (
                  <p className="text-xs text-amber-300/90 leading-relaxed" role="alert">
                    {authError}
                  </p>
                )}
              </div>
            )}
          </section>

          {!isInstalled && (isInstallable || isIOS) && (
            <>
              <div className="h-px bg-white/10" aria-hidden="true" />

              {/* Install App */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
                  <h3 className="text-xs font-semibold tracking-wide text-[#D4AF37]">
                    Install App
                  </h3>
                </div>

                <div className="rounded-xl bg-[#0F1312] border border-white/10 p-4 space-y-3">
                  {isInstallable ? (
                    <>
                      <p className="text-xs text-[#9CA8A2] leading-relaxed">
                        Install BibleScroll on your home screen for a full-screen standalone
                        reading experience.
                      </p>
                      <button
                        type="button"
                        onClick={install}
                        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/12 text-[#F5F2EA] text-sm font-semibold hover:bg-[#D4AF37]/20 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4 text-[#D4AF37]" />
                        <span>Install BibleScroll</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-start gap-2.5 text-xs text-[#9CA8A2] leading-relaxed">
                      <Share className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" aria-hidden="true" />
                      <p>
                        To install on iPhone or iPad, tap <strong className="text-[#F5F2EA]">Share</strong> in
                        Safari and choose <strong className="text-[#F5F2EA]">Add to Home Screen</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Publisher Copyright Attribution Footer (visible whenever NLT, NASB, or CEV is active) */}
        {activeCopyright && (
          <footer className="px-5 py-3.5 border-t border-white/10 bg-[#121614] shrink-0">
            <p className="text-[11px] text-[#9CA8A2] leading-relaxed">{activeCopyright}</p>
          </footer>
        )}
      </div>
    </div>
  );
}
