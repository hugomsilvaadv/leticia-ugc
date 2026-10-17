export const CONSENT_VERSION = '2026-10-14';
export const CONSENT_TEXT = 'Concordo em receber a Carta da Letícia por e-mail e li a Política de Privacidade. Posso cancelar e solicitar a exclusão dos meus dados a qualquer momento.';
export type Subscriber = { id: string; email: string; consentedAt: string; consentVersion: string; verified: false };
export class NewsletterInputError extends Error {}
export function normalizeEmail(input: unknown): string {
  if (typeof input !== 'string') throw new NewsletterInputError('Informe um e-mail válido.');
  const email = input.trim().toLowerCase(), [local, domain, extra] = email.split('@');
  if (email.length > 254 || !local || local.length > 64 || extra !== undefined ||
    !/^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]*$/i.test(local) || local.endsWith('.') || local.includes('..') ||
    !domain || domain.length > 253 || !domain.includes('.') ||
    !domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) ||
    !/^[a-z]{2,63}$/i.test(domain.split('.').at(-1) || '')) throw new NewsletterInputError('Informe um e-mail válido.');
  return email;
}
export function newsletterCsv(records: Subscriber[]): string {
  const quote = (value: string) => '"' + (/^\s*[=+@-]/.test(value) ? "'" : '') + value.replace(/"/g, '""') + '"';
  return '\uFEFF' + [['E-mail','Consentimento em (UTC)','Versão do consentimento','Endereço verificado'], ...records.map(row => [row.email,row.consentedAt,row.consentVersion,'Não'])].map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
