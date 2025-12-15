"use client";

import { useState, useEffect } from "react";

export default function InvertToggle() {
  const [isInverted, setIsInverted] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load initial state from localStorage and apply
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("invertColors");
    const isInvertedStored = saved === "true";
    setIsInverted(isInvertedStored);
    
    if (isInvertedStored) {
      document.documentElement.classList.add("invert-colors");
    }
  }, []);

  const handleToggle = () => {
    const newState = !isInverted;
    setIsInverted(newState);
    localStorage.setItem("invertColors", newState.toString());
    
    if (newState) {
      document.documentElement.classList.add("invert-colors");
    } else {
      document.documentElement.classList.remove("invert-colors");
    }
  };

  // Hydration fix: don't render until client-side
  if (!mounted) return null;

  return (
    <button
      onClick={handleToggle}
      title={isInverted ? "Normal Mode" : "Invert Mode"}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white transition hover:bg-gray-100 relative"
      aria-label="Toggle color inversion"
    >
      {isInverted ? (
        // Sun icon - shown when inverted
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        // Moon icon - shown in normal mode
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

