/** Crosshair sparkle in a ring, decorative. */
export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`grid size-16 place-items-center rounded-full border border-line bg-bg ${className}`}>
      <svg viewBox="0 0 24 24" className="size-7 text-brand" fill="currentColor">
        <path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0z" />
      </svg>
    </div>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <path d="M10 9h12v3.2h-8.4v3.4h7.2v3.2h-7.2V23H10z" fill="#fff" />
    </svg>
  );
}
