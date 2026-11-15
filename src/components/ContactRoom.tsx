/**
 * Décor de la vue Contact : plateforme, fauteuil coquillage,
 * guéridon et deux coussins. Illustration SVG originale (pas d'image externe).
 */
export function ContactRoom() {
  // lobes du dossier « coquillage » : angle (°)
  const lobes = [-52, -31, -10, 10, 31, 52];

  return (
    <svg className="room-svg" viewBox="0 0 1000 620" aria-hidden="true">
      <defs>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="softer" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <linearGradient id="slabTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e9e6" />
          <stop offset="1" stopColor="#ecd6d1" />
        </linearGradient>
        <linearGradient id="slabFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7cfca" />
          <stop offset="1" stopColor="#d9b9b3" />
        </linearGradient>
        <linearGradient id="slabSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcc0bb" />
          <stop offset="1" stopColor="#c9a6a0" />
        </linearGradient>
        <linearGradient id="velvet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a1a6" />
          <stop offset="1" stopColor="#b9787f" />
        </linearGradient>
        <linearGradient id="velvetDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c98b91" />
          <stop offset="1" stopColor="#a5666d" />
        </linearGradient>
        <radialGradient id="cushion" cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#dca6aa" />
          <stop offset=".7" stopColor="#bf8288" />
          <stop offset="1" stopColor="#a86c72" />
        </radialGradient>
        <linearGradient id="tableTop" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8494b5" />
          <stop offset="1" stopColor="#6a7a9c" />
        </linearGradient>
        <linearGradient id="stripes" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="topClip">
          <polygon points="80,392 600,300 920,388 400,500" />
        </clipPath>
      </defs>

      {/* ---- reflet dans l'eau ---- */}
      <g transform="translate(0 1080) scale(1 -1)" opacity=".22" filter="url(#softer)">
        <polygon points="80,430 400,540 920,426 920,388 400,500 80,392" fill="#d9b9b3" />
      </g>

      {/* ---- plateforme ---- */}
      <ellipse
        cx="500"
        cy="520"
        rx="440"
        ry="40"
        fill="#7a4b55"
        opacity=".18"
        filter="url(#soft)"
      />
      <polygon points="80,392 400,500 400,540 80,430" fill="url(#slabFront)" />
      <polygon points="400,500 920,388 920,426 400,540" fill="url(#slabSide)" />
      <polygon points="80,392 600,300 920,388 400,500" fill="url(#slabTop)" />
      {/* lumière en lamelles sur la plateforme */}
      <g clipPath="url(#topClip)" opacity=".7">
        {Array.from({ length: 9 }, (_, i) => (
          <rect
            key={i}
            x={40 + i * 26}
            y="300"
            width="9"
            height="260"
            fill="url(#stripes)"
            transform={`skewX(-38) translate(${i * 2} 0)`}
          />
        ))}
      </g>

      {/* ---- coussins ---- */}
      <ellipse
        cx="345"
        cy="398"
        rx="78"
        ry="16"
        fill="#6b3d46"
        opacity=".25"
        filter="url(#softer)"
      />
      <path
        d="M272 372c10-26 120-34 146-10 12 12 8 32-6 40-34 18-118 18-138 0-6-8-6-20-2-30z"
        fill="url(#cushion)"
      />
      <path
        d="M282 384c40 6 90 4 128-4"
        stroke="#9c5f66"
        strokeWidth="2"
        fill="none"
        opacity=".5"
      />
      <ellipse
        cx="262"
        cy="440"
        rx="86"
        ry="18"
        fill="#6b3d46"
        opacity=".28"
        filter="url(#softer)"
      />
      <path
        d="M180 410c12-30 134-40 164-12 14 14 10 36-6 46-38 20-132 20-154 0-8-8-8-22-4-34z"
        fill="url(#cushion)"
      />
      <path
        d="M192 424c44 6 100 4 142-4"
        stroke="#9c5f66"
        strokeWidth="2"
        fill="none"
        opacity=".5"
      />

      {/* ---- guéridon ---- */}
      <ellipse cx="500" cy="414" rx="42" ry="8" fill="#5a3640" opacity=".3" filter="url(#softer)" />
      <line x1="500" y1="318" x2="500" y2="410" stroke="#8a97b3" strokeWidth="4" />
      <ellipse cx="500" cy="410" rx="30" ry="6" fill="#7d8aa8" />
      <ellipse cx="500" cy="320" rx="62" ry="10" fill="#5f6e8f" />
      <ellipse cx="500" cy="316" rx="62" ry="10" fill="url(#tableTop)" />

      {/* ---- fauteuil coquillage ---- */}
      <ellipse cx="690" cy="404" rx="110" ry="16" fill="#5a3640" opacity=".3" filter="url(#soft)" />
      <g stroke="#9aa3b8" strokeWidth="4" strokeLinecap="round">
        <line x1="618" y1="350" x2="606" y2="402" />
        <line x1="760" y1="350" x2="774" y2="398" />
        <line x1="650" y1="356" x2="652" y2="414" />
        <line x1="728" y1="356" x2="730" y2="410" />
      </g>
      <g transform="translate(690 330)">
        {lobes.map((a, i) => (
          <g key={a} transform={`rotate(${a})`}>
            <rect
              x="-24"
              y="-150"
              width="48"
              height="150"
              rx="24"
              fill={i % 2 ? "url(#velvet)" : "url(#velvetDark)"}
            />
            <rect x="-5" y="-138" width="10" height="110" rx="5" fill="#fff" opacity=".12" />
          </g>
        ))}
      </g>
      <path
        d="M598 318c0-22 18-30 40-30h104c22 0 40 8 40 30v22c0 14-12 20-26 20H624c-14 0-26-6-26-20z"
        fill="url(#velvetDark)"
      />
      <path
        d="M612 306c0-14 14-20 30-20h96c16 0 30 6 30 20v8c0 8-8 12-18 12H630c-10 0-18-4-18-12z"
        fill="url(#velvet)"
      />
      <rect x="588" y="282" width="36" height="66" rx="18" fill="url(#velvet)" />
      <rect x="756" y="282" width="36" height="66" rx="18" fill="url(#velvetDark)" />
    </svg>
  );
}
