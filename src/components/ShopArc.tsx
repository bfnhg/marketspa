import { useEffect, useRef } from "react";
import roomImg from "@/assets/pink-water-room.jpg";
import bonnet from "@/assets/products/bonnet.png";
import tong from "@/assets/products/tong.png";
import string from "@/assets/products/string.png";
import gant from "@/assets/products/gant.png";
import boxer from "@/assets/products/boxer.png";
import bougie from "@/assets/products/bougie.png";
import { WHATSAPP_NUMBER } from "@/lib/contact";
import { formatDh, formatPdfDh } from "@/lib/money";
import { getCartLines, OPEN_QUOTE_EVENT, priceFor, type CartProduct } from "@/lib/shop-cart";

/*
 * Boutique « arc spatial » : cartes en verre dépoli disposées en arc 3D autour
 * du produit mis en avant. Glisser / lancer, flèches, clavier ou clic sur une carte.
 * Quand l'arc s'arrête, une ligne de lumière balaie le produit central et le révèle.
 */

// pack : produit en vente (unités par pack + paliers [nb de packs minimum, prix du pack en DH])
type Product = CartProduct & { img: string };
type Quote = {
  number: string;
  issuedAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    product: string;
    variant?: string;
    quantity: number;
    units: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  total: number;
};

// Produits en vente pour le moment : boxer et string. Les autres arrivent bientôt.
const PRODUCTS: Product[] = [
  {
    n: "Boxer homme",
    img: boxer,
    details: "Taille standard",
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
    details: "Taille standard",
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

const dh = formatDh;
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
    const cart = new Map<number, number>();
    const quoteQuantities = new Map<number, number>();

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
    const order = $<HTMLButtonElement>(".sa-order");
    const orderDialog = $<HTMLDialogElement>(".sa-order-dialog");
    const orderForm = $<HTMLFormElement>(".sa-order-form");
    const quotePreview = $<HTMLElement>(".sa-quote-preview");
    const cartButton = $<HTMLButtonElement>(".sa-cart-button");
    const cartCount = $<HTMLElement>(".sa-cart-count");
    const cartStatus = $<HTMLElement>(".sa-cart-status");
    const cartList = $<HTMLElement>(".sa-cart-items");
    const cartEmpty = $<HTMLElement>(".sa-cart-empty");
    const cartSummary = $<HTMLElement>(".sa-order-summary");
    const cartFields = $<HTMLElement>(".sa-order-fields");
    const cartNote = $<HTMLElement>(".sa-order-note");
    const orderTitle = $<HTMLHeadingElement>("#sa-order-title");
    const quotePicker = $<HTMLElement>(".sa-quote-picker");
    const quoteProductList = $<HTMLElement>(".sa-quote-product-list");
    const quoteSelectionStatus = $<HTMLElement>(".sa-quote-selection-status");
    const quoteButton = $<HTMLButtonElement>(".sa-order-quote");
    const submitButton = $<HTMLButtonElement>(".sa-order-submit");
    const nOut = $<HTMLElement>(".sa-n");
    const tiersEl = $<HTMLElement>(".sa-tiers");
    const saveEl = $<HTMLElement>(".sa-save");
    const boxerColors = $<HTMLElement>(".sa-boxer-colors");
    boxerColors.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      button.onclick = () => {
        const productIndex = Number(boxerColors.dataset["productIndex"] ?? "-1");
        selectedProductColors.set(productIndex, button.dataset["boxerColor"] ?? "Noir");
        boxerColors.querySelectorAll<HTMLButtonElement>("button").forEach((option) => {
          option.classList.toggle("on", option === button);
        });
        cartStatus.textContent = `Couleur sélectionnée : ${(selectedProductColors.get(productIndex) ?? "Noir").toLowerCase()}.`;
      };
    });
    const thumb = $<HTMLElement>(".sa-thumb i");
    let activeQuote: Quote | null = null;
    let quoteMode = false;
    const selectedProductColors = new Map([
      [0, "Noir"],
      [1, "Noir"],
    ]);
    const cartVariants = new Map<number, string>();
    const quoteVariants = new Map<number, string>();

    quoteProductList.replaceChildren(
      ...PRODUCTS.flatMap((product, productIndex) => {
        if (!product.pack) return [];
        const label = document.createElement("label");
        label.className = "sa-quote-product-option";
        const details = document.createElement("span");
        details.textContent = `${product.n}${product.details ? ` · ${product.details}` : ""} · pack de ${product.pack.units} unités · à partir de ${dh(product.pack.tiers.at(-1)![1])}`;
        const quantity = document.createElement("input");
        quantity.type = "number";
        quantity.min = "0";
        quantity.max = "999";
        quantity.step = "1";
        quantity.value = "0";
        quantity.dataset["productIndex"] = String(productIndex);
        quantity.setAttribute("aria-label", `Quantité de packs : ${product.n}`);
        label.append(details, quantity);
        if (productIndex === 0 || productIndex === 1) {
          const variants = document.createElement("span");
          variants.className = "sa-quote-color-options";
          ["Noir", "Blanc"].forEach((color) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset["boxerColor"] = color;
            button.className = color === "Noir" ? "on" : "";
            button.classList.add("sa-quote-color", color.toLowerCase());
            button.setAttribute("aria-label", `Choisir la couleur ${color.toLowerCase()}`);
            button.onclick = (event) => {
              event.preventDefault();
              quoteVariants.set(productIndex, color);
              variants.querySelectorAll<HTMLButtonElement>("button").forEach((option) => {
                option.classList.toggle("on", option === button);
              });
            };
            variants.appendChild(button);
          });
          label.insertBefore(variants, quantity);
        }
        return [label];
      }),
    );

    quoteProductList.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const productIndex = Number(target.dataset["productIndex"]);
      const quantity = Math.min(999, Math.max(0, Math.floor(Number(target.value) || 0)));
      target.value = String(quantity);
      if (quantity > 0) quoteQuantities.set(productIndex, quantity);
      else quoteQuantities.delete(productIndex);
      const lines = getCartLines(PRODUCTS, quoteQuantities);
      quoteButton.disabled = lines.length === 0;
      quoteSelectionStatus.textContent = `${lines.length} produit${lines.length === 1 ? "" : "s"} sélectionné${lines.length === 1 ? "" : "s"}`;
    });

    const renderCart = () => {
      const lines = getCartLines(PRODUCTS, cart);
      const packCount = lines.reduce((sum, line) => sum + line.quantity, 0);
      const units = lines.reduce((sum, line) => sum + line.units, 0);
      const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      cartCount.textContent = String(packCount);
      cartButton.setAttribute(
        "aria-label",
        `Ouvrir le panier, ${packCount} pack${packCount === 1 ? "" : "s"}`,
      );
      quoteButton.disabled = lines.length === 0;
      cartList.replaceChildren(
        ...lines.map((line) => {
          const item = document.createElement("article");
          item.className = "sa-cart-item";

          const details = document.createElement("div");
          details.className = "sa-cart-item-details";
          const name = document.createElement("strong");
          name.textContent = line.product.details
            ? `${line.product.n} · ${line.product.details}`
            : line.product.n;
          if (line.productIndex === 0 || line.productIndex === 1) {
            const selectedColor = cartVariants.get(line.productIndex);
            if (selectedColor) name.textContent += ` · ${selectedColor}`;
          }
          const price = document.createElement("span");
          price.textContent = `Pack de ${line.unitsPerPack} · ${dh(line.unitPrice)} / pack`;
          details.append(name, price);

          const controls = document.createElement("div");
          controls.className = "sa-cart-item-controls";
          const decrease = document.createElement("button");
          decrease.type = "button";
          decrease.className = "sa-cart-change";
          decrease.dataset["cartAction"] = "decrease";
          decrease.dataset["productIndex"] = String(line.productIndex);
          decrease.setAttribute("aria-label", `Retirer un pack de ${line.product.n}`);
          decrease.textContent = "−";
          const quantity = document.createElement("output");
          quantity.textContent = String(line.quantity);
          const increase = document.createElement("button");
          increase.type = "button";
          increase.className = "sa-cart-change";
          increase.dataset["cartAction"] = "increase";
          increase.dataset["productIndex"] = String(line.productIndex);
          increase.setAttribute("aria-label", `Ajouter un pack de ${line.product.n}`);
          increase.textContent = "+";
          controls.append(decrease, quantity, increase);

          const lineTotal = document.createElement("strong");
          lineTotal.className = "sa-cart-line-total";
          lineTotal.textContent = dh(line.lineTotal);

          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "sa-cart-remove";
          remove.dataset["cartAction"] = "remove";
          remove.dataset["productIndex"] = String(line.productIndex);
          remove.setAttribute("aria-label", `Supprimer ${line.product.n} du panier`);
          remove.textContent = "Supprimer";

          item.append(details, controls, lineTotal, remove);
          return item;
        }),
      );
      cartEmpty.hidden = lines.length > 0;
      cartList.hidden = lines.length === 0;
      cartSummary.hidden = lines.length === 0;
      cartFields.hidden = lines.length === 0;
      cartNote.textContent =
        lines.length > 0
          ? "TVA non calculée. Vérifiez votre panier puis envoyez la demande de commande sur WhatsApp."
          : "Votre panier est vide. Ajoutez un ou plusieurs produits depuis la boutique.";
      submitButton.disabled = lines.length === 0;
      $(".sa-order-packs").textContent = `${packCount} pack${packCount === 1 ? "" : "s"}`;
      $(".sa-order-units").textContent = `${units} unités`;
      $(".sa-order-total").textContent = dh(total);
    };

    cartList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("[data-cart-action]");
      if (!button) return;
      const productIndex = Number(button.dataset["productIndex"]);
      const quantity = cart.get(productIndex);
      if (quantity === undefined) return;
      const action = button.dataset["cartAction"];
      if (action === "remove") {
        cart.delete(productIndex);
      } else if (action === "decrease" && quantity > 1) {
        cart.set(productIndex, quantity - 1);
      } else if (action === "increase" && quantity < 999) {
        cart.set(productIndex, quantity + 1);
      }
      renderCart();
    });

    cartButton.onclick = () => {
      quoteMode = false;
      orderTitle.textContent = "Votre panier";
      orderForm.hidden = false;
      quotePreview.hidden = true;
      quotePicker.hidden = true;
      quoteButton.hidden = true;
      submitButton.hidden = false;
      activeQuote = null;
      renderCart();
      orderDialog.showModal();
    };

    const createQuote = () => {
      const lines = getCartLines(PRODUCTS, quoteMode ? quoteQuantities : cart);
      if (lines.length === 0) return;
      const data = new FormData(orderForm);
      const items = lines.map((line) => ({
        product: line.product.n,
        variant:
          line.productIndex === 0 || line.productIndex === 1
            ? `${line.product.details ?? "Taille standard"} · ${quoteVariants.get(line.productIndex) ?? cartVariants.get(line.productIndex) ?? "Noir"}`
            : undefined,
        quantity: line.quantity,
        units: line.units,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      }));
      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const now = new Date();
      const date = now.toLocaleDateString("fr-FR");
      const quote: Quote = {
        number: `BDC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-6)}`,
        issuedAt: date,
        customerName: String(data.get("customerName") ?? ""),
        customerPhone: String(data.get("customerPhone") ?? ""),
        customerAddress: String(data.get("deliveryAddress") ?? ""),
        items,
        total,
      };
      activeQuote = quote;
      const previewValues: Record<string, string> = {
        ".sa-quote-number": quote.number,
        ".sa-quote-issued": quote.issuedAt,
        ".sa-quote-customer-name": quote.customerName,
        ".sa-quote-phone": quote.customerPhone,
        ".sa-quote-address": quote.customerAddress,
        ".sa-quote-total": dh(quote.total),
      };
      Object.entries(previewValues).forEach(([selector, value]) => {
        $<HTMLElement>(selector).textContent = value;
      });
      $(".sa-quote-lines").replaceChildren(
        ...quote.items.map((item) => {
          const row = document.createElement("div");
          const product = document.createElement("span");
          product.textContent = `${item.product}${item.variant ? ` · ${item.variant}` : ""} · ${item.quantity} pack${item.quantity > 1 ? "s" : ""} (${item.units} unités)`;
          const total = document.createElement("b");
          total.textContent = dh(item.lineTotal);
          row.append(product, total);
          return row;
        }),
      );
      orderForm.hidden = true;
      quotePreview.hidden = false;
      $<HTMLHeadingElement>("#sa-quote-title").focus({ preventScroll: true });
      orderDialog.scrollTop = 0;
    };

    const openQuoteFromMenu = () => {
      quoteMode = true;
      quoteQuantities.clear();
      quoteVariants.clear();
      quoteVariants.set(0, "Noir");
      quoteVariants.set(1, "Noir");
      quoteProductList.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
        input.value = "0";
      });
      quoteProductList
        .querySelectorAll<HTMLElement>(".sa-quote-color-options")
        .forEach((options) => {
          options.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
            button.classList.toggle("on", button.dataset["boxerColor"] === "Noir");
          });
        });
      orderForm.hidden = false;
      quotePreview.hidden = true;
      quotePicker.hidden = false;
      quoteSelectionStatus.textContent = "0 produit sélectionné";
      cartList.hidden = true;
      cartEmpty.hidden = true;
      cartSummary.hidden = true;
      cartFields.hidden = false;
      cartNote.textContent =
        "Choisissez les produits et les quantités. Vos coordonnées sont facultatives pour afficher le bon de commande.";
      orderTitle.textContent = "Créer un bon de commande";
      quoteButton.hidden = false;
      quoteButton.disabled = true;
      submitButton.hidden = true;
      activeQuote = null;
      if (!orderDialog.open) orderDialog.showModal();
    };
    addEventListener(OPEN_QUOTE_EVENT, openQuoteFromMenu);
    quoteButton.onclick = createQuote;

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
      pdf.text("BON DE COMMANDE", right, 28, { align: "right" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`N° ${quote.number}`, right, 35, { align: "right" });
      pdf.text(`Émis le ${quote.issuedAt}`, right, 41, { align: "right" });
      line(48);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Client", margin, 58);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(quote.customerName, margin, 65);
      pdf.text(quote.customerPhone, margin, 71);
      const addressLines = pdf.splitTextToSize(quote.customerAddress, pageWidth - margin * 2);
      pdf.text(addressLines, margin, 77);

      const tableTop = 85 + Math.max(0, addressLines.length - 1) * 5;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Détail de la commande", margin, tableTop);
      line(tableTop + 6);
      pdf.setFontSize(9);
      pdf.setTextColor(100, 96, 87);
      pdf.text("DÉSIGNATION", margin, tableTop + 13);
      pdf.text("MONTANT", right, tableTop + 13, { align: "right" });
      pdf.setTextColor(41, 39, 34);
      line(tableTop + 17);
      const itemsStart = tableTop + 25;
      quote.items.forEach((item, index) => {
        row(
          `${item.product}${item.variant ? ` · ${item.variant}` : ""} · ${item.quantity} pack${item.quantity > 1 ? "s" : ""} (${item.units} unités)`,
          formatPdfDh(item.lineTotal),
          itemsStart + index * 9,
        );
      });
      const totalsStart = itemsStart + quote.items.length * 9 + 4;
      line(totalsStart - 5);
      pdf.setFontSize(12);
      row("Total", formatPdfDh(quote.total), totalsStart + 3, true);
      line(totalsStart + 9);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(80, 76, 66);
      pdf.text("TVA non calculée. Livraison à confirmer, non comprise.", margin, totalsStart + 20);
      pdf.save(`bon-de-commande-marketspa-${quote.number.toLowerCase()}.pdf`);
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
      const alreadyAdded = cart.get(st.shown) ?? 0;
      const added = Math.min(st.packs, 999 - alreadyAdded);
      if (added === 0) {
        cartStatus.textContent = `La quantité maximale de ${p.n} est déjà dans le panier.`;
        return;
      }
      cart.set(st.shown, alreadyAdded + added);
      if (st.shown === 0 || st.shown === 1) {
        cartVariants.set(st.shown, selectedProductColors.get(st.shown) ?? "Noir");
      }
      cartStatus.textContent = `${added} pack${added > 1 ? "s" : ""} de ${p.n} ajouté${added > 1 ? "s" : ""} au panier.`;
      renderCart();
      st.packs = 1;
      updateOrder();
    };

    orderForm.onsubmit = (event) => {
      event.preventDefault();
      const data = new FormData(orderForm);
      const lines = getCartLines(PRODUCTS, cart);
      if (lines.length === 0) return;
      const total = lines.reduce((sum, item) => sum + item.lineTotal, 0);
      const body = [
        ...lines.flatMap((item, index) => [
          `${index + 1}. ${item.product.n}${item.product.details ? ` · ${item.product.details}` : ""}${(item.productIndex === 0 || item.productIndex === 1) && cartVariants.get(item.productIndex) ? ` · ${cartVariants.get(item.productIndex)}` : ""}`,
          `Quantité : ${item.quantity} pack${item.quantity > 1 ? "s" : ""} de ${item.unitsPerPack} unités (${item.units} unités)`,
          `Prix par pack : ${dh(item.unitPrice)}`,
          `Total ligne : ${dh(item.lineTotal)}`,
          "",
        ]),
        `Total estimé : ${dh(total)}`,
        "TVA non calculée.",
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

    $<HTMLButtonElement>(".sa-quote-download").onclick = downloadQuote;
    $<HTMLButtonElement>(".sa-quote-back").onclick = () => {
      quotePreview.hidden = true;
      orderForm.hidden = false;
      quotePicker.hidden = !quoteMode;
      (quoteButton.hidden ? cartButton : quoteButton).focus();
    };

    const setPacks = (n: number) => {
      st.packs = Math.max(1, Math.min(999, Math.round(n) || 1));
      if (st.shown >= 0) updateOrder();
    };
    $<HTMLButtonElement>(".sa-minus").onclick = () => setPacks(st.packs - 1);
    $<HTMLButtonElement>(".sa-plus").onclick = () => setPacks(st.packs + 1);

    const updateBuy = (k: number) => {
      const p = PRODUCTS[k]!;
      roll($(".sa-name"), p.n);
      roll(
        $(".sa-sub"),
        p.pack ? (p.details ?? `Pack de ${p.pack.units} unités`) : "Bientôt disponible",
      );
      boxerColors.hidden = k !== 0 && k !== 1;
      boxerColors.dataset["productIndex"] = String(k);
      boxerColors.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        button.classList.toggle(
          "on",
          button.dataset["boxerColor"] === (selectedProductColors.get(k) ?? "Noir"),
        );
      });
      buy.classList.toggle("is-soon", !p.pack);
      order.textContent = p.pack ? "Ajouter au panier" : "Nous contacter";
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
      removeEventListener(OPEN_QUOTE_EVENT, openQuoteFromMenu);
    };
  }, []);

  return (
    <section ref={root} id="boutique" className="shop" aria-label="Boutique">
      <div className="sa-room" style={{ backgroundImage: `url(${roomImg})` }} />

      <h2 className="sa-brand sa-glass">
        <span className="sa-brand-s">Market Spa</span>
        <span className="sa-brand-c">Marrakech</span>
      </h2>
      <button
        className="sa-cart-button sa-glass"
        type="button"
        aria-label="Ouvrir le panier, 0 packs"
      >
        Panier{" "}
        <span className="sa-cart-count" aria-live="polite">
          0
        </span>
      </button>
      <span className="sa-cart-status" role="status" aria-live="polite" />

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
          <span className="sa-lbl">Prix / pack</span>
          <div className="sa-tiers" />
        </div>
        <div className="sa-boxer-colors sa-paid" hidden>
          <span className="sa-lbl">Couleur</span>
          <div className="sa-color-options">
            <button
              type="button"
              className="sa-color-noir on"
              data-boxer-color="Noir"
              aria-label="Couleur noir"
              title="Noir"
            />
            <button
              type="button"
              className="sa-color-blanc"
              data-boxer-color="Blanc"
              aria-label="Couleur blanc"
              title="Blanc"
            />
          </div>
        </div>
        <div className="sa-opt sa-paid sa-sum">
          <span className="sa-lbl sa-save" />
          <div className="sa-ln sa-total" />
        </div>
        <button className="sa-order" type="button">
          Ajouter au panier
        </button>
      </div>

      <dialog className="sa-order-dialog sa-glass" aria-labelledby="sa-order-title">
        <form className="sa-order-form">
          <div className="sa-order-heading">
            <div>
              <p className="sa-order-eyebrow">Market Spa · Marrakech</p>
              <h2 id="sa-order-title">Votre panier</h2>
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

          <p className="sa-cart-empty" hidden>
            Votre panier est vide. Ajoutez un ou plusieurs produits depuis la boutique.
          </p>
          <section className="sa-quote-picker" aria-labelledby="sa-quote-picker-title" hidden>
            <h3 id="sa-quote-picker-title">Choisissez vos produits</h3>
            <div className="sa-quote-product-list" />
            <p className="sa-quote-selection-status" aria-live="polite">
              0 produit sélectionné
            </p>
            <p className="sa-quote-availability-note">
              Les prix sont actuellement disponibles pour les boxers homme et les strings femme.
            </p>
          </section>
          <div className="sa-cart-items" aria-live="polite" hidden />
          <dl className="sa-order-summary">
            <div>
              <dt>Nombre de packs</dt>
              <dd className="sa-order-packs" />
            </div>
            <div>
              <dt>Nombre total d’unités</dt>
              <dd className="sa-order-units" />
            </div>
            <div>
              <dt>Livraison</dt>
              <dd>À confirmer</dd>
            </div>
            <div className="sa-order-total-row">
              <dt>Total estimé</dt>
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
            Vérifiez votre panier puis envoyez la demande de commande sur WhatsApp.
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
            <button className="sa-order-quote" type="button" hidden>
              Afficher le bon de commande
            </button>
            <button className="sa-order-submit" type="submit">
              Commander via WhatsApp
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
                <h2 id="sa-quote-title" tabIndex={-1}>
                  Bon de commande
                </h2>
                <p>
                  N° <span className="sa-quote-number" />
                </p>
                <p>
                  Émis le <span className="sa-quote-issued" />
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
              <h3>Détail de la commande</h3>
              <div className="sa-quote-lines" />
            </div>

            <dl className="sa-quote-totals">
              <div className="sa-quote-grand-total">
                <dt>Total</dt>
                <dd className="sa-quote-total" />
              </div>
            </dl>

            <p className="sa-quote-delivery">Livraison à confirmer avec le client, non comprise.</p>
            <p className="sa-quote-disclaimer">TVA non calculée.</p>
          </div>

          <div className="sa-quote-actions">
            <button className="sa-quote-back" type="button">
              Modifier la commande
            </button>
            <button className="sa-quote-download" type="button">
              Télécharger le bon de commande PDF
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
