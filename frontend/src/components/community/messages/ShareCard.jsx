import React from 'react';
import { BookOpen, FolderGit2, Briefcase, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ShareCard({ type, metadata }) {
  if (!metadata) return null;

  if (type === 'COURSE') {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 my-2 space-y-2 max-w-sm">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>Shared Course</span>
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white">{metadata.title || 'Engineering Course'}</h4>
          <p className="text-[11px] text-slate-400 line-clamp-2">
            {metadata.description || 'Comprehensive course material & lectures on Zeitnah.'}
          </p>
        </div>
        <Link
          to={`/courses/${metadata.courseId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow"
        >
          <span>View Course</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  if (type === 'PROJECT') {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 my-2 space-y-2 max-w-sm">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
          <FolderGit2 className="w-4 h-4" />
          <span>Portfolio Project</span>
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white">{metadata.title || 'Student Project'}</h4>
          <p className="text-[11px] text-slate-400 line-clamp-2">
            {metadata.description || 'Full-stack engineering portfolio showcase project.'}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {metadata.githubUrl && (
            <a
              href={metadata.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1"
            >
              <span>GitHub</span>
            </a>
          )}
          {metadata.demoUrl && (
            <a
              href={metadata.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white flex items-center gap-1 font-semibold"
            >
              <span>Live Demo</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  if (type === 'PLACEMENT') {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 my-2 space-y-2 max-w-sm">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Briefcase className="w-4 h-4" />
          <span>Placement Resource</span>
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white">{metadata.title || 'Interview Preparation Guide'}</h4>
          <p className="text-[11px] text-slate-400 line-clamp-2">
            {metadata.description || 'Company interview experiences, aptitude sheets, & coding questions.'}
          </p>
        </div>
        {metadata.linkUrl && (
          <a
            href={metadata.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow"
          >
            <span>Open Resource</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return null;
}
