import { useState } from 'react';
import { Bookmark, Heart, Trash2, X } from 'lucide-react';
import type { SavedVerseRecord } from '../services/userStore';

interface BookmarksModalProps {
  isOpen: boolean;
  isSignedIn: boolean;
  bookmarks: SavedVerseRecord[];
  likes: SavedVerseRecord[];
  onClose: () => void;
  onJumpToVerse: (record: SavedVerseRecord) => void;
  onRemoveSaved: (kind: 'bookmarks' | 'likes', record: SavedVerseRecord) => void;
  onOpenSettings: () => void;
}

export function BookmarksModal({
  isOpen,
  isSignedIn,
  bookmarks,
  likes,
  onClose,
  onJumpToVerse,
  onRemoveSaved,
  onOpenSettings,
}: BookmarksModalProps) {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'likes'>('bookmarks');

  if (!isOpen) return null;

  const items = activeTab === 'bookmarks' ? bookmarks : likes;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Saved Verses and Likes"
    >
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full sm:max-w-lg max-h-[85dvh] rounded-t-3xl sm:rounded-2xl bg-[#161B19] border border-[#D4AF37]/20 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#F5F2EA]">Saved Scripture</h2>
            <p className="text-xs text-[#9CA8A2] mt-0.5">
              {isSignedIn
                ? 'Synced across your devices'
                : 'Saved on this device · Sign in via Settings to sync'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close saved verses"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0F1312] border border-white/10 w-full">
            <button
              type="button"
              onClick={() => setActiveTab('bookmarks')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'bookmarks'
                  ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                  : 'text-[#9CA8A2] hover:text-[#F5F2EA]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Bookmarks ({bookmarks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('likes')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'likes'
                  ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                  : 'text-[#9CA8A2] hover:text-[#F5F2EA]'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Liked ({likes.length})</span>
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
          {items.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="font-scripture text-2xl text-[#F5F2EA]">
                {activeTab === 'bookmarks' ? 'No bookmarked verses yet' : 'No liked verses yet'}
              </p>
              <p className="text-xs text-[#9CA8A2] max-w-xs mx-auto leading-relaxed">
                Tap {activeTab === 'bookmarks' ? 'Bookmark' : 'Like'} beneath any verse card while
                reading to keep it close at hand.
              </p>
            </div>
          ) : (
            items.map((record) => (
              <div
                key={record.verseKey}
                className="px-5 py-4 flex items-start justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onJumpToVerse(record)}
                  className="flex-1 text-left space-y-1.5 min-w-0"
                >
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-[#F5F2EA]">{record.reference}</span>
                    <span aria-hidden="true" className="text-[#D4AF37]/60">
                      ·
                    </span>
                    <span className="text-[#D4AF37]">{record.translation}</span>
                  </div>
                  <p className="font-scripture text-lg text-[#F5F2EA]/85 leading-snug whitespace-pre-line line-clamp-3">
                    {record.text}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveSaved(activeTab, record)}
                  aria-label={`Remove ${record.reference}`}
                  className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-rose-400 hover:bg-white/5 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {!isSignedIn && (
          <div className="px-5 py-3.5 border-t border-white/10 bg-[#0F1312] flex items-center justify-between gap-3">
            <span className="text-xs text-[#9CA8A2]">
              Sign in with Google to sync across devices
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
