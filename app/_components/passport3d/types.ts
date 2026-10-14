export type Phase = 'closed' | 'open' | 'stamped' | 'route';

/** Famílias de fonte resolvidas (strings CSS) usadas para desenhar nos canvas. */
export interface PassportFonts {
  display: string; // Archivo
  text: string; // Inter
  mono: string; // JetBrains Mono
}

/** Estado que as texturas leem a cada redesenho. */
export interface PassportState {
  name: string;
  typed: boolean;
  focus: boolean;
  caret: boolean;
  num: string;
  date: string;
  stamped: boolean;
}

export interface PassportAssets {
  comandante: HTMLImageElement | null;
  wordmark: HTMLImageElement | null;
}

export interface EngineCallbacks {
  onPhase?: (p: Phase) => void;
  /** Toque/clique no passaporte. A UI decide o que fazer (focar nome, abrir, carimbar…). */
  onBookTap?: (p: Phase) => void;
  /** Fim da animação da rota: hora de abrir o checkout. */
  onRouteReady?: () => void;
  onError?: (e: unknown) => void;
}
