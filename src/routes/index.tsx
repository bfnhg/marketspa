import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { WaterScene, type WaterHandle } from "@/components/WaterScene";
import { WaterAudio } from "@/lib/water-audio";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Tidewell Studio — Creating the unexpected" },
    { name: "description", content: "A brand, digital & motion studio. Step into a dreamlike flooded room that ripples as you move." },
    { property: "og:title", content: "Tidewell Studio — Creating the unexpected" },
    { property: "og:description", content: "A brand, digital & motion studio. Step into a dreamlike flooded room that ripples as you move." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  const water = useRef<WaterHandle | null>(null);
  const audio = useRef(new WaterAudio());
  const cursor = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const [vol, setVol] = useState(0.6);
  const [big, setBig] = useState(false);
  const hover = (v: boolean) => { water.current?.setCalm(v); audio.current.muffle(v); setBig(v); };

  useEffect(() => {
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0;
    const mv = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; };
    const loop = () => { x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      if (cursor.current) cursor.current.style.transform = `translate(${x}px,${y}px)`; raf = requestAnimationFrame(loop); };
    addEventListener("pointermove", mv); loop();
    return () => { removeEventListener("pointermove", mv); cancelAnimationFrame(raf); };
  }, []);

  const hv = { onPointerEnter: () => setBig(true), onPointerLeave: () => setBig(false) };
  return (
    <main className="fixed inset-0 overflow-hidden bg-background text-foreground">
      <WaterScene handle={water} onReady={() => setTimeout(() => setReady(true), 300)} />
      <div className={`loader ${ready ? "gone" : ""}`}><span /></div>
      <div ref={cursor} className="cursor"><span className={big ? "big" : ""} /></div>
      <div className={`ui ${ready ? "on" : ""}`}>
        <header className="ui-head">
          <a href="#" className="brand" {...hv}>tidewell studio<sup>®</sup></a>
          <nav>
            <a href="#" {...hv}>Index</a><a href="#" {...hv}>Projects</a><a href="#" {...hv}>Contact</a>
            <button className="dot-btn" aria-label="Menu" {...hv}><i /><i /></button>
          </nav>
        </header>
        <section className="hero">
          <p className="kicker reveal" style={{ ["--d" as string]: ".1s" }}>A brand, digital &amp; motion studio</p>
          <h1>
            <span className="serif reveal" style={{ ["--d" as string]: ".25s" }}>Creating the</span>
            <span className="sans reveal" style={{ ["--d" as string]: ".4s" }}>unexpected</span>
          </h1>
          <a href="#" className="work reveal" style={{ ["--d" as string]: ".6s" }}
            onPointerEnter={() => hover(true)} onPointerLeave={() => hover(false)}>View our work <span>↘</span></a>
        </section>
        <div className="foot">
          <div className="foot-l">
            <button className="round" aria-label="Toggle sound" aria-pressed={sound} {...hv}
              onClick={() => setSound(audio.current.toggle())}>
              <span className={`bars ${sound ? "play" : ""}`}><i /><i /><i /><i /></span>
            </button>
            <input className="vol" type="range" min={0} max={1} step={0.01} value={vol} aria-label="Volume"
              onChange={(e) => { const v = +e.target.value; setVol(v); audio.current.setVolume(v); }} />
            <a href="#" className="ghost" {...hv}>Our 2026 Wrapped</a>
          </div>
          <button className="round globe" aria-label="Language" {...hv}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.3">
              <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18M5 7h14M5 17h14" />
            </svg>
          </button>
          <span className="copy">©2026</span>
        </div>
      </div>
    </main>
  );
}
