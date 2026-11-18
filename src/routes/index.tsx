import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { WaterScene, type WaterHandle } from "@/components/WaterScene";
import { WaterAudio } from "@/lib/water-audio";
import { ServiceZoom } from "@/components/ServiceZoom";
import { ContactPanel } from "@/components/ContactPanel";
import { ShopArc } from "@/components/ShopArc";
import { FallingFlowers } from "@/components/FallingFlowers";
import { OPEN_QUOTE_EVENT } from "@/lib/shop-cart";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Market Spa — Produits jetables" },
    { name: "description", content: "Market Spa vous accompagne avec une sélection de produits jetables pratiques  vos besoins du quotidien." },
    { property: "og:title", content: "Market Spa — Produits jetables" },
    { property: "og:description", content: "Une sélection de produits jetables pratiques pour vos besoins du quotidien." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  const water = useRef<WaterHandle | null>(null);
  const audio = useRef(new WaterAudio());
  const cursor = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const soundPreference = useRef(true);
  const [audioError, setAudioError] = useState(false);
  const [vol, setVol] = useState(0.6);
  const [big, setBig] = useState(false);
  const hover = (v: boolean) => { water.current?.setCalm(v); audio.current.muffle(v); setBig(v); };

  useEffect(() => {
    const waterAudio = audio.current;
    soundPreference.current = true;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0;
    let activationPending = false;
    let autoStarted = false;
    const startOnInteraction = (event: Event) => {
      if (!soundPreference.current || autoStarted || activationPending || !event.isTrusted) return;
      if (event.target instanceof Element && event.target.closest(".sound-toggle")) return;
      activationPending = true;
      void waterAudio.enable().then(() => {
        if (!soundPreference.current || !waterAudio.on) return;
        autoStarted = true;
        setSound(true);
        setAudioError(false);
        removeEventListener("pointerdown", startOnInteraction);
        removeEventListener("keydown", startOnInteraction);
      }).catch((error: unknown) => {
        console.error("Impossible de démarrer automatiquement le son", error);
        setAudioError(true);
      }).finally(() => {
        activationPending = false;
      });
    };
    addEventListener("pointerdown", startOnInteraction);
    addEventListener("keydown", startOnInteraction);
    void waterAudio.enable().then(() => {
      if (!soundPreference.current || !waterAudio.on) return;
      autoStarted = true;
      setSound(true);
      setAudioError(false);
    }).catch((error: unknown) => {
      console.error("Impossible de relancer automatiquement la musique", error);
      setAudioError(true);
    });
    const mv = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const loop = () => { x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      if (cursor.current) cursor.current.style.transform = `translate(${x}px,${y}px)`;
      if (scene.current) {
        scene.current.style.setProperty("--pointer-x", `${-(x / innerWidth - 0.5) * 16}px`);
        scene.current.style.setProperty("--pointer-y", `${-(y / innerHeight - 0.5) * 10}px`);
      }
      raf = requestAnimationFrame(loop); };
    addEventListener("pointermove", mv); loop();
    return () => {
      removeEventListener("pointermove", mv);
      removeEventListener("pointerdown", startOnInteraction);
      removeEventListener("keydown", startOnInteraction);
      cancelAnimationFrame(raf);
      waterAudio.dispose();
    };
  }, []);

  const hv = { onPointerEnter: () => setBig(true), onPointerLeave: () => setBig(false) };
  const [contact, setContact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeContact = useCallback(() => setContact(false), []);
  const openContact = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    // retour instantané en haut (le scroll est ensuite bloqué)
    scrollTo({ top: 0, behavior: "instant" });
    setContact(true);
  };
  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    setContact(false);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  const goServices = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    setContact(false);
    document.getElementById("boutique")?.scrollIntoView({ behavior: "smooth" });
  };
  // Pas de scroll pendant que la vue contact est ouverte
  useEffect(() => {
    document.documentElement.classList.toggle("no-scroll", contact);
  }, [contact]);
  return (
    <main ref={scene} className="page-shell bg-background text-foreground">
      <div className="scene-cam"><WaterScene handle={water} onReady={() => setTimeout(() => setReady(true), 300)} /></div>
      <div className={`loader ${ready ? "gone" : ""}`}><span /></div>
      <div ref={cursor} className="cursor"><span className={big ? "big" : ""} /></div>
      <div ref={stage} className="stage">
      <div id="accueil" className={`ui ${ready ? "on" : ""} ${contact ? "contact-open" : ""}`}>
        <header className="ui-head">
          <a href="#" className="brand" aria-label="Market Spa, accueil" onClick={goHome} {...hv}>Market Spa</a>
          <nav>
            <a href="#" onClick={goHome} {...hv}>Accueil</a><a href="#boutique" onClick={goServices} {...hv}>Produits</a>
            <a href="#contact" className={`nav-contact ${contact ? "active" : ""}`} onClick={openContact} {...hv}>Contact</a>
            <button
              className="nav-quote"
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_QUOTE_EVENT))}
              {...hv}
            >
              <span className="nav-quote-long">Créer un bon de commande</span>
              <span className="nav-quote-short">Bon de commande</span>
              <span className="nav-quote-arrow" aria-hidden="true">↘</span>
            </button>
            <div className="nav-menu">
              <button
                className="dot-btn"
                aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={menuOpen}
                aria-controls="site-menu"
                onClick={() => setMenuOpen((open) => !open)}
                {...hv}
              >
                <i /><i />
              </button>
              {menuOpen && (
                <div className="site-menu" id="site-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      window.dispatchEvent(new Event(OPEN_QUOTE_EVENT));
                    }}
                    {...hv}
                  >
                    Créer un bon de commande
                  </button>
                </div>
              )}
            </div>
          </nav>
        </header>
        <div className="hero-zoom">
        <FallingFlowers className="hero-flowers" count={20} />
        <section className="hero">
          <p className="kicker reveal" style={{ ["--d" as string]: ".1s" }}>
    La boutique dédiée aux produits jetables<br className="kicker-br" />
    pour spas, hammams et hôtels
  </p>
          <h1>
            <span className="serif reveal" style={{ ["--d" as string]: ".25s" }}>Market Spa</span>
            <span className="sans reveal" style={{ ["--d" as string]: ".4s" }}>à Marrakech</span>
          </h1>
          <a href="#services" className="work reveal" style={{ ["--d" as string]: ".6s" }}
            onClick={(e) => { e.preventDefault(); document.getElementById("boutique")?.scrollIntoView({ behavior: "smooth" }); }}
            onPointerEnter={() => hover(true)} onPointerLeave={() => hover(false)}>Découvrir notre boutique <span>↘</span></a>
        </section>
        </div>
        <ContactPanel open={contact} onClose={closeContact} onHover={setBig} />
        <div className="foot">
          <div className="foot-l">
            <button className="round sound-toggle" aria-label={audioError ? "Son indisponible" : sound ? "Désactiver le son" : "Activer le son"}
              title={audioError ? "Le son n'a pas pu démarrer. Vérifiez les réglages audio de votre navigateur." : undefined}
              aria-pressed={sound} {...hv}
              onClick={async () => {
                try {
                  const enabled = await audio.current.toggle();
                  setSound(enabled);
                  soundPreference.current = enabled;
                  setAudioError(false);
                } catch (error) {
                  console.error("Impossible de démarrer le son de l'eau", error);
                  setSound(false);
                  soundPreference.current = false;
                  setAudioError(true);
                }
              }}>
              <span className={`bars ${sound ? "play" : ""}`}><i /><i /><i /><i /></span>
            </button>
            <input className="vol" type="range" min={0} max={1} step={0.01} value={vol} aria-label="Volume sonore"
              onChange={(e) => { const v = +e.target.value; setVol(v); audio.current.setVolume(v); }} />
            <a href="#" className="ghost" {...hv}>Les indispensables Market Spa</a>
          </div>
          <button className="round globe" aria-label="Langue : français" {...hv}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.3">
              <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18M5 7h14M5 17h14" />
            </svg>
          </button>
          <span className="copy">© Market Spa 2026</span>
        </div>
      </div>
      <ServiceZoom stage={stage} />
      </div>
      <ShopArc />
    </main>
  );
}
