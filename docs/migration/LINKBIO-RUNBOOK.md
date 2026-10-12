# Migração segura do Linkbio para /linktree

Data da captura: 2026-10-12. Este arquivo é um plano operacional; **não é evidência de deploy**.

## Estado verificado
- Site principal: projeto Railway `leticia-ugc`, repositório `hugomsilvaadv/leticia-ugc`, branch de produção `main`.
- Serviço Railway tem volume persistente `/data` (volume `leticia-ugc-data`).
- Linkbio antigo: `https://portfolio-leticia-linkbio.vercel.app`, projeto Vercel `portfolio-leticia-linkbio`.
- Fonte dos dados reais: `GET https://portfolio-leticia-linkbio.vercel.app/api/config`.
- Captura do JSON publicada neste repositório em `docs/migration/linkbio-live-config-2026-10-12.json` nesta branch de backup.
- O JSON inclui `background`, `media` (4 mídias) e `texts` (37 campos).
- As URLs de mídia atuais são Vercel Blob público, não arquivos presentes no Git.
- A branch Codex `feat/editorial-linktree` **não estava no GitHub** quando este backup foi feito; o commit local reportado foi `194e6fb`.

## Procedimento de publicação
1. No ambiente Codex que contém o commit `194e6fb`, publicar `feat/editorial-linktree` com `git push -u origin feat/editorial-linktree`, sem force push.
2. Abrir PR para `main`. Revisar as alterações de /linktree, API, admin, autenticação e migração, mantendo conteúdo editorial existente.
3. Ler o JSON real deste backup, em vez de usar defaults do código ou depender do request Vercel que retornou 403.
4. Implementar importação idempotente dos campos (37 textos, posições, tamanhos, cores, fontes, mídia e fundo) sem sobrescrever artigos e configurações do site principal.
5. Para cada uma das URLs Blob, validar acessibilidade e planejar cópia do **arquivo binário** ao volume `/data` sob um prefixo próprio do Linktree; não limitar a migração à troca de links nem apagar o Blob original. Validar tamanho e tipo, especialmente vídeo.
6. Antes da migração na Railway, copiar os dados atuais pertinentes em `/data` e garantir que a rotina de migração não altere `site-config.json`, `articles` ou `portfolio.json` existentes fora de seu escopo.
7. Validar preview e testes de autenticação: /linktree, /admin, upload de foto/vídeo, salvar e recarregar (persistência), dispositivos móveis e desktop, conteúdo importado contra o JSON.
8. Somente após testes completos, fazer merge para main e verificar o deploy Railway, status SUCCESS e site no domínio público; manter o Linkbio da Vercel ativo durante a transição.
9. Preparar rollback ao commit anterior e manter o backup JSON e os arquivos originais preservados.

## Limites
- Esta captura contém o JSON de configuração, **não os binários** de imagem/vídeo.
- Não revela variáveis de ambiente ou senha de administrador.
- Não mudar o DNS, desligar projeto Vercel, mover armazenamento ou sobrescrever dados sem validação.
