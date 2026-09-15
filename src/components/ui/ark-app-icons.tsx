// Icones de app da Ark no estilo macOS: squircle, gradiente, brilho no topo, glifo com
// profundidade. Paleta da identidade (amarelo #FFC700, preto, branco). Usados no dock da
// tela de entrada; importar por `ArkAppIcon` com o nome do app.

import type { CSSProperties } from "react";

// Superelipse (squircle) da Apple aproximada em 100x100.
const SQUIRCLE = "M50 0C12.5 0 0 12.5 0 50s12.5 50 50 50 50-12.5 50-50S87.5 0 50 0Z";

type Name = "meudia" | "tarefas" | "agenda" | "propostas" | "contratos" | "comercial" | "paginas";

const Base = ({
  id,
  from,
  to,
  children,
  size,
}: {
  id: string;
  from: string;
  to: string;
  children: React.ReactNode;
  size: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    aria-hidden="true"
    style={{ display: "block", filter: "drop-shadow(0 4px 8px rgba(0,0,0,.35))" }}
  >
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={from} />
        <stop offset="1" stopColor={to} />
      </linearGradient>
      <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity=".38" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <filter id={`sh-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000" floodOpacity=".35" />
      </filter>
      <clipPath id={`clip-${id}`}>
        <path d={SQUIRCLE} />
      </clipPath>
    </defs>
    <path d={SQUIRCLE} fill={`url(#bg-${id})`} />
    <g clipPath={`url(#clip-${id})`}>
      {children}
      {/* brilho de vidro no topo */}
      <path d="M0 0h100v46C70 40 30 40 0 46Z" fill={`url(#gloss-${id})`} />
    </g>
    <path d={SQUIRCLE} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
  </svg>
);

const Y = "#FFC700";
const Y2 = "#F2B300";
const K = "#0A0A0A";

const icons: Record<Name, (s: number) => React.ReactNode> = {
  // Meu Dia: sol nascendo sobre o horizonte, tile amarelo
  meudia: (s) => (
    <Base id="dia" from="#FFE04A" to={Y2} size={s}>
      <g filter="url(#sh-dia)">
        <rect x="14" y="62" width="72" height="22" rx="6" fill={K} />
        <circle cx="50" cy="60" r="19" fill="#fff" />
        <circle cx="50" cy="60" r="13" fill={K} />
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x="48.5" y="22" width="3" height="9" rx="1.5" fill={K} transform={`rotate(${-90 + i * 30} 50 60)`} />
        ))}
        <rect x="24" y="70" width="52" height="4" rx="2" fill={Y} />
      </g>
    </Base>
  ),
  // Kanban: tres colunas com cartoes, tile amarelo
  tarefas: (s) => (
    <Base id="tar" from="#FFE04A" to={Y2} size={s}>
      <g filter="url(#sh-tar)">
        <rect x="16" y="22" width="20" height="56" rx="5" fill={K} />
        <rect x="40" y="22" width="20" height="40" rx="5" fill={K} />
        <rect x="64" y="22" width="20" height="30" rx="5" fill={K} />
        <rect x="20" y="28" width="12" height="8" rx="2" fill={Y} />
        <rect x="20" y="40" width="12" height="8" rx="2" fill={Y} />
        <rect x="20" y="52" width="12" height="8" rx="2" fill="#fff" opacity=".9" />
        <rect x="44" y="28" width="12" height="8" rx="2" fill={Y} />
        <rect x="44" y="40" width="12" height="8" rx="2" fill="#fff" opacity=".9" />
        <rect x="68" y="28" width="12" height="8" rx="2" fill="#fff" opacity=".9" />
      </g>
    </Base>
  ),
  // Calendario: tile grafite, faixa amarela em cima e o dia grande
  agenda: (s) => (
    <Base id="age" from="#3B3B41" to="#141417" size={s}>
      <g filter="url(#sh-age)">
        <rect x="16" y="18" width="68" height="66" rx="12" fill="#fff" />
        <path d="M16 30c0-6.6 5.4-12 12-12h44c6.6 0 12 5.4 12 12v10H16Z" fill={Y} />
        <circle cx="30" cy="29" r="3" fill={K} />
        <circle cx="70" cy="29" r="3" fill={K} />
        <text
          x="50"
          y="74"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="30"
          fill={K}
        >
          15
        </text>
      </g>
    </Base>
  ),
  // Documento com dobra e linhas, caneta amarela: tile branco
  propostas: (s) => (
    <Base id="pro" from="#FFFFFF" to="#E4E4E6" size={s}>
      <g filter="url(#sh-pro)">
        <path d="M26 16h34l16 16v52a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6Z" fill={K} />
        <path d="M60 16v12a4 4 0 0 0 4 4h12Z" fill="#3A3A40" />
        <rect x="30" y="42" width="30" height="5" rx="2.5" fill={Y} />
        <rect x="30" y="53" width="40" height="5" rx="2.5" fill="#fff" opacity=".85" />
        <rect x="30" y="64" width="34" height="5" rx="2.5" fill="#fff" opacity=".85" />
        <path d="M64 86 84 66l6 6-20 20-8 2Z" fill={Y} />
        <path d="M84 66l6 6 3-3a4 4 0 0 0-6-6Z" fill={K} />
      </g>
    </Base>
  ),
  // Contrato: tile preto, folha branca, assinatura amarela e selo
  contratos: (s) => (
    <Base id="con" from="#2B2B30" to="#0E0E11" size={s}>
      <g filter="url(#sh-con)">
        <rect x="22" y="16" width="56" height="70" rx="7" fill="#fff" />
        <rect x="30" y="28" width="28" height="4" rx="2" fill="#C9C9CE" />
        <rect x="30" y="37" width="40" height="4" rx="2" fill="#C9C9CE" />
        <rect x="30" y="46" width="34" height="4" rx="2" fill="#C9C9CE" />
        <path
          d="M30 70c6-10 10-10 12-2s5 6 9-3 7-8 10 1"
          fill="none"
          stroke={Y}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="70" cy="70" r="10" fill={Y} />
        <path
          d="M65 70l3.5 3.5L76 66"
          fill="none"
          stroke={K}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </Base>
  ),
  // Loja com toldo listrado: tile amarelo
  comercial: (s) => (
    <Base id="com" from="#FFE04A" to={Y2} size={s}>
      <g filter="url(#sh-com)">
        <rect x="20" y="44" width="60" height="38" rx="5" fill={K} />
        <rect x="42" y="58" width="16" height="24" rx="3" fill={Y} />
        <rect x="26" y="52" width="10" height="10" rx="2" fill="#fff" opacity=".9" />
        <rect x="64" y="52" width="10" height="10" rx="2" fill="#fff" opacity=".9" />
        <path d="M16 44V32l8-14h52l8 14v12Z" fill={K} />
        <path
          d="M16 44c0-4 3-7 6.5-7S29 40 29 44Zm13 0c0-4 3-7 6.5-7S42 40 42 44Zm13 0c0-4 3-7 6.5-7S55 40 55 44Zm13 0c0-4 3-7 6.5-7S68 40 68 44Zm13 0c0-4 3-7 6.5-7S84 40 84 44Z"
          fill="#fff"
        />
        <path d="M29 44c0-4 3-7 6.5-7S42 40 42 44Zm26 0c0-4 3-7 6.5-7S68 40 68 44Z" fill={Y} />
      </g>
    </Base>
  ),
  // Bussola (estilo Safari) em amarelo: tile grafite
  paginas: (s) => (
    <Base id="pag" from="#3B3B41" to="#141417" size={s}>
      <g filter="url(#sh-pag)">
        <circle cx="50" cy="50" r="32" fill="#fff" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="#D9D9DE" strokeWidth="1.5" />
        {Array.from({ length: 12 }).map((_, i) => (
          <rect
            key={i}
            x="49"
            y="20"
            width="2"
            height={i % 3 === 0 ? 7 : 4}
            rx="1"
            fill="#8E8E93"
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        <path d="M50 26 58 50 50 74 42 50Z" fill={Y} />
        <path d="M50 26 58 50H42Z" fill={K} />
        <circle cx="50" cy="50" r="3.5" fill="#fff" />
      </g>
    </Base>
  ),
};

export function ArkAppIcon({
  name,
  size = 48,
  style,
}: {
  name: Name;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span style={{ display: "inline-block", lineHeight: 0, ...style }}>{icons[name](size)}</span>
  );
}
