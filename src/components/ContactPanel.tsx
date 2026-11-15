import { useEffect, useRef } from "react";
import gsap from "gsap";
import { EMAIL } from "@/lib/contact";
import { waterView } from "@/components/WaterScene";
import { ContactRoom } from "@/components/ContactRoom";

const TITLE = ["Dites", "bonjour"];

type Props = {
  open: boolean;
  onClose: () => void;
  onHover: (big: boolean) => void;
};

/** Vue « Contact » qui remplace le hero, sur la même scène d'eau. */
export function ContactPanel({ open, onClose, onHover }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cam = document.querySelector(".scene-cam");
      // Timing relevé image par image sur la vidéo de référence :
      // 0 → 0.3 s    : le texte du hero s'efface (fondu flou)
      // 0.3 → 1.15 s : travelling latéral vers les arches ouvertes sur la lavande
      // 1.05 → 1.6 s : le texte contact passe du flou au net
      const PAN = 0.3;
      const DUR = 0.85;
      const T = reduce ? 0.3 : PAN + DUR - 0.1;
      const t = gsap
        .timeline({ paused: true, defaults: { ease: "power2.out" } })
        .set(el, { visibility: "visible" });

      if (reduce) {
        t.fromTo(".room", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0);
      } else {
        const pan = { duration: DUR, ease: "power3.inOut" };
        t
          // la caméra glisse vers la gauche jusqu'aux arches (écran vertical : 1re arche)
          .to(
            waterView,
            {
              x: () => (innerWidth / innerHeight < 1 ? -0.39 : -0.265),
              y: -0.075,
              zoom: 2,
              ...pan,
            },
            PAN,
          )
          // le coin contact (plateforme, fauteuil, table) entre par la gauche,
          // plus vite que le fond = effet de profondeur
          .fromTo(".room", { x: () => -innerWidth * 1.1 }, { x: 0, ...pan }, PAN)
          // flou de mouvement au plus rapide du travelling
          .to([cam, ".room"], { filter: "blur(4px)", duration: DUR / 2, ease: "power2.in" }, PAN)
          .to(
            [cam, ".room"],
            { filter: "blur(0px)", duration: DUR / 2, ease: "power2.out" },
            PAN + DUR / 2,
          );
      }

      // texte contact : fondu flou, presque en bloc
      const fade = { opacity: 0, filter: "blur(12px)" };
      const show = { opacity: 1, filter: "blur(0px)" };
      tl.current = t
        .fromTo(".ct-char", fade, { ...show, duration: 0.5, stagger: 0.012 }, T)
        .fromTo(".ct-sub span", fade, { ...show, duration: 0.5 }, T + 0.08)
        .fromTo(".ct-btn", fade, { ...show, duration: 0.5, stagger: 0.05 }, T + 0.05)
        .fromTo(".ct-mail", fade, { ...show, duration: 0.5 }, T + 0.1);
    }, el);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const t = tl.current;
    if (!t) return;
    if (open) t.timeScale(1).play();
    else t.timeScale(1.3).reverse();

    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const hv = { onPointerEnter: () => onHover(true), onPointerLeave: () => onHover(false) };

  return (
    <div ref={root} className={`contact-view ${open ? "is-open" : ""}`} aria-hidden={!open}>
      {/* coin contact posé sur l'eau, devant les arches */}
      <div className="ct-scene">
        <div className="room">
          <ContactRoom />
        </div>
      </div>
      <div className="contact" role="region" aria-label="Contact">
        <div className="ct-left">
          <h2 className="ct-title" aria-label={TITLE.join(" ")}>
            {TITLE.map((word, wi) => (
              <span key={wi} className="ct-word" aria-hidden="true">
                {word.split("").map((c, ci) => (
                  <span key={ci} className="ct-mask">
                    <span className="ct-char">{c}</span>
                  </span>
                ))}
              </span>
            ))}
          </h2>
          <p className="ct-sub">
            <span>Venez en parler</span>
            <span>en plein air</span>
          </p>
        </div>

        <div className="ct-right">
          <div className="ct-btns">
            <a
              className="ct-btn is-solid"
              href={`mailto:${EMAIL}?subject=Vente%20en%20gros`}
              tabIndex={open ? 0 : -1}
              {...hv}
            >
              Vente en gros <span>↘</span>
            </a>
            <a
              className="ct-btn"
              href={`mailto:${EMAIL}?subject=Vente%20en%20d%C3%A9tail`}
              tabIndex={open ? 0 : -1}
              {...hv}
            >
              Vente en détail <span>↘</span>
            </a>
          </div>
          <a className="ct-mail" href={`mailto:${EMAIL}`} tabIndex={open ? 0 : -1} {...hv}>
            {EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}
