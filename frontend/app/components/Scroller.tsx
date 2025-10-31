"use client";
import { useRef } from "react";

export default function Scroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const by = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.min(600, Math.max(280, el.clientWidth * 0.8));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  let isDown = false, startX = 0, scrollStart = 0;

  const onMouseDown = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    isDown = true; startX = e.pageX; scrollStart = el.scrollLeft;
    el.classList.add("dragging");
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el || !isDown) return;
    el.scrollLeft = scrollStart - (e.pageX - startX);
  };
  const onMouseUp = () => { const el = ref.current; if (!el) return; isDown = false; el.classList.remove("dragging"); };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex overflow-x-auto gap-4 snap-x snap-mandatory no-scrollbar mask-horizontal cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseUp}
        onMouseUp={onMouseUp}
      >
        {children}
      </div>

      <button
        onClick={() => by(-1)}
        className="scroller-btn left-0"
        aria-label="Scroll left"
      >‹</button>
      <button
        onClick={() => by(1)}
        className="scroller-btn right-0"
        aria-label="Scroll right"
      >›</button>
    </div>
  );
}
