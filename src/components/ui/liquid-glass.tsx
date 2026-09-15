"use client";

import React from "react";

// Liquid Glass (21st.dev, @suraj-xd) adaptado pra ARK: vidro com refracao por filtro SVG,
// dock de atalhos e botao. Sem imagem externa: os icones vem como ReactNode.

interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href?: string;
  target?: string;
  onClick?: () => void;
}

const EASE = "cubic-bezier(0.175, 0.885, 0.32, 2.2)";

export const GlassEffect: React.FC<GlassEffectProps> = ({
  children,
  className = "",
  style = {},
  href,
  target = "_self",
  onClick,
}) => {
  const glassStyle: React.CSSProperties = {
    boxShadow: "0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)",
    transitionTimingFunction: EASE,
    ...style,
  };

  const content = (
    <div
      className={`relative flex overflow-hidden text-white transition-transform duration-500 ${className}`}
      style={glassStyle}
      onClick={onClick}
    >
      {/* Camadas do vidro: refracao, tinta e brilho da borda */}
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
        style={{
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          filter: "url(#glass-distortion)",
          isolation: "isolate",
        }}
      />
      <div className="absolute inset-0 z-10 rounded-[inherit]" style={{ background: "rgba(255, 255, 255, 0.14)" }} />
      <div
        className="absolute inset-0 z-20 rounded-[inherit] overflow-hidden"
        style={{
          boxShadow:
            "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.45), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.35)",
        }}
      />
      <div className="relative z-30 w-full">{children}</div>
    </div>
  );

  return href ? (
    <a href={href} target={target} rel="noopener noreferrer" className="block">
      {content}
    </a>
  ) : (
    content
  );
};

export interface DockItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  /** gradiente do tile (estilo icone de app da Apple) */
  tint?: string;
}

// Tile estilo icone de app da Apple: quadrado arredondado com gradiente, brilho no topo e glifo branco.
export const AppTile: React.FC<{ tint?: string; children: React.ReactNode; size?: number }> = ({ tint = "linear-gradient(180deg,#5b5b5f 0%,#2c2c30 100%)", children, size = 44 }) => (
  <span
    className="relative flex items-center justify-center overflow-hidden rounded-[11px] text-white"
    style={{
      width: size,
      height: size,
      background: tint,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(0,0,0,.25), 0 4px 10px rgba(0,0,0,.35)",
    }}
  >
    <span
      className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
      style={{ background: "linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0))" }}
    />
    <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,.35)]">{children}</span>
  </span>
);

export const GlassDock: React.FC<{ items: DockItem[]; className?: string }> = ({ items, className = "" }) => (
  <GlassEffect className={`rounded-3xl p-2.5 ${className}`}>
    <div className="flex flex-wrap items-center justify-center gap-1">
      {items.map((it) => {
        const inner = (
          <div
            className="group flex w-[68px] flex-col items-center justify-center gap-1.5 py-1.5 cursor-pointer will-change-transform transition-transform duration-300 ease-out hover:-translate-y-1 hover:scale-[1.08]"
            style={{ transformOrigin: "center bottom" }}
            title={it.label}
            onClick={it.onClick}
          >
            <AppTile tint={it.tint}>{it.icon}</AppTile>
            <span className="text-[9px] font-semibold uppercase tracking-[.1em] text-white/80 group-hover:text-white">
              {it.label}
            </span>
          </div>
        );
        return it.href ? (
          <a key={it.label} href={it.href} className="block">
            {inner}
          </a>
        ) : (
          <div key={it.label}>{inner}</div>
        );
      })}
    </div>
  </GlassEffect>
);

export const GlassButton: React.FC<{ children: React.ReactNode; href?: string; onClick?: () => void; className?: string }> = ({
  children,
  href,
  onClick,
  className = "",
}) => (
  <GlassEffect href={href} onClick={onClick} className={`rounded-3xl px-8 py-4 cursor-pointer will-change-transform hover:scale-[1.03] ${className}`}>
    <div>
      {children}
    </div>
  </GlassEffect>
);

// Filtro SVG que faz a refracao "liquida". Renderizar uma vez por pagina.
export const GlassFilter: React.FC = () => (
  <svg style={{ display: "none" }} aria-hidden="true">
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence" />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting
        in="softMap"
        surfaceScale="5"
        specularConstant="1"
        specularExponent="100"
        lightingColor="white"
        result="specLight"
      >
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
      <feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);
