// Arte do certificado (usada na área do aluno e na página pública de verificação).
import "./certificado.css";

export type Cert = { codigo: string; nome: string; titulo: string; emitido_em: string };

const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric" });

export default function Certificado({ c }: { c: Cert }) {
  return (
    <article className="hs-cert" aria-label={`Certificado de ${c.nome}`}>
      <div className="hs-cert-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/hs-logo.svg" alt="HOT SOCIETY" className="hs-cert-logo" />
        <p className="hs-cert-eb">Certificado de conclusão</p>
        <p className="hs-cert-txt">Certificamos que</p>
        <h1 className="hs-cert-nome">{c.nome}</h1>
        <p className="hs-cert-txt">
          concluiu todas as aulas do módulo <b>{c.titulo}</b> da Hot Academy, na plataforma HOT SOCIETY.
        </p>
        <div className="hs-cert-pe">
          <span>
            Emitido em <b>{DATA.format(new Date(c.emitido_em))}</b>
          </span>
          <span>
            Código <b>{c.codigo}</b> · confira em hotsociety.com.br/certificado/{c.codigo}
          </span>
        </div>
        <p className="hs-cert-nota">Certificado de curso livre.</p>
      </div>
    </article>
  );
}
