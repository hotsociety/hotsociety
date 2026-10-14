'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ASSETS, NAME_MAX, PLANS, ROUTE, SLOGAN, STORAGE_KEY, type PlanId } from './config';
import type { PassportEngine } from './engine';
import type { PassportAssets, PassportFonts, PassportState, Phase } from './types';
import { brDate, brl, cleanName, passportDate, passportNumber } from './utils';
import './passport3d.css';
import s from './passport3d.styles';

export interface ActivateArgs {
  plan: PlanId;
  method: 'default' | 'pix' | 'card';
  name: string;
  passportNumber: string;
}

export interface Passport3DProps {
  /** Botões de pagamento. Sem esta prop, redireciona para o link do plano em site.ts (CHECKOUT). */
  onActivate?: (args: ActivateArgs) => void | Promise<void>;
  /** "Quero a Primeira Classe" (mentoria). */
  onFirstClass?: () => void;
  /** Nome digitado (debounced). Útil para salvar lead no Supabase. */
  onLeadName?: (name: string, passportNumber: string) => void;
}

const STATUS: Record<Phase, string> = { closed: 'fechado', open: 'aberto', stamped: 'carimbado', route: 'pronto para ativar' };
const ROUTE_STR = ROUTE.map((r) => r.code).join(' → ');

/** Lê as famílias geradas pelo next/font (variáveis CSS) para desenhar no canvas. */
function resolveFonts(): PassportFonts {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fb: string) => {
    const val = cs.getPropertyValue(name).trim();
    return val ? `${val}, ${fb}` : fb;
  };
  return {
    display: v('--font-archivo', '"Archivo", "Inter", sans-serif'),
    text: v('--font-inter', '"Inter", system-ui, sans-serif'),
    mono: v('--font-jetbrains', '"JetBrains Mono", ui-monospace, monospace'),
  };
}

