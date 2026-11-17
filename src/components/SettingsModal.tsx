import { Check, Cloud, LogIn, LogOut, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { TranslationCode } from '../services/scriptureApi';

interface SettingsModalProps {
  isOpen: boolean;
  translation: TranslationCode;
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  onClose: () => void;
  onChangeTranslation: (next: TranslationCode) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

const TRANSLATIONS: Array<{
  code: TranslationCode;
  name: string;
  source: string;
}> = [
  {
    code: 'BSB',
    name: 'Berean Standard Bible',
    source: 'Free Use Bible API · Default',
  },
  {
    code: 'WEB',
    name: 'World English Bible',
    source: 'Bible-API Public Domain',
  },
];

export function SettingsModal({
  isOpen,
  translation,
  user,
  authLoading,
  authError,
  onClose,
  onChangeTranslation,
  onSignIn,
  onSignOut,
}: SettingsModalProps) {
  if (!isOpen) return null;

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

      <div className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#161B19] border border-[#D4AF37]/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
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

        <div className="p-5 space-y-6">
          {/* Translation Selector */}
          <section className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-[#D4AF37]">
                Scripture Translation
              </h3>
              <p className="text-xs text-[#9CA8A2] mt-1">
                Every verse is fetched verbatim with no API key required.
              </p>
            </div>

            <div className="space-y-2">
              {TRANSLATIONS.map((item) => {
                const isSelected = translation === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => onChangeTranslation(item.code)}
                    aria-pressed={isSelected}
                    className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-[#D4AF37]/12 border-[#D4AF37] text-[#F5F2EA]'
                        : 'bg-[#0F1312] border-white/10 text-[#F5F2EA] hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{item.code}</span>
                        <span aria-hidden="true" className="text-[#9CA8A2]">
                          ·
                        </span>
                        <span className="text-sm text-[#F5F2EA]/90">{item.name}</span>
                      </div>
                      <p className="text-xs text-[#9CA8A2] mt-0.5">{item.source}</p>
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
                  Your likes and bookmarks are saved on this device. Sign in with Google to merge
                  them and keep your reading place synced across devices.
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
        </div>
      </div>
    </div>
  );
}
