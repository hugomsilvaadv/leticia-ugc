import path from 'node:path';
import { getDataDir, validateAdminPassword } from '@/lib/site-config';
import { NewsletterStore } from '@/lib/newsletter-store';
import { newsletterCsv } from '@/lib/newsletter-model';
import { readNewsletterBody, privateJson, newsletterError } from '@/lib/newsletter-security';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
const store = () => new NewsletterStore(path.join(getDataDir(),'newsletter.json'));
export async function GET(request: Request) {
 if(!validateAdminPassword(request.headers.get('x-admin-password'))) return privateJson({error:'Senha inválida.'},401);
 try { const rows=await store().list(), url=new URL(request.url);
  if(url.searchParams.get('format')==='csv') return new Response(newsletterCsv(rows),{headers:{'Cache-Control':'no-store','Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="inscritos-by-leticia.csv"','X-Content-Type-Options':'nosniff'}});
  const q=(url.searchParams.get('q')||'').trim().toLowerCase().slice(0,254), filtered=rows.filter(row=>!q||row.email.includes(q)).sort((a,b)=>b.consentedAt.localeCompare(a.consentedAt));
  const parsed=Number(url.searchParams.get('page')||1), pages=Math.max(1,Math.ceil(filtered.length/50)), page=Math.max(1,Math.min(pages,Number.isFinite(parsed)?Math.floor(parsed):1));
  return privateJson({subscribers:filtered.slice((page-1)*50,page*50),total:rows.length,filteredTotal:filtered.length,page,pages,campaignsEnabled:false});
 } catch(error) { return newsletterError(error); }
}
export async function DELETE(request: Request) {
 if(!validateAdminPassword(request.headers.get('x-admin-password'))) return privateJson({error:'Senha inválida.'},401);
 try { const body=await readNewsletterBody(request); if(typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.id)) return privateJson({error:'Inscrição inválida.'},400);
  await store().removeById(body.id); return privateJson({message:'Inscrição excluída da lista ativa.'});
 } catch(error) { return newsletterError(error); }
}
