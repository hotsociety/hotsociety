// Helper das classes de hotphone.css: h("gift shake") → "hs-hp-gift hs-hp-shake".
export function h(classes: string): string {
  return classes
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => "hs-hp-" + c)
    .join(" ");
}