const noop = () => () => {};
/** Lidos só no navegador (no servidor ficam vazios): evita divergência de hidratação. */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function savedName() {
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? '').slice(0, NAME_MAX);
  } catch {
    return '';
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

export default function Passport3D({ onActivate, onFirstClass, onLeadName }: Passport3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const payRef = useRef<HTMLButtonElement>(null);
  const engineRef = useRef<PassportEngine | null>(null);
  const stateRef = useRef<PassportState>({
    name: 'SEU NOME',
    typed: false,
    focus: false,
    caret: false,
    num: passportNumber('SEU NOME'),
    date: passportDate(),
    stamped: false,
  });
  const assetsRef = useRef<PassportAssets>({ comandante: null, wordmark: null });
  const leadRef = useRef(onLeadName);

  const [phase, setPhase] = useState<Phase>('closed');
  const [typedRaw, setTypedRaw] = useState<string | null>(null);
  const stored = useSyncExternalStore(noop, savedName, () => '');
  const raw = typedRaw ?? stored;
  const [focused, setFocused] = useState(false);
  const [coOpen, setCoOpen] = useState(false);
  const [plan, setPlan] = useState<PlanId>('anual');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // data do usuário (BRT), não do servidor (UTC)
  const dayKey = useSyncExternalStore(noop, todayKey, () => '');
  const today = useMemo(() => {
    if (!dayKey) return null;
    const [y, m, d] = dayKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [dayKey]);

  const name = cleanName(raw);
  const typed = !!name;
  const num = passportNumber(name || 'SEU NOME');

  /* ── ações ── */
  const focusName = useCallback(() => inputRef.current?.focus({ preventScroll: true }), []);

  const openCheckout = useCallback(() => {
    if (engineRef.current?.phase !== 'route') return;
    setCoOpen(true);
    engineRef.current.setCheckoutOpen(true);
    setTimeout(() => payRef.current?.focus({ preventScroll: true }), 450);
  }, []);

  const closeCheckout = useCallback(() => {
    setCoOpen(false);
    setNote(null);
    engineRef.current?.setCheckoutOpen(false);
  }, []);

  const doOpen = useCallback(() => {
    const e = engineRef.current;
    if (!e || e.phase !== 'closed') return;
    if (!stateRef.current.typed) return focusName();
    inputRef.current?.blur();
    e.open();
  }, [focusName]);

  const reset = useCallback(() => {
    closeCheckout();
    engineRef.current?.reset();
  }, [closeCheckout]);

  // o engine chama isso; refs evitam recriar a cena quando as funções mudam
  const tapRef = useRef<(p: Phase) => void>(() => {});
  const routeReadyRef = useRef(openCheckout);
  useEffect(() => {
    leadRef.current = onLeadName;
    routeReadyRef.current = openCheckout;
    tapRef.current = (p) => {
      const st = stateRef.current;
      if (p === 'closed') {
        if (!st.typed || st.focus) focusName();
        else doOpen();
      } else if (p === 'open') engineRef.current?.stamp();
      else if (p === 'route') openCheckout();
    };
  });

  /* ── monta a cena 3D (client-only; three é importado sob demanda) ── */
  useEffect(() => {
    let cancelled = false;
    let engine: PassportEngine | null = null;
    const canvas = canvasRef.current!;

    (async () => {
      try {
        const { PassportEngine } = await import('./engine');
        if (cancelled) return;
        engine = new PassportEngine({
          canvas,
          fonts: resolveFonts(),
          state: stateRef.current,
          assets: assetsRef.current,
          reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          callbacks: {
            onPhase: setPhase,
            onBookTap: (p) => tapRef.current(p),
            onRouteReady: () => routeReadyRef.current(),
          },
        });
        engineRef.current = engine;
        // em dev, deixa o engine acessível no console: window.__hsPassport
        if (process.env.NODE_ENV !== 'production') (window as unknown as { __hsPassport?: PassportEngine }).__hsPassport = engine;
      } catch (err) {
        console.error('[Passport3D] WebGL indisponível', err);
        if (!cancelled) setFailed(true);
        return;
      }

      // fontes e imagens chegam depois: redesenha quando estiverem prontas
      const F = resolveFonts();
      const fontLoads = [`900 40px ${F.display}`, `700 40px ${F.mono}`, `600 20px ${F.text}`].map((f) => document.fonts?.load(f).catch(() => null));
      const [cmd, wm] = await Promise.all([loadImage(ASSETS.comandante), loadImage(ASSETS.wordmark)]);
      await Promise.all(fontLoads);
      if (cancelled) return;
      assetsRef.current.comandante = cmd;
      assetsRef.current.wordmark = wm;
      engine.refreshAll();
    })();

    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  /* ── nome → estado do passaporte ── */
  useEffect(() => {
    const st = stateRef.current;
    st.typed = typed;
    st.name = name || 'SEU NOME';
    st.num = num;
    st.caret = st.focus;
    engineRef.current?.refreshCover();
    const t = setTimeout(() => {
      engineRef.current?.refreshPages();
      try {
        localStorage.setItem(STORAGE_KEY, raw);
      } catch {}
      if (typed) leadRef.current?.(name, num);
    }, 150);
    return () => clearTimeout(t);
  }, [raw, name, typed, num]);

  useEffect(() => {
    if (!coOpen) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && closeCheckout();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [coOpen, closeCheckout]);

  /* ── checkout ── */
  const p = PLANS[plan];
  const renew = useMemo(() => {
    if (!today) return '—';
    const d = new Date(today);
    if (plan === 'anual') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return brDate(d);
  }, [plan, today]);
  const monthlyEq = PLANS.anual.price / 12;
  const saving = PLANS.mensal.price * 12 - PLANS.anual.price;

  async function activate(method: ActivateArgs['method']) {
    if (!onActivate) {
      // padrão: link de pagamento do gateway (NEXT_PUBLIC_CHECKOUT_MENSAL / _ANUAL)
      setNote('Indo para o pagamento seguro…');
      window.location.href = PLANS[plan].checkout;
      return;
    }
    setBusy(true);
    try {
      await onActivate({ plan, method, name, passportNumber: num });
    } catch (e) {
      console.error(e);
      setNote('Não foi possível iniciar o pagamento. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  const hint =
    phase === 'closed'
      ? typed
        ? 'Toque em Abrir para ver seu passaporte'
        : 'Toque no passaporte e escreva seu nome'
      : phase === 'open'
        ? 'Arraste para girar · Carimbe o Brasil'
        : phase === 'stamped'
          ? 'Carimbo do Brasil emitido'
          : `${ROUTE_STR} · Ative seu passaporte`;

  return (
    <section className={s.root} data-co={coOpen ? '1' : undefined} aria-label="Passaporte HOT SOCIETY">
      <div className={s.bg} style={{ backgroundImage: `url(${ASSETS.hero})` }} aria-hidden="true" />
      <div className={s.bgov} aria-hidden="true" />
      <canvas ref={canvasRef} className={s.stage} aria-label="Passaporte HOT SOCIETY em 3D. Use o painel para abrir, carimbar e ver a rota." />
      <div className={s.grain} aria-hidden="true" />
      <p className={s.motto} aria-hidden="true">
        Não existe<b>nobreza</b>na pobreza
      </p>
      <p className={s.hint} aria-live="polite">{hint}</p>
      {failed && <div className={s.fallback}>Não foi possível carregar o 3D neste navegador.</div>}

      <div className={s.panel} role="region" aria-label="Controles do passaporte">
        <p className={s.eb}>HOT SOCIETY · Passaporte</p>
        <h1 className={s.ttl}>
          {SLOGAN.a}
          <br />
          <span>{SLOGAN.b}</span>
        </h1>

        <label htmlFor="hs-nome" className={s.srOnly}>
          Seu nome no passaporte
        </label>
        <input
          ref={inputRef}
          id="hs-nome"
          className={s.ghost}
          value={raw}
          maxLength={NAME_MAX}
          autoComplete="off"
          autoCapitalize="characters"
          enterKeyHint="go"
          onChange={(e) => setTypedRaw(e.target.value)}
          onFocus={() => {
            setFocused(true);
            stateRef.current.focus = true;
            engineRef.current?.setFocus(true);
          }}
          onBlur={() => {
            setFocused(false);
            stateRef.current.focus = false;
            engineRef.current?.setFocus(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              inputRef.current?.blur();
              if (typed) doOpen();
            }
          }}
        />
        <button type="button" className={`${s.namebtn} ${typed ? s.ok : ''}`} onClick={focusName}>
          <span>{typed ? name : focused ? 'Digitando no passaporte…' : 'Toque no passaporte e escreva seu nome'}</span>
          <i>✎</i>
        </button>

        <div className={s.steps}>
          <button type="button" className={phase === 'closed' ? s.p : ''} disabled={phase !== 'closed'} onClick={doOpen}>
            1 · Abrir
          </button>
          <button type="button" className={phase === 'open' ? s.p : ''} disabled={phase !== 'open'} onClick={() => engineRef.current?.stamp()}>
            2 · Carimbar
          </button>
          <button type="button" className={phase === 'route' ? s.p : ''} disabled={phase !== 'route'} onClick={openCheckout}>
            3 · Ativar
          </button>
        </div>
        <div className={s.foot}>
          <span>Estado: {STATUS[phase]}</span>
          <button type="button" onClick={reset}>
            Recomeçar
          </button>
        </div>
      </div>

      <aside className={`${s.checkout} ${coOpen ? s.coOpen : ''}`} aria-label="Ativar passaporte" aria-hidden={!coOpen}>
        <button type="button" className={s.x} onClick={closeCheckout} aria-label="Fechar">
          ×
        </button>
        <p className={s.eb}>Último passo</p>

        <div className={s.bp}>
          <div className={s.bpM}>
            <div>
              <small>Passageiro</small>
              <b>{name || 'SEU NOME'}</b>
            </div>
            <div className={s.rt}>
              ZERO<i />
              {ROUTE[0].code}
              <i />
              <span>{ROUTE[ROUTE.length - 1].code}</span>
            </div>
            <div className={s.bpRow}>
              <div>
                <small>Passaporte</small>
                <b>{num}</b>
              </div>
              <div>
                <small>Emissão</small>
                <b>{today ? passportDate(today) : '—'}</b>
              </div>
            </div>
          </div>
          <div className={s.bpSt}>
            <div className={s.stamp}>
              {ROUTE[0].country}
              <span>EMITIDO</span>
            </div>
          </div>
        </div>

        <h2 className={s.big}>
          Seu passaporte<span>está carimbado.</span>
        </h2>
        <p className={s.lead}>Falta ativar para embarcar. Escolha sua classe e comece pelo Brasil hoje.</p>

        <div className={s.plans} role="radiogroup" aria-label="Plano">
          <label className={s.plan}>
            <input type="radio" name="hs-plano" value="anual" checked={plan === 'anual'} onChange={() => setPlan('anual')} />
            <span>
              <b>{PLANS.anual.label}</b>
              <small>
                {brl(Math.round(monthlyEq * 100) / 100)} por mês · economize {brl(saving)}
              </small>
            </span>
            <span className={s.pr}>
              {brl(PLANS.anual.price)}
              <small>{PLANS.anual.per}</small>
            </span>
            <span className={s.rib}>Melhor valor</span>
          </label>
          <label className={s.plan}>
            <input type="radio" name="hs-plano" value="mensal" checked={plan === 'mensal'} onChange={() => setPlan('mensal')} />
            <span>
              <b>{PLANS.mensal.label}</b>
              <small>Renova todo mês, sem fidelidade</small>
            </span>
            <span className={s.pr}>
              {brl(PLANS.mensal.price)}
              <small>{PLANS.mensal.per}</small>
            </span>
          </label>
        </div>

        <ul className={s.inc}>
          <li>Hot Academy completa: modelo IA e modelo white</li>
          <li>Ferramentas: prompts, abordagens, tráfego e funil</li>
          <li>Assistente CappuIA para tirar dúvidas</li>
          <li>Feed, missões, ranking e placas 10K · 50K · 100K · 500K · 1M</li>
        </ul>

        <div className={s.sum}>
          <div className={s.tot}>
            <span>Hoje</span>
            <span>{brl(p.price)}</span>
          </div>
          <span>
            {plan === 'anual' ? 'Cobrança anual' : 'Cobrança mensal'}. Renova em {renew}. Cancele em 2 cliques.
          </span>
          <span>7 dias de garantia com reembolso integral.</span>
        </div>

        <button ref={payRef} type="button" className={s.cta} disabled={busy} onClick={() => activate('default')}>
          Ativar passaporte · {brl(p.price)}
        </button>
        <div className={s.alt}>
          <button type="button" disabled={busy} onClick={() => activate('pix')}>
            Pagar com Pix
          </button>
          <button type="button" disabled={busy} onClick={() => activate('card')}>
            {plan === 'anual' ? 'Cartão em até 12×' : 'Cartão de crédito'}
          </button>
        </div>
        {note && <div className={s.okBox}>{note}</div>}
        <button type="button" className={s.first} onClick={() => (onFirstClass ? onFirstClass() : setNote('Primeira Classe é por aplicação (conecte o formulário em onFirstClass).'))}>
          Quero a Primeira Classe (mentoria com o Cappu) →
        </button>
        <p className={s.note}>+18. Pagamento processado pelo gateway.</p>
      </aside>
    </section>
  );
}
