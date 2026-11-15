import { useEffect, useRef } from "react";
import roomImg from "@/assets/pink-water-room.jpg";
import bonnet from "@/assets/products/bonnet.png";
import tong from "@/assets/products/tong.png";
import string from "@/assets/products/string.png";
import gant from "@/assets/products/gant.png";
import boxer from "@/assets/products/boxer.png";
import bougie from "@/assets/products/bougie.png";
import { WHATSAPP_NUMBER } from "@/lib/contact";

/*
 * Boutique « arc spatial » : cartes en verre dépoli disposées en arc 3D autour
 * du produit mis en avant. Glisser / lancer, flèches, clavier ou clic sur une carte.
 * Quand l'arc s'arrête, une ligne de lumière balaie le produit central et le révèle.
 */

// pack : produit en vente (unités par pack + paliers [nb de packs minimum, prix du pack en DH])
type Pack = { units: number; tiers: [number, number][] };
type Product = { n: string; img: string; pack?: Pack };
type Quote = {
  number: string;
  issuedAt: string;
  validUntil: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  product: string;
  quantity: number;
  units: number;
  unitPrice: number;
  subtotal: number;
  vat: number;
  total: number;
};

// Produits en vente pour le moment : boxer et string. Les autres arrivent bientôt.
const PRODUCTS: Product[] = [
  {
    n: "Boxer homme",
    img: boxer,
    pack: {
      units: 50,
      tiers: [
        [1, 170],
        [5, 150],
        [10, 130],
      ],
    },
  },
  {
    n: "String femme",
    img: string,
    pack: {
      units: 100,
      tiers: [
        [1, 150],
        [5, 140],
        [10, 130],
      ],
    },
  },
  { n: "Bonnet jetable", img: bonnet },
  { n: "Tong Spa", img: tong },
  { n: "Gant de Kessa", img: gant },
  { n: "Bougies chauffe-plat", img: bougie },
];
const N = PRODUCTS.length;
const CARDS = N * 2; // deux tours de produits : l'arc boucle sans couture
const HALF = N;

const dh = (v: number) => `${v.toLocaleString("fr-FR")} DH`;
const VAT_RATE = 0.2;
const QUOTE_VALIDITY_DAYS = 15;
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
// prix d'un pack selon le nombre de packs commandés
const priceFor = (pack: Pack, n: number) =>
  pack.tiers.reduce((price, [min, p]) => (n >= min ? p : price), pack.tiers[0]![1]);
const tierLabel = (tiers: [number, number][], i: number) => {
  const min = tiers[i]![0];
  const next = tiers[i + 1]?.[0];
  if (next === undefined) return `${min}+`;
  return next - 1 === min ? `${min}` : `${min}–${next - 1}`;
};

const mod = (a: number, n: number) => ((a % n) + n) % n;
const EASE = "cubic-bezier(.2,.8,.2,1)";

