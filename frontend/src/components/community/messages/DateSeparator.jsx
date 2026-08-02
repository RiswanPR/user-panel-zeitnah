import React from 'react';
import dayjs from 'dayjs';

export default function DateSeparator({ date }) {
  const formatDate = (dateStr) => {
    const d = dayjs(dateStr);
    if (d.isSame(dayjs(), 'day')) return 'Today';
    if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
    return d.format('MMMM D, YYYY');
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider backdrop-blur-md">
        {formatDate(date)}
      </div>
    </div>
  );
}
