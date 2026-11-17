import { useEffect, useMemo, useState } from 'react';
import { NotebookPen, PenLine, Search, Trash2, X } from 'lucide-react';
import type { VerseNoteRecord } from '../services/userStore';

interface NotesModalProps {
  isOpen: boolean;
  isSignedIn: boolean;
  notes: VerseNoteRecord[];
  onClose: () => void;
  onJumpToVerse: (record: { bookId: string; chapter: number; verse: number }) => void;
  onEditNote: (note: VerseNoteRecord) => void;
  onDeleteNote: (verseKey: string) => void;
  onOpenSettings: () => void;
}

function formatShortDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function NotesModal({
  isOpen,
  isSignedIn,
  notes,
  onClose,
  onJumpToVerse,
  onEditNote,
  onDeleteNote,
  onOpenSettings,
}: NotesModalProps) {
  const [filterKind, setFilterKind] = useState<'all' | 'note' | 'prayer'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
  }, [isOpen]);

  const counts = useMemo(() => {
    let studyNotes = 0;
    let prayers = 0;
    for (const n of notes) {
      if (n.noteKind === 'prayer') prayers += 1;
      else studyNotes += 1;
    }
    return { all: notes.length, studyNotes, prayers };
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (filterKind !== 'all' && note.noteKind !== filterKind) {
        return false;
      }
      if (!q) return true;
      return (
        note.reference.toLowerCase().includes(q) ||
        note.noteText.toLowerCase().includes(q) ||
        note.verseText.toLowerCase().includes(q)
      );
    });
  }, [filterKind, notes, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Notes and Prayers"
    >
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full sm:max-w-xl h-[88dvh] sm:h-auto sm:max-h-[86dvh] rounded-t-3xl sm:rounded-2xl bg-[#161B19] border border-[#D4AF37]/20 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#F5F2EA]">Notes &amp; Prayers</h2>
            <p className="text-xs text-[#9CA8A2] mt-0.5 tabular-nums">
              <span>{counts.studyNotes} notes</span>
              <span aria-hidden="true" className="mx-1.5 text-white/25">
                ·
              </span>
              <span>{counts.prayers} prayers</span>
              <span aria-hidden="true" className="mx-1.5 text-white/25">
                ·
              </span>
              <span>{isSignedIn ? 'Synced' : 'Saved on device'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notes and prayers"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Controls */}
        <div className="px-5 py-3 border-b border-white/10 space-y-2.5 bg-[#121614]/60">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0F1312] border border-white/10">
            <button
              type="button"
              onClick={() => setFilterKind('all')}
              className={`min-h-[38px] px-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors tabular-nums ${
                filterKind === 'all'
                  ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                  : 'text-[#9CA8A2] hover:text-[#F5F2EA]'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterKind('note')}
              className={`min-h-[38px] px-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors tabular-nums ${
                filterKind === 'note'
                  ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                  : 'text-[#9CA8A2] hover:text-[#F5F2EA]'
              }`}
            >
              Notes ({counts.studyNotes})
            </button>
            <button
              type="button"
              onClick={() => setFilterKind('prayer')}
              className={`min-h-[38px] px-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors tabular-nums ${
                filterKind === 'prayer'
                  ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                  : 'text-[#9CA8A2] hover:text-[#F5F2EA]'
              }`}
            >
              Prayers ({counts.prayers})
            </button>
          </div>

          {notes.length > 0 && (
            <div className="relative">
              <Search
                className="w-4 h-4 text-[#9CA8A2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, prayers, or verses..."
                aria-label="Search notes and prayers"
                className="w-full min-h-[42px] pl-10 pr-4 rounded-xl bg-[#0F1312] border border-white/10 focus:border-[#D4AF37]/60 focus:outline-none text-xs sm:text-sm text-[#F5F2EA] placeholder:text-[#9CA8A2]/60"
              />
            </div>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
          {notes.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-11 h-11 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mx-auto">
                <NotebookPen className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="font-scripture text-2xl text-[#F5F2EA]">No notes or prayers yet</p>
              <p className="text-xs text-[#9CA8A2] max-w-xs mx-auto leading-relaxed">
                Tap the Notes icon next to Copy and Share on any verse card to record a study note
                or prayer.
              </p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="font-scripture text-xl text-[#F5F2EA]">No matching entries</p>
              <p className="text-xs text-[#9CA8A2]">
                Try clearing your search or switching filters.
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const dateLabel = formatShortDate(note.updatedAtMs);
              return (
                <div
                  key={note.verseKey}
                  className="px-5 py-4 flex items-start justify-between gap-2 hover:bg-white/[0.03] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onJumpToVerse(note)}
                    className="flex-1 text-left space-y-2 min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium">
                      <span className="text-[#F5F2EA]">{note.reference}</span>
                      <span aria-hidden="true" className="text-[#D4AF37]/60">
                        ·
                      </span>
                      <span className="text-[#D4AF37]">{note.translation}</span>
                      <span aria-hidden="true" className="text-[#D4AF37]/60">
                        ·
                      </span>
                      <span
                        className={
                          note.noteKind === 'prayer' ? 'text-[#6FD3D8]' : 'text-[#D4AF37]/90'
                        }
                      >
                        {note.noteKind === 'prayer' ? 'Prayer' : 'Note'}
                      </span>
                      {dateLabel && (
                        <>
                          <span aria-hidden="true" className="text-white/25">
                            ·
                          </span>
                          <span className="text-[#9CA8A2] font-normal tabular-nums">
                            {dateLabel}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-[#F5F2EA]/95 leading-relaxed whitespace-pre-line">
                      {note.noteText}
                    </p>

                    <p className="font-scripture text-sm text-[#9CA8A2] leading-snug line-clamp-2">
                      “{note.verseText}”
                    </p>
                  </button>

                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditNote(note)}
                      aria-label={`Edit note for ${note.reference}`}
                      className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-[#D4AF37] hover:bg-white/5 transition-colors"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.verseKey)}
                      aria-label={`Delete note for ${note.reference}`}
                      className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-rose-400 hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!isSignedIn && (
          <div className="px-5 py-3.5 border-t border-white/10 bg-[#0F1312] flex items-center justify-between gap-3">
            <span className="text-xs text-[#9CA8A2]">
              Sign in with Google to sync notes across devices
            </span>
            <button
              type="button"
              onClick={onOpenSettings}
              className="min-h-[40px] px-3.5 rounded-lg bg-[#D4AF37] text-[#121514] text-xs font-semibold whitespace-nowrap shrink-0 hover:bg-[#E2BF4E] transition-colors"
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
