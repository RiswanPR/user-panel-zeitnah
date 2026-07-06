import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function VideoWatermark({ user }) {
  const [position, setPosition] = useState({ top: "5%", left: "5%" });
  const [time, setTime] = useState("");
  const deviceId = localStorage.getItem("device_id") || "Unknown Device";

  useEffect(() => {
    const move = setInterval(() => {
      const top = Math.max(5, Math.floor(Math.random() * 85)) + "%";
      const left = Math.max(5, Math.floor(Math.random() * 80)) + "%";
      setPosition({ top, left });
    }, 20000); // 20 seconds

    const clock = setInterval(() => {
      setTime(new Date().toLocaleString());
    }, 1000);

    return () => {
      clearInterval(move);
      clearInterval(clock);
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${position.top}-${position.left}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5 }}
        className="absolute z-50 pointer-events-none select-none"
        style={position}
      >
        <div className="bg-black/25 backdrop-blur-md px-3.5 py-2 rounded-xl text-white/50 text-[10px] font-medium leading-relaxed border border-white/5 shadow-2xl">
          <div>{user?.name || "Student"}</div>
          <div className="opacity-70">{user?.email || user?.userId || "Secure View"}</div>
          <div className="opacity-50 font-mono mt-0.5">{time}</div>
          <div className="opacity-40 font-mono mt-0.5 text-[8px] uppercase tracking-widest">{deviceId}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default VideoWatermark;