import path from 'node:path';
import { getDataDir } from '@/lib/site-config';
import { NewsletterStore } from '@/lib/newsletter-store';
import { clientKey, isAllowedOrigin, manageLimiter, readNewsletterBody, privateJson, newsletterError } from '@/lib/newsletter-security';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
 if(!isAllowedOrigin(request)) return privateJson({error:'Origem não permitida.'},403);
 if(!manageLimiter.consume(clientKey(request))) return privateJson({error:'Muitas tentativas. Aguarde alguns minutos.'},429);
 try { const body=await readNewsletterBody(request); if(typeof body.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) return privateJson({error:'Link de gerenciamento inválido.'},400);
  await new NewsletterStore(path.join(getDataDir(),'newsletter.json')).removeByToken(body.token);
  return privateJson({message:'Solicitação concluída. Se havia uma inscrição associada a este link, ela foi cancelada e seus dados foram excluídos da lista ativa.'});
 } catch(error) { return newsletterError(error); }
}
