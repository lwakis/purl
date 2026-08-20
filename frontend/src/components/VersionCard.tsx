import { ArrowDownTrayIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { useT } from '../i18n';
import type { ProjectVersion } from '../types';

interface VersionCardProps {
  version: ProjectVersion;
  bookmarked: boolean;
  onRestore: () => void;
  onDownload: () => void;
  onBookmark: () => void;
}

export default function VersionCard({
  version,
  bookmarked,
  onRestore,
  onDownload,
  onBookmark,
}: VersionCardProps) {
  const { t } = useT();

  // A snapshot without code cannot be restored or downloaded — hide it.
  if (!version.code) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRestore();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onRestore}
      onKeyDown={handleKeyDown}
      className="group rounded-lg border border-line bg-surface-800/60 p-3 flex items-center gap-3 transition-colors hover:border-line-strong hover:bg-surface-800 focus-ring cursor-pointer shadow-segment-inset"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-surface-100 truncate">
          {version.message || t('chat.version', { num: version.version_num })}
        </div>
        <div className="exposure-label text-surface-500 mt-0.5">
          {t('chat.version', { num: version.version_num })} ·{' '}
          {new Date(version.created_at).toLocaleString()}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          title={t('chat.downloadVersion')}
          aria-label={t('chat.downloadVersion')}
          className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-surface-400 hover:text-surface-100 hover:border-line-strong transition-colors focus-ring active:scale-95"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBookmark();
          }}
          title={bookmarked ? t('chat.bookmarked') : t('chat.bookmark')}
          aria-label={bookmarked ? t('chat.bookmarked') : t('chat.bookmark')}
          aria-pressed={bookmarked}
          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors focus-ring active:scale-95 ${
            bookmarked
              ? 'text-primary-400 border-primary-500/40 bg-primary-600/10'
              : 'border-line text-surface-400 hover:text-surface-100 hover:border-line-strong'
          }`}
        >
          <BookmarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
