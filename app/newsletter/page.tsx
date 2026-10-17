import type {Metadata} from 'next';
import NewsletterManage from '@/components/NewsletterManage';
export const metadata:Metadata={title:'Gerenciar newsletter',alternates:{canonical:'/newsletter'},robots:{index:false,follow:false},referrer:'no-referrer'};
export default function NewsletterPage(){return <main id="conteudo" className="section shell"><p className="eyebrow">Carta da Letícia</p><h1>Seu cadastro, suas escolhas.</h1><NewsletterManage/></main>;}
