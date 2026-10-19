// Faixa que avisa quando a tela mostra dados ilustrativos (não são resultados reais).
export default function AvisoExemplo({ children }: { children: React.ReactNode }) {
  return (
    <p role="note" className="hs-exemplo">
      <b>Prévia</b> {children}
    </p>
  );
}
