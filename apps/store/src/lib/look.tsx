const palettes = [
  { bag: "#6b3f22", label: "#f6efe4", accent: "#d9a35b" },
  { bag: "#2f5d3a", label: "#fffaf2", accent: "#e7c27a" },
  { bag: "#8c2f1b", label: "#fdf3e3", accent: "#f0b45a" },
  { bag: "#2b1a10", label: "#f6efe4", accent: "#c98b4a" },
];

/** Illustrated coffee bag, colored per product. */
export function CoffeeBag({ index, name }: { index: number; name: string }) {
  const p = palettes[index % palettes.length]!;
  return (
    <svg viewBox="0 0 200 220" className="h-44 w-auto drop-shadow-sm" aria-label={name}>
      <path d="M40 30 L160 30 L172 205 Q100 215 28 205 Z" fill={p.bag} />
      <path d="M40 30 L160 30 L156 50 L44 50 Z" fill="#000" opacity="0.15" />
      <rect x="62" y="80" width="76" height="86" rx="6" fill={p.label} />
      <circle cx="100" cy="110" r="16" fill={p.accent} />
      <path d="M100 97 C92 104 92 116 100 123 C108 116 108 104 100 97Z" fill={p.bag} opacity="0.6" />
      <rect x="74" y="136" width="52" height="5" rx="2" fill={p.bag} opacity="0.7" />
      <rect x="82" y="147" width="36" height="4" rx="2" fill={p.bag} opacity="0.4" />
    </svg>
  );
}
