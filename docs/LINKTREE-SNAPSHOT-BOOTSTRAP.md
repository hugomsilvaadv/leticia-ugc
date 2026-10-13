# Inicialização do Linktree pelo export público verificado (solução transitória)

Esta alteração evita depender imediatamente do acesso a `/data` para **exibir** a rota `/linktree` em um eventual deploy futuro. Nenhuma migração ou deploy é realizado por esta branch.

## Fonte e garantias

- Arquivo versionado: `content/linktree-live-snapshot-2026-10-12.json`
- Fonte: `GET https://portfolio-leticia-linkbio.vercel.app/api/config`, capturado e verificado em 12/10/2026.
- 37 campos de texto, 4 referências de mídia e uma referência de fundo. O modelo existente completa a estrutura de links e serviços em código, preservando os destinos do site Astro original.
- O marcador `provenance.kind=published-snapshot` é distinto de `imported`, pois **as mídias não foram copiadas**.
- O arquivo `/data/linktree.json`, se existir, **prevalece sempre** sobre o snapshot Git. Erros de JSON existente continuam bloqueando leitura em vez de sobrescrever dados.
- O painel de administração existente pode editar os dados depois de autenticação. A primeira gravação no volume cria `linktree.json`, mas não copia imagens/vídeos remotos automaticamente.

## Dependências e limitações

- As URLs de fotos/vídeos continuam no Vercel Blob público. O Vercel antigo e os arquivos precisam permanecer ativos; se forem retirados, haverá mídia quebrada. Não considerar migração finalizada até copiar os binários, verificar SHA-256 e testar no Railway.
- Não há backup binário comprovado de `/data`. Antes de aprovar um merge para `main`, revisar o conteúdo persistido e tirar cópia externa do volume. A branch é somente preparação técnica.
- Validar em staging a apresentação real em desktop/mobile e os URLs Blob. A disponibilidade dos binários **não pôde ser confirmada daqui**.
- Esta alteração não modifica `/data` nem as demais coleções (`site-config.json`, `articles.json`, `portfolio.json`), nem o domínio ou projeto Vercel.
- Se desejar impedir o fallback temporário futuramente, voltar ao `DEFAULT_LINKTREE` original e exigir novamente apenas `provenance=imported` para produção.

## Comportamento resumido

1. Se `/data/linktree.json` existe e é válido, carregar seu conteúdo.
2. Se não existe, carregar o export público versionado, sem criar nenhum arquivo.
3. A página pública aceita `published-snapshot` ou `imported`.
4. Continuar com o fluxo seguro de migração de mídia e backup do volume antes do lançamento oficial.
