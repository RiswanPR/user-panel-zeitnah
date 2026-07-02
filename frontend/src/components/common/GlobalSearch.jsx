import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, BookOpen, FileText, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/courses/global-search?q=\${encodeURIComponent(query)}`);
        setResults(res.data.results || []);
        setIsOpen(true);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');
    if (item.type === 'course') navigate(`/courses/\${item.courseId}`);
    if (item.type === 'chapter') navigate(`/courses/\${item.courseId}?chapter=\${item.chapterCode}`);
    if (item.type === 'class') navigate(`/courses/class/\${item.classId}`);
  };

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(\${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? 
            <span key={i} className="text-brand-mint font-bold">{part}</span> : part
        )}
      </span>
    );
  };

  return (
    <div className="relative w-full max-w-md z-50" ref={dropdownRef}>
      <div className="relative flex items-center w-full h-10 rounded-xl bg-white/10 border border-white/10 overflow-hidden focus-within:border-brand-mint/50 focus-within:bg-white/15 transition-all">
        <div className="grid place-items-center h-full w-12 text-white/50">
          <Search className="w-4 h-4" />
        </div>
        <input
          className="peer h-full w-full outline-none text-sm text-white bg-transparent pr-4 placeholder:text-white/40"
          type="text"
          id="search"
          placeholder="Search courses, chapters, lessons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto">
          {results.map((item, index) => (
            <button
              key={index}
              onClick={() => handleSelect(item)}
              className="w-full flex items-start gap-4 p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
            >
              <div className="mt-1 shrink-0 p-2 rounded-lg bg-white/5 text-brand-mint">
                {item.type === 'course' && <BookOpen className="w-4 h-4" />}
                {item.type === 'chapter' && <FileText className="w-4 h-4" />}
                {item.type === 'class' && <PlayCircle className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">
                  {highlightText(item.title, query)}
                </div>
                <div className="text-xs text-text-muted mt-1 truncate">
                  <span className="uppercase text-[10px] font-bold text-white/40 tracking-wider mr-2">{item.type}</span>
                  {item.description ? highlightText(item.description, query) : 'No description available'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && !isLoading && results.length === 0 && query.trim() && (
        <div className="absolute top-full left-0 w-full mt-2 bg-bg-card border border-white/10 rounded-2xl shadow-2xl p-6 text-center">
          <p className="text-sm text-text-muted">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
