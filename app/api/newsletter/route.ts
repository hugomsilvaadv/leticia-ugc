import path from 'node:path';
import { getDataDir } from '@/lib/site-config';
import { NewsletterStore } from '@/lib/newsletter-store';
import { clientKey, isAllowedOrigin, signupLimiter, readNewsletterBody, privateJson, newsletterError } from '@/lib/newsletter-security';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return privateJson({error:'Origem não permitida.'},403);
  if (!signupLimiter.consume(clientKey(request))) return privateJson({error:'Muitas tentativas. Aguarde alguns minutos.'},429);
  try { const body = await readNewsletterBody(request); if (body.website) return privateJson({error:'Não foi possível cadastrar. Confira o formulário.'},400);
    const result = await new NewsletterStore(path.join(getDataDir(),'newsletter.json')).subscribe(body.email,body.consent);
    return privateJson({ message:'Cadastro registrado. Se o endereço já estava inscrito, ele foi mantido. Nenhum e-mail foi enviado; as campanhas ainda não estão habilitadas.', ...result });
  } catch(error) { return newsletterError(error); }
}
