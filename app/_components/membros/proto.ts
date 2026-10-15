// Helper das classes de proto.css: m("igp hd") → "hs-m-igp hs-m-hd".
export function m(classes: string): string {
  return classes
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => "hs-m-" + c)
    .join(" ");
}
