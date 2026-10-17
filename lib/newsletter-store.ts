import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { CONSENT_VERSION, normalizeEmail, NewsletterInputError, type Subscriber } from './newsletter-model';
type PrivateSubscriber = Subscriber & { tokenHash: string };
type StoreData = { version: 1; subscribers: PrivateSubscriber[] };
const queues = new Map<string, Promise<unknown>>();
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const publicRecord = ({ tokenHash: _private, ...row }: PrivateSubscriber): Subscriber => row;
function validate(input: unknown): asserts input is StoreData {
  const data = input as StoreData;
  if (!data || data.version !== 1 || !Array.isArray(data.subscribers) || data.subscribers.some(row =>
    !row || typeof row.id !== 'string' || !/^[0-9a-f-]{36}$/.test(row.id) || typeof row.tokenHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(row.tokenHash) || typeof row.consentedAt !== 'string' || !Number.isFinite(Date.parse(row.consentedAt)) ||
    typeof row.consentVersion !== 'string' || !row.consentVersion || row.verified !== false || normalizeEmail(row.email) !== row.email) ||
    new Set(data.subscribers.map(row => row.email)).size !== data.subscribers.length || new Set(data.subscribers.map(row => row.id)).size !== data.subscribers.length)
    throw new Error('Dados de newsletter inválidos. Preserve o arquivo e confira um backup.');
}
// PII has no historical per-write copies. External snapshots have their own retention.
export class NewsletterStore {
  private file: string;
  constructor(file: string) { this.file = path.resolve(file); }
  private async read(): Promise<StoreData> {
    try { const data: unknown = JSON.parse(await fs.readFile(this.file, 'utf8')); validate(data); return data; }
    catch(error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, subscribers: [] }; throw new Error('Não foi possível ler os inscritos. Preserve o arquivo e confira um backup.', { cause: error }); }
  }
  private async serialized<T>(operation: () => Promise<T>): Promise<T> {
    const previous = queues.get(this.file) ?? Promise.resolve(), next = previous.catch(() => {}).then(operation);
    queues.set(this.file, next);
    try { return await next; } finally { if (queues.get(this.file) === next) queues.delete(this.file); }
  }
  private async write(data: StoreData) {
    validate(data); await fs.mkdir(path.dirname(this.file), { recursive: true });
    const temporary = path.join(path.dirname(this.file), `.newsletter.${randomUUID()}.tmp`);
    try {
      const handle = await fs.open(temporary, 'wx', 0o600);
      try { await handle.writeFile(JSON.stringify(data) + '\n'); await handle.sync(); } finally { await handle.close(); }
      await fs.rename(temporary, this.file);
      const directory = await fs.open(path.dirname(this.file), 'r'); try { await directory.sync(); } finally { await directory.close(); }
    } finally { await fs.rm(temporary, { force: true }); }
  }
  async list(): Promise<Subscriber[]> { return this.serialized(async () => (await this.read()).subscribers.map(publicRecord)); }
  async subscribe(input: unknown, consent: unknown): Promise<{ token: string }> {
    if (consent !== true) throw new NewsletterInputError('É necessário concordar com o recebimento e a Política de Privacidade.');
    const email = normalizeEmail(input);
    return this.serialized(async () => {
      const data = await this.read();
      const token = randomBytes(32).toString('base64url');
      // Uniform response: never reveal list membership or rotate a prior cancellation secret.
      if (data.subscribers.some(row => row.email === email)) return { token };
      data.subscribers.push({ id: randomUUID(), email, consentedAt: new Date().toISOString(), consentVersion: CONSENT_VERSION, verified: false, tokenHash: hash(token) });
      await this.write(data); return { token };
    });
  }
  private async remove(predicate: (row: PrivateSubscriber) => boolean): Promise<boolean> {
    return this.serialized(async () => { const data = await this.read(), remaining = data.subscribers.filter(row => !predicate(row)); if (remaining.length === data.subscribers.length) return false; await this.write({ version: 1, subscribers: remaining }); return true; });
  }
  async removeByToken(token: unknown): Promise<boolean> { if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false; return this.remove(row => row.tokenHash === hash(token)); }
  async removeById(id: unknown): Promise<boolean> { if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) return false; return this.remove(row => row.id === id); }
}
