import React, { useState, useRef } from 'react';
import { Mic, Square, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VoiceRecorder({ onSendVoice, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      toast.error('Microphone permission required for voice notes');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      onSendVoice(file);
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 w-full text-xs">
      {!recording && !audioBlob ? (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 font-semibold"
        >
          <Mic className="w-4 h-4" />
          <span>Hold to Record Voice Note</span>
        </button>
      ) : recording ? (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-red-400 font-bold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Recording {formatSeconds(recordingTime)}</span>
          </div>

          <button
            type="button"
            onClick={stopRecording}
            className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full gap-2">
          <span className="text-slate-300 font-medium">
            Voice Note ready ({formatSeconds(recordingTime)})
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAudioBlob(null);
                if (onCancel) onCancel();
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-1.5 hover:bg-indigo-500"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Voice</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
