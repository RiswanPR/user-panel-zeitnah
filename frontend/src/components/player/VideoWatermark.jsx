import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const positions = [
  { top: "1.5rem", left: "1.5rem" },
  { top: "1.5rem", right: "1.5rem" },
  { bottom: "1.5rem", left: "1.5rem" },
  { bottom: "1.5rem", right: "1.5rem" },
];

function VideoWatermark({ user }) {
  const [posIndex, setPosIndex] = useState(0);
  const [time, setTime] = useState("");

  useEffect(() => {
    const move = setInterval(() => {
      setPosIndex(Math.floor(Math.random() * 4));
    }, 10000);

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
        key={posIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute z-50 pointer-events-none select-none"
        style={positions[posIndex]}
      >
        <div className="bg-black/25 backdrop-blur-lg px-3.5 py-2 rounded-xl text-white/60 text-[10px] font-medium leading-relaxed border border-white/5">
          <div>{user?.name}</div>
          <div className="opacity-70">{user?.email}</div>
          <div className="opacity-50">{time}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default VideoWatermark;