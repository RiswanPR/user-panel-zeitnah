import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function MainLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11V11a1 1 0 00-1-1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/courses', label: 'Courses & Batches', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { path: '/students', label: 'Enrollments', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { path: '/settings', label: 'System Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div className="min-h-screen bg-[#07192a] text-white font-['DM_Sans'] antialiased flex flex-col md:flex-row">
      
      {/* MOBILE APPLICATION NAVBAR TOP HEADER HEADER BANNER */}
      <header className="w-full h-16 bg-[#0d2035] border-b border-[rgba(159,213,178,0.15)] flex items-center justify-between px-4 sticky top-0 z-40 md:hidden shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-[#9fd5b2]" viewBox="0 0 160 160" fill="currentColor">
            <path d="M40,50 C65,25 115,35 125,65 C135,95 70,125 80,155 C90,185 140,175 160,150 L140,180 C110,205 60,195 50,165 C40,135 105,105 95,75 C85,45 50,55 30,75 Z" transform="translate(-15, -25) scale(0.9)"/>
          </svg>
          <span className="text-sm font-black uppercase tracking-wider text-white">Zeitnah</span>
        </div>
        
        {/* HAMBURGER TRIGGER BUTTON */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-white/[0.04] border border-[rgba(159,213,178,0.15)] text-[#9fd5b2] hover:bg-white/[0.08] active:scale-95 transition-all outline-none"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            {isSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* MOBILE TRANSPARENT BACKGROUND OVERLAY SHIELD */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* COMPACT INTERACTIVE SIDEBAR NAVIGATION */}
      <aside className={`fixed top-16 bottom-0 left-0 w-64 bg-[#0d2035] border-r border-[rgba(159,213,178,0.15)] flex flex-col z-40 md:sticky md:top-0 md:h-screen transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out shrink-0`}>
        
        {/* Desktop Title Banner Logo Node */}
        <div className="hidden p-6 border-b border-[rgba(159,213,178,0.1)] md:flex items-center gap-3 select-none">
          <svg className="w-7 h-7 text-[#9fd5b2]" viewBox="0 0 160 160" fill="currentColor">
            <path d="M40,50 C65,25 115,35 125,65 C135,95 70,125 80,155 C90,185 140,175 160,150 L140,180 C110,205 60,195 50,165 C40,135 105,105 95,75 C85,45 50,55 30,75 Z" transform="translate(-15, -25) scale(0.9)"/>
          </svg>
          <span className="text-sm font-black tracking-wider uppercase text-white" style={{ fontWeight: 900 }}>
            Zeitnah
          </span>
        </div>

        {/* Navigation Item Engine */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/[0.04] text-[#9fd5b2] border border-[rgba(159,213,178,0.25)]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <svg 
                  className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-[#9fd5b2]' : 'text-white/30 group-hover:text-white/60'}`} 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span>{item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#f6ed4a]" />}
              </Link>
            );
          })}
        </nav>

        {/* Footprint Operations Block */}
        <div className="p-4 border-t border-[rgba(159,213,178,0.1)] bg-[#07192a]/30 flex items-center gap-3 select-none">
          <div className="w-8 h-8 rounded-full bg-[#1a4468] border border-[rgba(159,213,178,0.3)] flex items-center justify-center font-bold text-xs text-[#9fd5b2]">
            OP
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate text-white">Operations Desk</p>
            <p className="text-[10px] text-white/40 truncate font-medium">Thrissur Campus</p>
          </div>
        </div>
      </aside>

      {/* PRIMARY WORKSPACE MAIN FRAMEFLOW CONTENT WRAPPER */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full max-w-full">
        <Outlet /> 
      </main>

    </div>
  );
}