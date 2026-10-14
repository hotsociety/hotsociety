// Ícones de traço simples (24x24) usados na área de membros.
const PATHS = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  play: "M4 4h16v16H4zM10 8.5v7l6-3.5z",
  plane: "M2.5 13.5 21 6l-3.5 12-5-3.5-3 3.5v-5L18 8l-11 5z",
  chat: "M4 4h16v12H8l-4 4zM8 9h8M8 12h5",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  tool: "M14.5 6.5a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8zM3 21l6-6M4 4l5 5",
  medal: "M8 3h8l-2 6h-4zM12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 12.5l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 14.8l2-.3z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  close: "M6 6l12 12M18 6 6 18",
  out: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  check: "M5 12.5l4.5 4.5L19 7",
  lock: "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  fire: "M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.8 3.2-5.8 3.7-9.8 2.6 1.6 3.6 3.9 3.6 6 1-.6 1.8-1.7 2-3 2 1.8 3.7 4.3 3.7 6.9 0 3.6-2.5 6.1-6.5 6.1z",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9.5 9.5c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.4-2.5 1.8-2.5.8-2.5 1.9 1.1 1.8 2.5 1.8 2.5-.7 2.5-1.8",
  copy: "M8 8h12v12H8zM4 16V4h12",
  send: "M3 11 21 3l-8 18-2-8z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  live: "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14",
  back: "M15 5l-7 7 7 7",
  arrow: "M5 12h14M13 6l6 6-6 6",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
