'use client';
import {useEffect,useState} from 'react';
export default function NewsletterManage(){
 const [token,setToken]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{const read=()=>setToken(new URLSearchParams(window.location.hash.slice(1)).get('token')||'');read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 async function remove(){setBusy(true);setError('');try{const response=await fetch('/api/newsletter/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível concluir.');setMessage(data.message);setDone(true);setToken('');history.replaceState(null,'',window.location.pathname);}catch(e){setError(e instanceof Error?e.message:'Falha de conexão.');}finally{setBusy(false);}}
 return <div className="newsletterManagement">{token&&!done?<><p>Esta ação cancela a inscrição associada ao seu link e exclui os dados da lista ativa.</p><button className="button" onClick={remove} disabled={busy}>{busy?'Excluindo…':'Cancelar inscrição e excluir meus dados'}</button></>:!done?<p>Abra o link individual guardado no momento do cadastro para cancelar e excluir seus dados.</p>:null}
 <p role="status">{message}</p>{error&&<p role="alert">{error}</p>}
 <p>Se você não tem o link, pode solicitar cancelamento, acesso, correção ou exclusão pelo e-mail <a href="mailto:leticialeitecontent@gmail.com?subject=Dados%20da%20newsletter">leticialeitecontent@gmail.com</a>, de preferência a partir do endereço inscrito. A responsável verificará a titularidade antes de atender.</p><p>Snapshots de segurança podem conservar uma cópia até o fim da retenção. Ela não será utilizada para campanhas; exclusões devem ser reaplicadas em qualquer restauração.</p></div>;
}
