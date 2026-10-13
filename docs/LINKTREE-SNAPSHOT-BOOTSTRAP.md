# Linktree — preservar identidade e substituir mídias pelo /admin

## Decisão do projeto

A Letícia deseja manter os textos e a identidade editorial do Linktree original, mas prefere atualizar suas fotos e vídeos manualmente no painel do site unificado. A migração de mídias antigas do Vercel Blob deixou de ser requisito.

**Nenhum deploy nem migração de dados do volume Railway é realizado por esta branch.**

## Conteúdo preservado

- Fonte auditável imutável: `content/linktree-live-snapshot-2026-10-12.json` (cópia do GET público original; 37 textos, quatro referências de mídia e um fundo).
- Fonte utilizada na primeira inicialização: `content/linktree-upload-ready-2026-10-12.json`, copiada daquela fonte com somente as cinco URLs de mídia zeradas e `provenance.source` explicativo.
- Os 37 textos e estilos (fontes, tamanhos, cores, pesos, alinhamento e posições) são preservados exatamente; as propriedades de enquadramento e opacidade das mídias também são preservadas.
- Links comerciais, rede social, estrutura, ordem de blocos e pacotes são derivados do portfólio Astro original sem inventar informações.
- Os espaços de imagem no público apresentam fundos neutros do design, e nenhuma imagem antiga ou gerada é imposta.

## Persistência e uploads no painel

- Se já houver `/data/linktree.json`, **ele tem precedência**, sem qualquer substituição.
- Sem arquivo persistido, `readLinktree` usa o JSON upload-ready do Git. Não cria/edita nenhum arquivo em `/data` apenas por exibir.
- `/admin` > Linktree > Perfil, Fotografias e vídeos, e Apresentação e ordem dos blocos permitem enviar arquivos novos usando `POST /api/upload`, com a senha administrativa já configurada.
- Cada upload salva o binário em `/data/uploads` e devolve uma URL `/api/media/<arquivo>`. Depois de enviar, clicar **Salvar alterações** para persistir a referência no `/data/linktree.json`. Editar o Linktree não altera `site-config.json`, `articles.json` ou `portfolio.json`.
- Fotos permitidas: JPEG/PNG/WebP/GIF. Vídeos: MP4/WebM. Limite por arquivo: 30 MiB; vídeos maiores podem ser referenciados por YouTube/Vimeo quando suportados.
- Links para o portfólio da Vercel e seus arquivos antigos não são necessários para exibição do conteúdo inicial.

## Checklist antes de publicação

1. Validar CI, visual desktop/mobile, menu e campos de edição da nova versão.
2. Conferir que Railway mantém montagem persistente `/data`; ela foi verificada anteriormente pelo conector.
3. Mesmo sem migração de fotos antigas, **fazer backup do volume atual antes da atualização**, pois o PR original altera código de armazenamento/admin de outras páginas.
4. Publicar a versão do código apenas com autorização; não editar variáveis, DNS ou Vercel.
5. Entrar em `https://www.byleticia.com.br/admin`, selecionar Linktree, enviar mídias e salvar, recarregar e conferir que persistem.
6. Verificar /linktree no domínio público, incluindo imagens e vídeos novos após upload. Se houver anomalia, aplicar rollback do código e preservar /data.
