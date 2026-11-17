// Tipos compartilhados entre navegador, Apps Script e testes (checkJs).

type Presenca = 'sim' | 'nao';

interface Submission {
  id: string;
  presenca: Presenca;
  nome: string;
  email: string;
  whatsapp: string;
  acompanhante: boolean;
  acompanhanteNome: string;
  restricao: string;
  observacao: string;
}

type ServerResponse =
  | { ok: true; status: 'confirmado' | 'recusado' }
  | { ok: false; code: 'ja_respondeu' | 'encerrado' | 'erro' }
  | { ok: false; code: 'invalido'; campos?: Record<string, string> };

type RsvpState = 'aberto' | 'em_breve' | 'encerrado' | 'passado';

interface MaksoEvent {
  title: string;
  start: string | null;
  end: string | null;
  venueName: string;
  address: string;
  mapsUrl: string;
  dressCode: string;
  description: string;
}

interface MaksoConfig {
  siteUrl: string;
  appsScriptUrl: string;
  rsvpDeadline: string | null;
  event: MaksoEvent;
  version?: string;
}

// Guarda `if (typeof module !== 'undefined') module.exports = …` nos scripts clássicos.
declare var module: { exports: unknown } | undefined;
