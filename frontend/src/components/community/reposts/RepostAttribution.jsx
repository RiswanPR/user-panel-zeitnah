import React from 'react';
import { Link } from 'react-router-dom';
import { Repeat2 } from 'lucide-react';
import { getCanonicalProfileUrl } from '../../../utils/roleNavigation';

/**
 * RepostAttribution — Subtle, editorial attribution bar displayed
 * at the top of a reposted post in the feed.
 */
export default function RepostAttribution({ author }) {
  if (!author) return null;

  const authorName = author.name || author.displayName || author.username || 'Someone';
  const profileUrl = getCanonicalProfileUrl(author);

  return (
    <div className="flex items-center gap-2 text-xs font-medium text-text-muted mb-3 pl-1 -mt-1 select-none">
      <Repeat2 className="w-3.5 h-3.5 text-brand-mint/80 shrink-0" aria-hidden="true" />
      <span className="flex items-center gap-1 truncate">
        <Link
          to={profileUrl}
          className="text-text-secondary hover:text-brand-mint font-semibold transition-colors truncate focus:outline-none focus:underline"
          title={`View ${authorName}'s profile`}
        >
          {authorName}
        </Link>
        <span className="text-text-muted font-normal">reposted</span>
      </span>
    </div>
  );
}
