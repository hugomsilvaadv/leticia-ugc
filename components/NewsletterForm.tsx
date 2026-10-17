'use client';
import Link from 'next/link';
import {useEffect,useState,type FormEvent} from 'react';
import {CONSENT_TEXT} from '@/lib/newsletter-model';
export default function NewsletterForm(){
 const [ready,setReady]=useState(false),[email,setEmail]=useState(''),[consent,setConsent]=useState(false),[website,setWebsite]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[token,setToken]=useState('');
 useEffect(()=>setReady(true),[]);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy||!consent||!ready)return;setBusy(true);setError('');setMessage('');setToken('');
  try{const response=await fetch('/api/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,consent,website})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível cadastrar.');setMessage(data.message);setToken(data.token||'');setEmail('');setConsent(false);}
  catch(e){setError(e instanceof Error?e.message:'Falha de conexão. Tente novamente.');}finally{setBusy(false);}
 }
 return <form className="newsletterSignup" onSubmit={submit}>
 <div className="newsletterEmailRow"><input aria-label="Seu e-mail" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" disabled={busy||!ready}/><button type="submit" disabled={busy||!consent||!ready}>{busy?'Cadastrando…':'Quero receber'}</button></div>
 <label className="newsletterConsent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy||!ready}/><span>{CONSENT_TEXT} <Link href="/privacidade">Ler política</Link></span></label>
 <div className="newsletterTrap" aria-hidden="true"><label>Seu site<input name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
 <p className="newsletterNote">A captação está disponível. As campanhas ainda não estão habilitadas.</p><p role="status">{message}</p>{error&&<p role="alert">{error}</p>}
 {token&&<p className="newsletterNote">Para uma nova inscrição, guarde este link individual: <Link href={`/newsletter#token=${encodeURIComponent(token)}`}>Cancelar inscrição e excluir meus dados</Link>. Se já estava inscrito, use o link original ou solicite exclusão na página de gerenciamento. Quem tiver o link válido poderá excluir a inscrição.</p>}
 <p className="newsletterNote"><Link href="/newsletter">Gerenciar inscrição ou solicitar exclusão</Link></p>
 </form>;
}
