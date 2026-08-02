import React, { useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

export default function VoicePlayer({ audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = speed;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSpeedToggle = () => {
    const speeds = [1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  return (
    <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 w-64">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <button
        onClick={togglePlay}
        className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex-shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Simulated Waveform Visualizer */}
      <div className="flex-1 flex items-center gap-0.5 h-6">
        {[40, 70, 30, 90, 50, 80, 40, 100, 60, 30, 80, 50, 90, 40, 70].map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className={`w-1 rounded-full ${
              isPlaying ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      <button
        onClick={handleSpeedToggle}
        className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-indigo-400 hover:bg-slate-700 border border-slate-700"
      >
        {speed}x
      </button>
    </div>
  );
}
