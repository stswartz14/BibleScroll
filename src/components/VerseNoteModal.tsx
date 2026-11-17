import { useEffect, useState } from 'react';
import { Heart, PenLine, Trash2, X } from 'lucide-react';
import type { VerseCardItem } from '../services/scriptureApi';
import type { NoteKind, VerseNoteRecord } from '../services/userStore';

export interface VerseNoteTarget {
  card?: VerseCardItem;
  existing?: VerseNoteRecord;
}

interface VerseNoteModalProps {
  isOpen: boolean;
  isSignedIn: boolean;
  target: VerseNoteTarget | null;
  onClose: () => void;
  onSave: (noteKind: NoteKind, noteText: string) => void;
  onDelete?: (verseKey: string) => void;
}

const MAX_NOTE_CHARS = 2000;

export function VerseNoteModal({
  isOpen,
  isSignedIn,
  target,
  onClose,
  onSave,
  onDelete,
}: VerseNoteModalProps) {
  const [noteKind, setNoteKind] = useState<NoteKind>('note');
  const [noteText, setNoteText] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !target) return;
    setNoteKind(target.existing?.noteKind ?? 'note');
    setNoteText(target.existing?.noteText ?? '');
  }, [isOpen, target]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;

  const reference = target.card?.reference ?? target.existing?.reference ?? '';
  const translation = target.card?.translation ?? target.existing?.translation ?? 'BSB';
  const verseText = target.card?.combinedText ?? target.existing?.verseText ?? '';
  const trimmed = noteText.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= MAX_NOTE_CHARS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave(noteKind, trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Notes and prayers for ${reference}`}
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full sm:max-w-lg max-h-[88dvh] rounded-t-3xl sm:rounded-2xl bg-[#161B19] border border-[#D4AF37]/25 flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#F5F2EA] truncate">
              {target.existing ? 'Edit Note or Prayer' : 'Add Note or Prayer'}
            </h2>
            <p className="text-xs text-[#9CA8A2] mt-0.5 flex items-center gap-1.5">
              <span className="text-[#F5F2EA]/85 font-medium truncate">{reference}</span>
              <span aria-hidden="true" className="text-[#D4AF37]/60">
                ·
              </span>
              <span className="text-[#D4AF37] font-semibold">{translation}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close note editor"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Scripture Preview */}
          {verseText && (
            <div className="pb-3 border-b border-white/[0.08]">
              <p className="font-scripture text-lg text-[#F5F2EA]/85 leading-snug line-clamp-3 whitespace-pre-line">
                {verseText}
              </p>
            </div>
          )}

          {/* Note vs Prayer Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0F1312] border border-white/10">
            <button
              type="button"
              onClick={() => setNoteKind('note')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                noteKind === 'note'
                  ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                  : 'text-[#9CA8A2] hover:text-[#F5F2EA]'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Study Note</span>
            </button>
            <button
              type="button"
              onClick={() => setNoteKind('prayer')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                noteKind === 'prayer'
                  ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                  : 'text-[#9CA8A2] hover:text-[#F5F2EA]'
              }`}
            >
              <Heart className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Prayer</span>
            </button>
          </div>

          {/* Editor */}
          <div className="space-y-2">
            <label htmlFor="verse-note-textarea" className="sr-only">
              {noteKind === 'prayer' ? 'Prayer text' : 'Study note text'}
            </label>
            <textarea
              id="verse-note-textarea"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, MAX_NOTE_CHARS))}
              maxLength={MAX_NOTE_CHARS}
              rows={5}
              placeholder={
                noteKind === 'prayer'
                  ? 'Write a prayer inspired by this passage...'
                  : 'Write a personal reflection or study note...'
              }
              className="w-full rounded-xl bg-[#0F1312] border border-white/10 focus:border-[#D4AF37]/60 focus:outline-none px-4 py-3 text-sm text-[#F5F2EA] placeholder:text-[#9CA8A2]/60 leading-relaxed resize-y min-h-[132px]"
            />
            <div className="flex items-center justify-between text-[11px] text-[#9CA8A2] tabular-nums">
              <span>
                {isSignedIn
                  ? 'Synced to your account'
                  : 'Saved on this device · Sign in via Settings to sync'}
              </span>
              <span>
                {noteText.length.toLocaleString()}/{MAX_NOTE_CHARS.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 bg-[#0F1312] flex items-center justify-between gap-3">
          {target.existing && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(target.existing!.verseKey)}
              aria-label={`Delete note for ${reference}`}
              className="min-h-[44px] px-3.5 rounded-xl border border-white/10 text-xs font-medium text-rose-300 hover:bg-rose-500/10 hover:border-rose-400/35 flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Delete</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-white/10 text-xs font-medium text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="min-h-[44px] px-5 rounded-xl bg-[#D4AF37] text-[#121514] text-xs font-semibold hover:bg-[#E2BF4E] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
            >
              {noteKind === 'prayer' ? 'Save Prayer' : 'Save Note'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
