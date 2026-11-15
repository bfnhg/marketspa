import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FallingFlowers } from "@/components/FallingFlowers";

gsap.registerPlugin(ScrollTrigger);
// Évite les sauts quand la barre d'adresse mobile apparaît/disparaît
ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * Au scroll, la scène hero est épinglée : la caméra « plonge » dans la pièce
 * (le hero grossit et disparaît) et « Notre service » arrive du fond en zoom.
 */
export function ServiceZoom({ stage }: { stage: RefObject<HTMLDivElement | null> }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const st = stage.current;
    const el = root.current;
    if (!st || !el) return;
    const canvas = st.parentElement?.querySelector("canvas") ?? null;
    const heroZoom = st.querySelector(".hero-zoom");
    const flowers = st.querySelector(":scope > .flowers");

    const mm = gsap.matchMedia();
    const pin = {
      trigger: st,
      start: "top top",
      end: () => (innerWidth < 821 ? "+=170%" : "+=220%"),
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    };

    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const tl = gsap.timeline({ scrollTrigger: pin });
        tl.to(
          heroZoom,
          { scale: 4, opacity: 0, filter: "blur(12px)", ease: "power2.in", duration: 1 },
          0,
        )
          .to(canvas, { scale: 1.25, ease: "none", duration: 1.4 }, 0)
          .to(el, { opacity: 1, duration: 0.3, ease: "none" }, 0.45)
          .fromTo(
            ".svc-zoom-inner",
            { scale: 0.08, filter: "blur(24px)" },
            { scale: 1, filter: "blur(0px)", ease: "power3.out", duration: 1.1 },
            0.45,
          )
          .from(
            ".svc-kicker, .svc-desc",
            { y: 30, opacity: 0, ease: "power2.out", duration: 0.55, stagger: 0.12 },
            1.1,
          )
          .to(flowers, { opacity: 1, duration: 0.5, ease: "none" }, 0.8)
          .to({}, { duration: 0.6 }); // petite pause à la fin avant de relâcher
      },
      el,
    );

    mm.add(
      "(prefers-reduced-motion: reduce)",
      () => {
        gsap
          .timeline({ scrollTrigger: pin })
          .to(heroZoom, { opacity: 0, duration: 1 }, 0)
          .to(el, { opacity: 1, duration: 1 }, 0.5);
      },
      el,
    );

    return () => mm.revert();
  }, [stage]);

  return (
    <>
      <FallingFlowers />
      <div ref={root} id="services" className="svc-zoom" aria-labelledby="services-title">
        <div className="svc-zoom-inner">
          <p className="svc-kicker">Pour les hammams, spas et hôtels</p>
          <h2 id="services-title" className="svc-title">
            <span className="serif">Notre</span>
            <span className="sans">service</span>
          </h2>
          <p className="svc-desc">
            Produits et accessoires pour hammams, spas et hôtels.
            <br />
            Vente en gros et au détail.
          </p>
        </div>
      </div>
    </>
  );
}