export function ShopArc() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const $ = <T extends Element>(s: string) => el.querySelector(s) as T;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".sa-card"));
    const roomEl = $<HTMLElement>(".sa-room");
    const fCur = $<HTMLElement>("#saCur");
    const imgOf = (k: number) => PRODUCTS[k]!.img;
    const fNext = $<HTMLElement>("#saNext");
    const grid = $<HTMLElement>(".sa-grid");
    const scan = $<HTMLElement>(".sa-scan");
    const seeds = cards.map(() => Math.random() * 6.28);

    const st = {
      pos: 0,
      target: 0,
      shown: -1,
      intro: reduce ? 1 : 0,
      started: reduce,
      sx: 0,
      sy: 0,
      tsx: 0,
      tsy: 0,
      drag: false,
      p0: 0,
      x0: 0,
      lastX: 0,
      lastT: 0,
      vel: 0,
      moved: 0,
      visible: false,
      packs: 1,
    };

    // ---------- tailles ----------
    let W = 0,
      H = 0,
      CW = 0,
      XS: number[] = [];
    const sizes = () => {
      W = el.clientWidth;
      H = el.clientHeight;
      const phone = W < 768;
      CW = phone ? Math.min(W * 0.25, 120, H * 0.16) : Math.min(W * 0.148, H * 0.33);
      el.style.setProperty("--CW", `${CW}px`);
      XS = (
        phone ? [0, 0.36, 0.5, 0.56, 0.6, 0.62, 0.63] : [0, 0.215, 0.345, 0.432, 0.49, 0.52, 0.535]
      ).map((v) => v * W);
    };
    sizes();
    const xAt = (a: number) => {
      const i = Math.min(Math.floor(a), XS.length - 2);
      const f = Math.min(1, a - i);
      return XS[i]! + (XS[i + 1]! - XS[i]!) * f;
    };

    // ---------- carte d'achat ----------
    // texte qui « roule » : l'ancien sort par le haut, le nouveau entre par le bas.
    // On compare toujours au DERNIER texte affiché et on retire tout de suite les
    // anciens encore en animation (sinon des clics rapides affichaient un mauvais prix).
    const roll = (ln: HTMLElement, text: string) => {
      const spans = Array.from(ln.querySelectorAll("span"));
      const cur = spans.at(-1);
      if (cur?.textContent === text) return;
      spans.slice(0, -1).forEach((sp) => sp.remove());
      const neu = document.createElement("span");
      neu.textContent = text;
      ln.appendChild(neu);
      if (reduce || !cur) {
        cur?.remove();
        return;
      }
      cur.getAnimations().forEach((an) => an.cancel());
      cur.animate([{ transform: "translateY(0)" }, { transform: "translateY(-110%)" }], {
        duration: 420,
        easing: EASE,
        fill: "forwards",
      }).onfinish = () => cur.remove();
      neu.animate([{ transform: "translateY(110%)" }, { transform: "translateY(0)" }], {
        duration: 420,
        easing: EASE,
      });
    };
    // ---------- commande : packs, paliers de prix, total ----------
    const buy = $<HTMLElement>(".sa-buy");
    const order = $<HTMLAnchorElement>(".sa-order");
    const orderDialog = $<HTMLDialogElement>(".sa-order-dialog");
    const orderForm = $<HTMLFormElement>(".sa-order-form");
    const quotePreview = $<HTMLElement>(".sa-quote-preview");
    const dialogQuantity = $<HTMLElement>(".sa-order-quantity");
    const nOut = $<HTMLElement>(".sa-n");
    const tiersEl = $<HTMLElement>(".sa-tiers");
    const saveEl = $<HTMLElement>(".sa-save");
    const thumb = $<HTMLElement>(".sa-thumb i");
    let activeQuote: Quote | null = null;

    const updateDialogSummary = () => {
      const p = PRODUCTS[st.shown];
      if (!p?.pack) return;
      const quantity = st.packs;
      const unit = priceFor(p.pack, quantity);
      const subtotal = unit * quantity;
      const details: Record<string, string> = {
        ".sa-order-product": p.n,
        ".sa-order-units": `${quantity * p.pack.units} unités`,
        ".sa-order-unit-price": dh(unit),
        ".sa-order-total": dh(subtotal),
      };
      Object.entries(details).forEach(([selector, value]) => {
        $<HTMLElement>(selector).textContent = value;
      });
      dialogQuantity.textContent = `${quantity} pack${quantity > 1 ? "s" : ""}`;
    };

    const createQuote = () => {
      if (!orderForm.reportValidity()) return;
      const p = PRODUCTS[st.shown];
      if (!p?.pack) return;

      const data = new FormData(orderForm);
      const quantity = st.packs;
      const unit = priceFor(p.pack, quantity);
      const total = unit * quantity;
      const subtotal = roundMoney(total / (1 + VAT_RATE));
      const vat = roundMoney(total - subtotal);
      const now = new Date();
      const validUntil = new Date(now);
      validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY_DAYS);
      const date = (value: Date) => value.toLocaleDateString("fr-FR");
      const quote: Quote = {
        number: `DEV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-6)}`,
        issuedAt: date(now),
        validUntil: date(validUntil),
        customerName: String(data.get("customerName") ?? ""),
        customerPhone: String(data.get("customerPhone") ?? ""),
        customerAddress: String(data.get("deliveryAddress") ?? ""),
        product: p.n,
        quantity,
        units: quantity * p.pack.units,
        unitPrice: unit,
        subtotal,
        vat,
        total,
      };
      activeQuote = quote;
      const previewValues: Record<string, string> = {
        ".sa-quote-number": quote.number,
        ".sa-quote-issued": quote.issuedAt,
        ".sa-quote-valid-until": quote.validUntil,
        ".sa-quote-customer-name": quote.customerName,
        ".sa-quote-phone": quote.customerPhone,
        ".sa-quote-address": quote.customerAddress,
        ".sa-quote-product": quote.product,
        ".sa-quote-quantity": `${quote.quantity} pack${quote.quantity > 1 ? "s" : ""} (${quote.units} unités)`,
        ".sa-quote-unit-price": dh(roundMoney(quote.unitPrice / (1 + VAT_RATE))),
        ".sa-quote-subtotal": dh(quote.subtotal),
        ".sa-quote-vat": dh(quote.vat),
        ".sa-quote-total": dh(quote.total),
      };
      Object.entries(previewValues).forEach(([selector, value]) => {
        $<HTMLElement>(selector).textContent = value;
      });
      orderForm.hidden = true;
      quotePreview.hidden = false;
      $<HTMLButtonElement>(".sa-quote-back").focus();
    };

    const downloadQuote = async () => {
      if (!activeQuote) return;
      const quote = activeQuote;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ format: "a4", unit: "mm" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const right = pageWidth - margin;
      const line = (y: number) => {
        pdf.setDrawColor(220, 215, 205);
        pdf.line(margin, y, right, y);
      };
      const row = (label: string, value: string, y: number, bold = false) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.text(label, margin, y);
        pdf.text(value, right, y, { align: "right" });
      };

      pdf.setTextColor(41, 39, 34);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.text("Marketspa", margin, 28);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("Syba, Marrakech", margin, 35);
      pdf.text("Tél. 06 24 83 16 24", margin, 41);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);
      pdf.text("PROJET DE DEVIS", right, 28, { align: "right" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`N° ${quote.number}`, right, 35, { align: "right" });
      pdf.text(`Émis le ${quote.issuedAt}`, right, 41, { align: "right" });
      pdf.text(`Valable jusqu'au ${quote.validUntil}`, right, 47, { align: "right" });

      line(54);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Client", margin, 64);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(quote.customerName, margin, 71);
      pdf.text(quote.customerPhone, margin, 77);
      const addressLines = pdf.splitTextToSize(quote.customerAddress, pageWidth - margin * 2);
      pdf.text(addressLines, margin, 83);

      const tableTop = 91 + Math.max(0, addressLines.length - 1) * 5;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Détail de la proposition", margin, tableTop);
      line(tableTop + 6);
      pdf.setFontSize(9);
      pdf.setTextColor(100, 96, 87);
      pdf.text("DÉSIGNATION", margin, tableTop + 13);
      pdf.text("MONTANT", right, tableTop + 13, { align: "right" });
      pdf.setTextColor(41, 39, 34);
      line(tableTop + 17);
      row("Produit", quote.product, tableTop + 25);
      row(
        "Quantité",
        `${quote.quantity} pack${quote.quantity > 1 ? "s" : ""} (${quote.units} unités)`,
        tableTop + 33,
      );
      row("Prix unitaire HT", dh(roundMoney(quote.unitPrice / (1 + VAT_RATE))), tableTop + 41);
      line(tableTop + 46);
      row("Sous-total HT", dh(quote.subtotal), tableTop + 54);
      row("TVA incluse (20 %)", dh(quote.vat), tableTop + 62);
      pdf.setFontSize(12);
      row("Total TTC", dh(quote.total), tableTop + 73, true);
      line(tableTop + 79);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(80, 76, 66);
      pdf.text(
        "Livraison à confirmer avec le client, non comprise dans le total.",
        margin,
        tableTop + 89,
      );
      const notice = [
        `Validité : ${QUOTE_VALIDITY_DAYS} jours. Ce document est un devis, pas une facture.`,
        "TVA au taux de 20 % incluse dans le total TTC.",
        "Identifiants légaux non renseignés : compléter et vérifier avant toute utilisation officielle.",
      ];
      pdf.text(notice, margin, tableTop + 101, {
        maxWidth: pageWidth - margin * 2,
      });
      pdf.save(`devis-marketspa-${quote.number.toLowerCase()}.pdf`);
    };

    const updateOrder = () => {
      const p = PRODUCTS[st.shown]!;
      if (!p.pack) return;
      const n = st.packs;
      const unit = priceFor(p.pack, n);
      const total = unit * n;
      const base = p.pack.tiers[0]![1] * n;
      nOut.textContent = String(n);
      roll($(".sa-total"), dh(total));
      // palier actif
      tiersEl.querySelectorAll(".sa-tier").forEach((t, i) => {
        const [min] = p.pack!.tiers[i]!;
        const next = p.pack!.tiers[i + 1]?.[0] ?? Infinity;
        t.classList.toggle("on", n >= min && n < next);
      });
      // économie réalisée, ou prochain palier à atteindre
      const nextTier = p.pack.tiers.find(([min]) => min > n);
      saveEl.textContent =
        base > total
          ? `Vous économisez ${dh(base - total)}`
          : nextTier
            ? `Dès ${nextTier[0]} packs : ${dh(nextTier[1])}/pack`
            : "";
    };

    order.onclick = (event) => {
      event.preventDefault();
      const p = PRODUCTS[st.shown];
      if (!p) return;
      if (!p.pack) {
        const message = `Bonjour, je souhaite avoir des informations sur : ${p.n}.`;
        window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        return;
      }

      updateDialogSummary();
      orderDialog.showModal();
    };

    orderForm.onsubmit = (event) => {
      event.preventDefault();
      const p = PRODUCTS[st.shown];
      if (!p?.pack) return;

      const data = new FormData(orderForm);
      const quantity = st.packs;
      const unit = priceFor(p.pack, quantity);
      const total = unit * quantity;
      const body = [
        `Produit : ${p.n}`,
        `Quantité : ${quantity} pack${quantity > 1 ? "s" : ""} de ${p.pack.units} unités (${quantity * p.pack.units} unités)`,
        `Prix par pack (TTC) : ${dh(unit)}`,
        `Total TTC : ${dh(total)}`,
        "TVA de 20 % incluse dans le prix.",
        "Livraison : à confirmer (non incluse)",
        "",
        `Nom : ${data.get("customerName")}`,
        `Téléphone : ${data.get("customerPhone")}`,
        `Adresse de livraison : ${data.get("deliveryAddress")}`,
      ].join("\n");
      const message = [`Bonjour, je souhaite commander :`, "", ...body.split("\n")].join("\n");
      window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      orderDialog.close();
    };

    $<HTMLButtonElement>(".sa-order-quote").onclick = createQuote;
    $<HTMLButtonElement>(".sa-quote-download").onclick = downloadQuote;
    $<HTMLButtonElement>(".sa-quote-back").onclick = () => {
      quotePreview.hidden = true;
      orderForm.hidden = false;
      $<HTMLButtonElement>(".sa-order-quote").focus();
    };

    const setPacks = (n: number) => {
      st.packs = Math.max(1, Math.min(999, Math.round(n) || 1));
      if (st.shown >= 0) {
        updateOrder();
        if (orderDialog.open) updateDialogSummary();
      }
    };
    $<HTMLButtonElement>(".sa-minus").onclick = () => setPacks(st.packs - 1);
    $<HTMLButtonElement>(".sa-plus").onclick = () => setPacks(st.packs + 1);
    $<HTMLButtonElement>(".sa-order-minus").onclick = () => setPacks(st.packs - 1);
    $<HTMLButtonElement>(".sa-order-plus").onclick = () => setPacks(st.packs + 1);

    const updateBuy = (k: number) => {
      const p = PRODUCTS[k]!;
      roll($(".sa-name"), p.n);
      roll($(".sa-sub"), p.pack ? `Pack de ${p.pack.units} unités` : "Bientôt disponible");
      buy.classList.toggle("is-soon", !p.pack);
      order.textContent = p.pack ? "Commander" : "Nous contacter";
      // paliers de prix (cliquer un palier règle la quantité)
      tiersEl.innerHTML = "";
      p.pack?.tiers.forEach(([min, price], i) => {
        const b = document.createElement("button");
        b.className = "sa-tier";
        b.innerHTML = `<small>${tierLabel(p.pack!.tiers, i)}<span class="sa-tier-u"> packs</span></small><b>${dh(price)}</b>`;
        b.onclick = () => setPacks(min);
        tiersEl.appendChild(b);
      });
      st.packs = 1;
      thumb.style.backgroundImage = `url(${imgOf(k)})`;
      if (!reduce)
        thumb.animate(
          [
            { transform: "translateY(70%) scale(.8)", opacity: 0 },
            { transform: "none", opacity: 1 },
          ],
          { duration: 650, easing: EASE },
        );
      updateOrder();
    };

    // ---------- révélation par balayage (950 ms) ----------
    let anims: Animation[] = [];
    const reveal = (k: number) => {
      st.shown = k;
      updateBuy(k);
      anims.forEach((a) => a.cancel());
      fNext.style.backgroundImage = `url(${imgOf(k)})`;
      if (reduce) {
        fCur.style.backgroundImage = fNext.style.backgroundImage;
        fCur.style.opacity = "1";
        return;
      }
      const e = "cubic-bezier(.65,0,.35,1)";
      const clip = fNext.animate(
        [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }],
        { duration: 950, easing: e, fill: "forwards" },
      );
      anims = [
        clip,
        grid.animate(
          [
            { clipPath: "inset(0 0 100% 0)" },
            { clipPath: "inset(0 0 0 0)", offset: 0.5 },
            { clipPath: "inset(100% 0 0 0)" },
          ],
          { duration: 1092, easing: e },
        ),
        scan.animate(
          [
            { top: "0%", transform: "scaleX(.2)", opacity: 0 },
            { top: "6%", transform: "scaleX(1)", opacity: 1, offset: 0.08 },
            { top: "94%", transform: "scaleX(1)", opacity: 1, offset: 0.92 },
            { top: "100%", transform: "scaleX(.2)", opacity: 0 },
          ],
          { duration: 950, easing: e },
        ),
        fNext.animate([{ transform: "scale(1.012)" }, { transform: "scale(1)" }], {
          duration: 1250,
          easing: "ease-out",
        }),
      ];
      clip.onfinish = () => {
        fCur.style.backgroundImage = fNext.style.backgroundImage;
        fCur.style.opacity = "1";
        anims.forEach((a) => a.cancel());
        anims = [];
      };
    };

    // ---------- curseur (labels via data-cur sur <body>) ----------
    const setCur = (m: string) => {
      if (document.body.dataset["cur"] !== m) document.body.dataset["cur"] = m;
    };

    // ---------- boucle d'animation ----------
    let raf = 0,
      t = 0;
    const frame = () => {
      t += 1 / 60;
      if (st.started && st.intro < 1) st.intro = Math.min(1, st.intro + 0.012);
      const ie = 1 - Math.pow(1 - st.intro, 3);
      if (!st.drag) st.pos = reduce ? st.target : st.pos + (st.target - st.pos) * 0.11;
      st.sx += (st.tsx - st.sx) * 0.06;
      st.sy += (st.tsy - st.sy) * 0.06;

      cards.forEach((c, i) => {
        const u = mod(i - st.pos + HALF, CARDS) - HALF;
        const a = Math.abs(u),
          sg = Math.sign(u);
        let s: number,
          z: number,
          op: number,
          ry: number,
          blur = 0;
        if (a < 1) {
          s = 0.55 + 0.45 * a;
          z = -260 * (1 - a);
          op = a;
          ry = -sg * 16 * a;
        } else {
          s = 1 / (1 + 0.3 * Math.pow(a - 1, 1.15));
          z = -110 * (a - 1);
          ry = -sg * (16 + 9 * Math.min(2, a - 1));
          blur = Math.max(0, a - 1.6) * 2.4;
          op = a > 3.4 ? 1 - (a - 3.4) / 0.8 : 1;
        }
        op = Math.max(0, op) * ie;
        const bob = reduce ? 0 : Math.sin(t * 1.1 + seeds[i]!) * H * 0.006 * Math.min(1, a);
        const y = bob - (1 - s) * H * 0.04;
        const x = sg * xAt(a) * ie;
        ry += st.sx * 10;
        c.style.transform = `translate(${x}px,${y}px) perspective(1300px) translateZ(${z}px) rotateY(${ry}deg) rotateX(${-st.sy * 6}deg) scale(${s * (0.6 + 0.4 * ie)})`;
        c.style.opacity = String(op);
        c.style.visibility = op < 0.01 ? "hidden" : "visible";
        c.style.zIndex = String(a < 1 ? 1 : Math.round(100 - 10 * a));
        c.style.filter = blur ? `blur(${blur}px)` : "";
      });

      roomEl.style.transform = `translate3d(${-st.sx * 22}px,${-st.sy * 14}px,0) scale(${1.08 - 0.03 * ie})`;

      // l'arc s'est posé sur un nouveau produit → balayage
      const k = mod(Math.round(st.target), N);
      if (st.started && !st.drag && Math.abs(st.target - st.pos) < 0.02 && k !== st.shown)
        reveal(k);

      raf = st.visible ? requestAnimationFrame(frame) : 0;
    };
    const run = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    // ne tourne que lorsque la section est visible ; l'intro démarre à l'arrivée
    const io = new IntersectionObserver(
      ([e]) => {
        st.visible = !!e?.isIntersecting;
        if (st.visible) {
          if ((e?.intersectionRatio ?? 0) > 0.3) st.started = true;
          run();
        }
      },
      { threshold: [0, 0.3, 0.6] },
    );
    io.observe(el);

    // ---------- entrées ----------
    const stage = $<HTMLElement>(".sa-stage");
    const step = (d: number) => (st.target = Math.round(st.target) + d);
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest("button,a")) return;
      st.drag = true;
      st.p0 = st.pos;
      st.x0 = st.lastX = e.clientX;
      st.lastT = performance.now();
      st.vel = 0;
      st.moved = 0;
      setCur("drag");
    };
    const onMove = (e: PointerEvent) => {
      if (orderDialog.open) {
        setCur("");
        return;
      }
      const r = el.getBoundingClientRect();
      st.tsx = (e.clientX - r.left) / r.width - 0.5;
      st.tsy = (e.clientY - r.top) / r.height - 0.5;
      if (st.drag) {
        const dx = e.clientX - st.x0;
        st.moved = Math.max(st.moved, Math.abs(dx));
        st.pos = st.p0 - dx / XS[1]!;
        const now = performance.now();
        st.vel = (e.clientX - st.lastX) / Math.max(1, now - st.lastT);
        st.lastX = e.clientX;
        st.lastT = now;
      } else if (e.target instanceof Element && el.contains(e.target)) {
        setCur(e.target.closest(".sa-card") ? "view" : e.target.closest("button,a") ? "" : "drag");
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!st.drag) return;
      st.drag = false;
      if (st.moved < 6) {
        // clic sur une carte → elle vient au centre
        const c = (e.target as Element).closest<HTMLElement>(".sa-card");
        if (c) {
          const i = Number(c.dataset["i"]);
          st.target = Math.round(st.pos + (mod(i - st.pos + HALF, CARDS) - HALF));
        }
      } else {
        st.target = Math.round(st.pos - st.vel * 3.2);
      }
    };
    const onLeave = () => setCur("");
    const onKey = (e: KeyboardEvent) => {
      if (!st.visible || orderDialog.open) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    stage.addEventListener("pointerdown", onDown);
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    addEventListener("keydown", onKey);
    addEventListener("resize", sizes);
    $<HTMLButtonElement>(".sa-prev").onclick = () => step(-1);
    $<HTMLButtonElement>(".sa-next").onclick = () => step(1);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      anims.forEach((a) => a.cancel());
      stage.removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      removeEventListener("keydown", onKey);
      removeEventListener("resize", sizes);
      delete document.body.dataset["cur"];
    };
  }, []);

  return (
    <section ref={root} id="boutique" className="shop" aria-label="Boutique">
      <div className="sa-room" style={{ backgroundImage: `url(${roomImg})` }} />

      <h2 className="sa-brand sa-glass">
        <span className="sa-brand-s">Market Spa</span>
        <span className="sa-brand-c">Marrakech</span>
      </h2>

      <div className="sa-stage">
        <div className="sa-arc">
          {Array.from({ length: CARDS }, (_, i) => {
            const p = PRODUCTS[i % N]!;
            return (
              <div
                key={i}
                className="sa-card sa-glass"
                data-i={i}
                onPointerEnter={(e) => sheen(e.currentTarget)}
              >
                <i className="sa-g" style={{ backgroundImage: `url(${p.img})` }} />
                <b className="sa-cn">{p.n}</b>
                <span className="sa-cp">
                  {p.pack ? `dès ${dh(p.pack.tiers.at(-1)![1])} / pack` : "Bientôt"}
                </span>
                <span className="sa-sheen" />
              </div>
            );
          })}
        </div>
      </div>

      {/* produit mis en avant, révélé par la ligne de lumière */}
      <div className="sa-feature" aria-hidden="true">
        <i id="saCur" />
        <i id="saNext" />
        <span className="sa-grid" />
        <span className="sa-scan" />
      </div>

      <button className="sa-arrow sa-prev sa-glass" aria-label="Produit précédent">
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
      <button className="sa-arrow sa-next sa-glass" aria-label="Produit suivant">
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>

      <div className="sa-buy sa-glass">
        <div className="sa-thumb">
          <i />
        </div>
        <div className="sa-info">
          <div className="sa-ln sa-name" />
          <div className="sa-ln sa-sub" />
        </div>
        <div className="sa-opt sa-paid sa-o-step">
          <span className="sa-lbl">Packs</span>
          <div className="sa-step">
            <button className="sa-minus" aria-label="Un pack de moins">
              −
            </button>
            <output className="sa-n" aria-live="polite">
              1
            </output>
            <button className="sa-plus" aria-label="Un pack de plus">
              +
            </button>
          </div>
        </div>
        <div className="sa-opt sa-paid sa-o-tiers">
          <span className="sa-lbl">Prix par pack</span>
          <div className="sa-tiers" />
        </div>
        <div className="sa-opt sa-paid sa-sum">
          <span className="sa-lbl sa-save" />
          <div className="sa-ln sa-total" />
        </div>
        <a className="sa-order" href={`https://wa.me/${WHATSAPP_NUMBER}`}>
          Commander
        </a>
      </div>

      <dialog className="sa-order-dialog sa-glass" aria-labelledby="sa-order-title">
        <form className="sa-order-form">
          <div className="sa-order-heading">
            <div>
              <p className="sa-order-eyebrow">Market Spa · Marrakech</p>
              <h2 id="sa-order-title">Votre commande</h2>
            </div>
            <button
              className="sa-order-close"
              type="button"
              aria-label="Fermer"
              onClick={(event) => {
                event.currentTarget.closest("dialog")?.close();
              }}
            >
              ×
            </button>
          </div>

          <dl className="sa-order-summary">
            <div>
              <dt>Produit</dt>
              <dd className="sa-order-product" />
            </div>
            <div>
              <dt>Quantité</dt>
              <dd className="sa-order-quantity-control">
                <button className="sa-order-minus" type="button" aria-label="Retirer un pack">
                  −
                </button>
                <output className="sa-order-quantity" aria-live="polite" />
                <button className="sa-order-plus" type="button" aria-label="Ajouter un pack">
                  +
                </button>
              </dd>
            </div>
            <div>
              <dt>Nombre d'unités</dt>
              <dd className="sa-order-units" />
            </div>
            <div>
              <dt>Prix par pack</dt>
              <dd className="sa-order-unit-price" />
            </div>
            <div>
              <dt>Livraison</dt>
              <dd>À confirmer</dd>
            </div>
            <div className="sa-order-total-row">
              <dt>Total</dt>
              <dd className="sa-order-total" />
            </div>
          </dl>

          <div className="sa-order-fields">
            <label>
              Nom complet
              <input name="customerName" autoComplete="name" required />
            </label>
            <label>
              Téléphone
              <input name="customerPhone" type="tel" autoComplete="tel" required />
            </label>
            <label className="sa-order-address">
              Adresse de livraison
              <textarea name="deliveryAddress" autoComplete="street-address" rows={2} required />
            </label>
          </div>

          <p className="sa-order-note">
            Crée un aperçu du devis dans cette fenêtre, ou envoie directement ta demande sur
            WhatsApp.
          </p>
          <div className="sa-order-actions">
            <button
              className="sa-order-cancel"
              type="button"
              onClick={(event) => {
                event.currentTarget.closest("dialog")?.close();
              }}
            >
              Retour à la boutique
            </button>
            <button className="sa-order-quote" type="button">
              Créer le devis
            </button>
            <button className="sa-order-submit" type="submit">
              WhatsApp
            </button>
          </div>
        </form>

        <section className="sa-quote-preview" aria-labelledby="sa-quote-title" hidden>
          <div className="sa-quote-paper">
            <header className="sa-quote-header">
              <div>
                <p className="sa-quote-brand">Marketspa</p>
                <p>Syba, Marrakech</p>
                <p>Tél. 06 24 83 16 24</p>
              </div>
              <div className="sa-quote-meta">
                <h2 id="sa-quote-title">Projet de devis</h2>
                <p>
                  N° <span className="sa-quote-number" />
                </p>
                <p>
                  Émis le <span className="sa-quote-issued" />
                </p>
                <p>
                  Valable jusqu’au <span className="sa-quote-valid-until" />
                </p>
              </div>
            </header>

            <div className="sa-quote-customer">
              <h3>Client</h3>
              <p className="sa-quote-customer-name" />
              <p className="sa-quote-phone" />
              <p className="sa-quote-address" />
            </div>

            <div className="sa-quote-items">
              <h3>Détail de la proposition</h3>
              <div>
                <span className="sa-quote-product" />
                <b>
                  Prix unitaire HT · <span className="sa-quote-unit-price" />
                </b>
              </div>
              <div>
                <span>
                  Quantité · <span className="sa-quote-quantity" />
                </span>
              </div>
            </div>

            <dl className="sa-quote-totals">
              <div>
                <dt>Sous-total HT</dt>
                <dd className="sa-quote-subtotal" />
              </div>
              <div>
                <dt>TVA incluse (20 %)</dt>
                <dd className="sa-quote-vat" />
              </div>
              <div className="sa-quote-grand-total">
                <dt>Total TTC</dt>
                <dd className="sa-quote-total" />
              </div>
            </dl>

            <p className="sa-quote-delivery">Livraison à confirmer avec le client, non comprise.</p>
            <p className="sa-quote-disclaimer">
              Ce document est un devis, pas une facture. Identifiants légaux non renseignés :
              complète et vérifie ces informations avant toute utilisation officielle.
            </p>
          </div>

          <div className="sa-quote-actions">
            <button className="sa-quote-back" type="button">
              Modifier la commande
            </button>
            <button className="sa-quote-download" type="button">
              Télécharger le devis PDF
            </button>
          </div>
        </section>
      </dialog>
    </section>
  );
}

// reflet diagonal qui balaie la carte au survol
function sheen(card: HTMLElement) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  card
    .querySelector(".sa-sheen")
    ?.animate([{ transform: "translateX(-120%)" }, { transform: "translateX(120%)" }], {
      duration: 1000,
      easing: EASE,
    });
}
