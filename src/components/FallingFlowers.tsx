import { useEffect, useRef } from "react";
import gsap from "gsap";

const COLORS: string[] = ["#f7c6d0", "#f4a9b8", "#fbe0e6", "#ffffff", "#eea0b2"];

/** Pétale seul */
function Petal({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%">
      <path d="M20 2C29 10 33 22 20 38C7 22 11 10 20 2Z" fill={color} />
      <path d="M20 8C21 18 21 26 20 34" stroke="#00000014" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** Petite fleur à 5 pétales (type fleur de cerisier) */
function Blossom({ color }: { color: string }) {
  return (
    <svg viewBox="-20 -20 40 40" width="100%" height="100%">
      {[0, 72, 144, 216, 288].map((a) => (
        <path
          key={a}
          transform={`rotate(${a})`}
          d="M0 -2C5 -6 6 -14 2 -18L0 -15L-2 -18C-6 -14 -5 -6 0 -2Z"
          fill={color}
        />
      ))}
      <circle r="3" fill="#e98aa0" />
      <circle r="1.3" fill="#ffd9a8" />
    </svg>
  );
}

/**
 * Couche de fleurs et pétales qui tombent en continu.
 * Remplit son parent (qui doit être en position relative).
 */
export function FallingFlowers({
  count = 28,
  colors = COLORS,
  className = "",
}: {
  count?: number;
  colors?: string[];
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(".flower", el);
      const r = gsap.utils.random;
      const small = innerWidth < 821;

      items.forEach((item) => {
        const h = el.offsetHeight || innerHeight;
        const w = el.offsetWidth || innerWidth;
        const depth = r(0.5, 1.3); // plus "proche" = plus grand, plus rapide
        gsap.set(item, {
          x: r(0, w),
          y: -60,
          scale: depth,
          opacity: gsap.utils.clamp(0.45, 1, depth),
          filter: !small && depth < 0.7 ? "blur(1.5px)" : "none", // pas de flou sur mobile (perf)
        });

        // chute verticale
        const fall = gsap.to(item, {
          y: h + 80,
          duration: r(9, 16) / depth,
          ease: "none",
          repeat: -1,
          onRepeat: () => gsap.set(item, { x: r(0, el.offsetWidth || innerWidth) }),
        });
        fall.progress(Math.random()); // déjà réparties à l'écran au départ

        // balancement horizontal
        gsap.to(item.firstElementChild, {
          x: small ? `random(20, 50)` : `random(40, 110)`,
          duration: r(2.5, 4.5),
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        // rotation + retournement 3D
        gsap.to(item.firstElementChild, {
          rotation: r(-360, 360),
          rotationX: r(120, 360),
          rotationY: r(60, 180),
          duration: r(5, 10),
          ease: "none",
          repeat: -1,
          yoyo: true,
        });
      });
    }, el);

    return () => ctx.revert();
  }, [count]);

  return (
    <div ref={root} className={`flowers ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const color = colors[i % colors.length] ?? "#f7c6d0";
        const blossom = i % 3 === 0;
        return (
          <div
            key={i}
            className="flower"
            style={{ width: blossom ? 30 : 20, height: blossom ? 30 : 20 }}
          >
            <div className="flower-inner">
              {blossom ? <Blossom color={color} /> : <Petal color={color} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
