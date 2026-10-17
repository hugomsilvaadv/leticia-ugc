import { createHash } from 'node:crypto';
import { BodyLimitError, readLimitedBody } from './request-body';
import { NewsletterInputError } from './newsletter-model';
export class NewsletterLimiter {
  private clients = new Map<string, { count: number; expires: number }>();
  private global = { count: 0, expires: 0 };
  constructor(private perClient = 10, private total = 100, private windowMs = 600000, private capacity = 10000) {}
  consume(key: string, now = Date.now()): boolean {
    if (this.global.expires <= now) this.global = { count: 0, expires: now + this.windowMs };
    for (const [id, entry] of this.clients) if (entry.expires <= now) this.clients.delete(id);
    const current = this.clients.get(key) ?? { count: 0, expires: now + this.windowMs };
    if (this.global.count >= this.total || current.count >= this.perClient || (!this.clients.has(key) && this.clients.size >= this.capacity)) return false;
    current.count++; this.global.count++; this.clients.set(key, current); return true;
  }
}
export const signupLimiter = new NewsletterLimiter();
export const manageLimiter = new NewsletterLimiter(30, 300);
export function clientKey(request: Request): string { return createHash('sha256').update((request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0, 100)).digest('hex'); }
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin'); if (!origin || origin === 'null') return false;
  if (['https://byleticia.com.br', 'https://www.byleticia.com.br'].includes(origin)) return true;
  try { const url = new URL(request.url), browserOrigin = new URL(origin), host = request.headers.get('host') || url.host;
    return process.env.NODE_ENV !== 'production' && browserOrigin.protocol === 'http:' && ['localhost','127.0.0.1'].includes(browserOrigin.hostname) && browserOrigin.host === host;
  } catch { return false; }
}
export async function readNewsletterBody(request: Request): Promise<Record<string, unknown>> {
  const bytes = await readLimitedBody(request, 4096); let body: unknown;
  try { body = JSON.parse(bytes.toString('utf8')); } catch { throw new NewsletterInputError('Dados inválidos. Confira o formulário.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new NewsletterInputError('Dados inválidos.'); return body as Record<string, unknown>;
}
export const privateJson = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function newsletterError(error: unknown) {
  if (error instanceof BodyLimitError) return privateJson({ error: 'Formulário excede o limite permitido.' }, 413);
  if (error instanceof NewsletterInputError) return privateJson({ error: error.message }, 400);
  return privateJson({ error: 'Não foi possível acessar os inscritos. Nenhum dado inválido será substituído; confira o volume e os backups.' }, 500);
}
