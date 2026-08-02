import React from 'react';

export default function OnlineBadge({ status = 'OFFLINE', size = 'sm' }) {
  const isOnline = status === 'ONLINE';

  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className={`rounded-full border-2 border-slate-900 ${
          sizeClasses[size] || sizeClasses.sm
        } ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}
      />
      {isOnline && (
        <div
          className={`absolute rounded-full bg-emerald-400 animate-ping opacity-75 ${
            sizeClasses[size] || sizeClasses.sm
          }`}
        />
      )}
    </div>
  );
}
