import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { WaterScene, type WaterHandle } from "@/components/WaterScene";
import { WaterAudio } from "@/lib/water-audio";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Tidewell — Shaped by water" },
    { name: "description", content: "An immersive design studio. Drift across a living night sea that ripples as you move." },
    { property: "og:title", content: "Tidewell — Shaped by water" },
    { property: "og:description", content: "An immersive design studio. Drift across a living night sea that ripples as you move." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  const water = useRef<WaterHandle | null>(null);
  const audio = useRef(new WaterAudio());
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const [vol, setVol] = useState(0.6);
  const hover = (v: boolean) => { water.current?.setCalm(v); audio.current.muffle(v); };
  return (
    <main className="fixed inset-0 overflow-hidden bg-background text-foreground">
      <WaterScene handle={water} onReady={() => setTimeout(() => setReady(true), 400)} />
      <div className={`loader ${ready ? "gone" : ""}`}><span /></div>
      <div className={`ui ${ready ? "on" : ""}`}>
        <header className="ui-head">
          <a href="#" className="brand">Tidewell</a>
          <nav><a href="#">Work</a><a href="#">About</a><a href="#">Journal</a><a href="#" className="pill">Let’s talk</a></nav>
        </header>
        <section className="hero">
          <h1>Shaped by water.</h1>
          <p>Fluid by nature.<br />Built for what’s next.</p>
          <button className="go" aria-label="Enter" onPointerEnter={() => hover(true)} onPointerLeave={() => hover(false)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
          </button>
        </section>
        <div className="corner">
          <span>Scroll to drift</span><i />
          <input className="vol" type="range" min={0} max={1} step={0.01} value={vol} aria-label="Volume"
            onChange={(e) => { const v = +e.target.value; setVol(v); audio.current.setVolume(v); }} />
          <button aria-label="Toggle sound" aria-pressed={sound} onClick={() => setSound(audio.current.toggle())}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 9h4l5-4v14l-5-4H4z" />
              {sound ? <path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /> : <path d="M17 9l5 6M22 9l-5 6" />}
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
