import { useEffect, useState } from 'react';
import { AlertCircle, Check, KeyRound, X } from 'lucide-react';
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

interface TranslationPickerModalProps {
  isOpen: boolean;
  translation: TranslationCode;
  apiBibleKey: string;
  resolvedApiBibleIds: ResolvedApiBibleIds | null;
  onClose: () => void;
  onSelectTranslation: (next: TranslationCode) => void;
  onOpenApiKeySettings: (requestedTranslation?: ApiBibleTranslationCode) => void;
}

export function TranslationPickerModal({
  isOpen,
  translation,
  apiBibleKey,
  resolvedApiBibleIds,
  onClose,
  onSelectTranslation,
  onOpenApiKeySettings,
}: TranslationPickerModalProps) {
  const [missingKeyFor, setMissingKeyFor] = useState<ApiBibleTranslationCode | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMissingKeyFor(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasSavedKey = apiBibleKey.trim().length > 0;
  const activeCopyright = isApiBibleTranslation(translation)
    ? API_BIBLE_COPYRIGHTS[translation]
    : null;

  const handleChoose = (option: TranslationOption) => {
    if (option.requiresApiBibleKey && !hasSavedKey) {
      setMissingKeyFor(option.code as ApiBibleTranslationCode);
      return;
    }

    onSelectTranslation(option.code);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose Scripture Translation"
    >
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full sm:max-w-md max-h-[85dvh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[#161B19] border border-[#D4AF37]/20 shadow-2xl overflow-hidden">
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0" aria-hidden="true">
          <span className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#F5F2EA]">Scripture Translation</h2>
            <p className="text-xs text-[#9CA8A2] mt-0.5">
              Tap any version to switch immediately
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close translation picker"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Translation List */}
        <div className="p-4 sm:p-5 space-y-2 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {missingKeyFor && !hasSavedKey && (
            <div
              role="alert"
              className="mb-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/45 p-3.5 space-y-2.5"
            >
              <div className="flex items-start gap-2.5 text-xs text-[#F5F2EA]">
                <AlertCircle
                  className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">
                  <strong>{missingKeyFor}</strong> uses API.Bible. Add your personal API.Bible key
                  in Settings to unlock NLT, NASB 2020, and CEV.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenApiKeySettings(missingKeyFor)}
                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#D4AF37] text-[#121514] text-xs font-semibold hover:bg-[#E2BF4E] flex items-center justify-center gap-2 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add API.Bible Key in Settings</span>
              </button>
            </div>
          )}

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
                onClick={() => handleChoose(item)}
                aria-pressed={isSelected}
                className={`w-full min-h-[58px] px-4 py-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors active:scale-[0.99] ${
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

        {/* Footer */}
        <footer className="px-5 py-3 border-t border-white/10 bg-[#121614] shrink-0 space-y-2 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:pb-3">
          {activeCopyright && (
            <p className="text-[11px] text-[#9CA8A2] leading-relaxed">{activeCopyright}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-[#9CA8A2]">
              {hasSavedKey ? 'API.Bible key saved' : 'Using free translations'}
            </span>
            <button
              type="button"
              onClick={() => onOpenApiKeySettings()}
              className="min-h-[36px] px-2.5 -mr-2 rounded-lg text-xs font-medium text-[#D4AF37] hover:bg-[#D4AF37]/10 whitespace-nowrap transition-colors"
            >
              {hasSavedKey ? 'Manage API Key' : 'Set API.Bible Key'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
