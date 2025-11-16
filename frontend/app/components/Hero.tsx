"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export default function Hero() {
  // — Slides —
  const slides = useMemo(
    () => [
      { img: "/images/5.jpg", title: "Autumn Layers", subtitle: "WOMEN · MEN" },
      { img: "/images/6.jpg", title: "Home In Order", subtitle: "STORAGE · LINEN" },
      { img: "/images/sonbahar.jpg", title: "Daily Essentials", subtitle: "STATIONERY · BEAUTY" },
    ],
    []
  );
  const COUNT = slides.length;

  // — Extended track: [last, ...slides, first] —
  const track = useMemo(() => [slides[COUNT - 1], ...slides, slides[0]], [slides, COUNT]);

  // pos: track içindeki görünür index (0..COUNT+1), 1..COUNT arasında gerçek
  const [pos, setPos] = useState(1);
  const [withTransition, setWithTransition] = useState(true);
  const [paused, setPaused] = useState(false);

  // Animasyon kilidi: geçiş bitmeden tekrar next/prev çalışmasın
  const lockRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goTo = (nextPos: number) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setWithTransition(true);
    setPos(nextPos);
  };
  const next = () => goTo(pos + 1);
  const prev = () => goTo(pos - 1);

  // Auto-play
  useEffect(() => {
    if (paused) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      // kilitliyken zorlama
      if (!lockRef.current) next();
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, pos]); // pos değişince timer yenilenir

  // Geçiş bittiğinde sonsuz döngü “zıplaması”
  const onTransitionEnd = () => {
    // Klonların birine geldiysen animasyonu kapat, gerçek indexe ışınla
    if (pos === 0) {
      setWithTransition(false);
      setPos(COUNT);
    } else if (pos === COUNT + 1) {
      setWithTransition(false);
      setPos(1);
    }
    // anim kapanmıyorsa normal durum
    // kilidi bırak
    lockRef.current = false;
  };

  // Animasyon kapalıyken bir frame sonra tekrar aç (flash’sız)
  useEffect(() => {
    if (!withTransition) {
      const id = requestAnimationFrame(() => setWithTransition(true));
      return () => cancelAnimationFrame(id);
    }
  }, [withTransition]);

  const visibleDot = (pos - 1 + COUNT) % COUNT; // 0..COUNT-1

  return (
    <section
      className="relative full-bleed"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Featured carousel"
    >
      <div className="overflow-hidden">
        <div
          className={`flex ${withTransition ? "transition-transform duration-700 ease-out" : ""}`}
          style={{ transform: `translateX(-${pos * 100}%)` }}
          onTransitionEnd={onTransitionEnd}
        >
          {track.map((s, i) => (
            <div key={i} className="min-w-full relative">
              <img
                src={s.img}
                alt={s.title}
                className="h-[520px] md:h-[600px] w-full object-cover block select-none"
                draggable={false}
                loading={i === pos ? "eager" : "lazy"}
              />
              <div className="absolute inset-0">
                <div className="container-base h-full">
                  <div className="h-full flex items-end pb-10">
                    <div className="bg-white/80 backdrop-blur-sm px-6 py-4 rounded-md md:px-8 md:py-5">
                      <p className="text-[11px] tracking-[0.2em] text-[#8a4b2e] uppercase">
                        {s.subtitle}
                      </p>
                      <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight mt-1">
                        {s.title}
                      </h1>
                      <div className="flex gap-5 mt-3 text-sm">
                        <Link href="#" className="underline underline-offset-4">Shop Women</Link>
                        <Link href="#" className="underline underline-offset-4">Shop Men</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav buttons */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-white/90 hover:bg-white border border-[var(--line)] text-xl"
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-white/90 hover:bg-white border border-[var(--line)] text-xl"
        aria-label="Next"
      >
        ›
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              // doğrudan gerçek slayta git
              if (lockRef.current) return;
              lockRef.current = true;
              setWithTransition(true);
              setPos(i + 1); // 1..COUNT
            }}
            className={`h-1.5 rounded-full transition-all ${
              visibleDot === i ? "bg-black/80 w-6" : "bg-black/25 w-3 hover:bg-black/40"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
