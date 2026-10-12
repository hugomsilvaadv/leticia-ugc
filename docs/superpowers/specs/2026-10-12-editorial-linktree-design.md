# BY LETÍCIA — modernização preservando conteúdo

## Escopo autorizado
Implementar e testar em desenvolvimento. Manter textos, fotografias, títulos, vídeos, URLs e informação comercial. Não publicar, mudar DNS, credenciais, infraestrutura paga ou dados de produção. Usar checkout isolado existente, sem worktree adicional.

## Arquitetura e escolhas
Manter Next.js/App Router e persistência JSON no volume CONTENT_DATA_DIR; nenhuma segunda stack, banco ou serviço pago. Separar validação, armazenamento atômico com backups, mídia compartilhada e editor Linktree. Alternativas descartadas: substituir por CMS externo (migração/custo desnecessários); incorporar Astro/iframe (duas fontes e runtimes).

## Mídia e apresentação
Componente comum aplica metadados existentes. No mobile, imagens mostram dimensões naturais e não usam zoom/crop; pontos focais mobile podem ser configurados explicitamente. Hero, cards, artigos, retratos e portfólio seguem a mesma regra. URLs inseguras são rejeitadas no momento da escrita, sem reescrever dados antigos. Cards usam a capa da matéria; blocos de home têm identificação explícita e campos separados. Preservar distinção entre capa do destaque e capa do artigo.

## Editorial e navegação
Preservar paleta/wordmark; assinatura permanece nos dados e rodapé, deixa de disputar o cabeçalho. Menu retrátil acessível, transições de entrada/saída, Escape, foco, isolamento modal e movimento reduzido. Refinar grid, espaçamento, tipos responsivos e foco. Sem fotografia ou texto editorial inventados. Sem demonstrações visuais apresentadas como conteúdo real.

## Administração e dados
Dashboard, páginas/home, matérias, mídia/UGC, Linktree, aparência/configuração. Manter senha/header atuais. Cada coleção tem estado carregado, dirty, erro e save independente; falha não apaga mudanças nem deixa UI travada. Proteção antes de fechar página. Escrita atômica, backup antes de substituir, erro em corrupção em vez de fallback silencioso. Controle otimista via ETag/If-Match para novos editores, compatibilidade com clientes antigos. Upload valida tamanho e assinatura real. Reusar mídia existente em biblioteca.

## Linktree
Rota Next nativa /linktree. Modelo retém todos os textos/estilos/background/mídias do Astro, links/serviços existentes e ordem; amplia links, sociais, vídeos e blocos editáveis. Dataset de referência vem do Git b957ec45119a5b4bd27199238d7d0e91299acc0f e não é prova dos dados live do Blob. Importação explícita não destrutiva de export JSON, backup e cópia byte a byte das mídias para volume principal, sem apagar origem. Não ativar em produção até conferir export real; rota local sinaliza status no admin. Nunca substituir importação por seeds fictícios. Arquivo de background existente é copiado sem alteração. Links de WhatsApp já existentes são preservados como URLs, sem publicar número textual adicional.

## Segurança/SEO/infraestrutura
Rejeitar payload inválido, URLs com esquemas ativos, traversal, MIME falso; comparar senha de modo constante; nenhuma credencial em logs. Metadados/canonical/OG por rota, sitemap/robots e Article JSON-LD escapado. Volume persistente /data necessário no Railway; não há cliente autenticado Railway disponível. Atualizar patch Next se auditoria confirmar vulnerabilidade.

## Validação e limites
Testes unitários de URLs, escrita/backup/corrupção/conflito/importação; integração de save/upload/render; browser Chromium em 320,375,390,430,768,1024,1440; menu, cards, admin e /linktree; evidências antes/depois. Build e tipos. Safari real e dados live não comprovados sem acesso. byleticia.com.br recebeu 403 do proxy, não resposta do site. Não afirmar preservação live, reprodução externa ou deploy testados.
