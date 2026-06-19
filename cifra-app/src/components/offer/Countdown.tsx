"use client";

import { useEffect, useState } from "react";

export function Countdown() {
  const [seconds, setSeconds] = useState(9 * 60 + 47);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <span className="font-mono font-bold">
      {minutes}:{secs}
    </span>
  );
}
