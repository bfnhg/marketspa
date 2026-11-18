import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FallingFlowers } from "@/components/FallingFlowers";

gsap.registerPlugin(ScrollTrigger);
// Évite les sauts quand la barre d'adresse mobile apparaît/disparaît
ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * Au scroll, la scène hero est épinglée : la caméra « plonge » dans la pièce
 * (le hero grossit et disparaît), puis les slides entreprise et produits arrivent en zoom.
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
      end: () => (innerWidth < 821 ? "+=185%" : "+=240%"),
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
            ".svc-about-inner",
            { scale: 0.08, filter: "blur(24px)" },
            { scale: 1, filter: "blur(0px)", ease: "power3.out", duration: 1.1 },
            0.45,
          )
          .from(
            ".svc-about-inner .svc-date, .svc-about-inner .svc-desc",
            { y: 30, opacity: 0, ease: "power2.out", duration: 0.55, stagger: 0.12 },
            1.1,
          )
          .to(flowers, { opacity: 1, duration: 0.5, ease: "none" }, 0.8)
          .to({}, { duration: 0.6 })
          .to(
            ".svc-about-inner",
            { scale: 4, opacity: 0, filter: "blur(12px)", duration: 1, ease: "power2.in" },
            ">",
          )
          .fromTo(
            ".svc-products-inner",
            { autoAlpha: 0, scale: 0.08, filter: "blur(24px)" },
            { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1.1, ease: "power3.out" },
            "<",
          )
          .from(
            ".svc-products-kicker, .svc-products-desc, .svc-products-hint, .svc-products-cta",
            { y: 30, opacity: 0, duration: 0.55, stagger: 0.12, ease: "power2.out" },
            "<+=0.65",
          )
          .to({}, { duration: 0.6 });
      },
      el,
    );

    mm.add(
      "(prefers-reduced-motion: reduce)",
      () => {
        gsap
          .timeline({ scrollTrigger: pin })
          .to(heroZoom, { opacity: 0, duration: 1 }, 0)
          .to(el, { opacity: 1, duration: 1 }, 0.5)
          .to(".svc-about-inner", { autoAlpha: 0, duration: 0.25 }, 1.6)
          .to(".svc-products-inner", { autoAlpha: 1, duration: 0.25 }, 1.6);
      },
      el,
    );

    return () => mm.revert();
  }, [stage]);

  return (
    <>
      <FallingFlowers />
      <div ref={root} id="services" className="svc-zoom" aria-labelledby="services-title">
        <div className="svc-zoom-inner svc-about-inner">
          <h2 id="services-title" className="svc-title">
            <span className="serif">À propos</span>
            <span className="sans">de nous</span>
          </h2>
          <p className="svc-desc">
            Nous travaillons avec des produits jetables
            <br />
            pour spas, hammams et hôtels.
          </p>
          <p className="work svc-date">Depuis 2015</p>
        </div>
        <div className="svc-zoom-inner svc-products-inner" aria-labelledby="products-title">
          <p className="svc-kicker svc-products-kicker">Nos produits</p>
          <h2 id="products-title" className="svc-title">
            <span className="serif">Les essentiels</span>
            <span className="sans">pour les pros</span>
          </h2>
          <p className="svc-desc svc-products-desc">
            Boxers homme et strings femme disponibles.
            <br />
            Autres produits bientôt disponibles.
          </p>
          <p className="svc-products-hint">Faites glisser pour parcourir la sélection.</p>
          <a className="work svc-products-cta" href="#boutique">
            Ouvrir la boutique <span>↘</span>
          </a>
        </div>
      </div>
    </>
  );
}
