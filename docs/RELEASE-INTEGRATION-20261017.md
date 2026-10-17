# Integração final — 17/10/2026

Base: main `1fdc77d`, PR #6 já publicada. Esta entrega prepara somente uma PR; merge/deploy não são executados. O responsável confirmou backup externo real de /data realizado e validado em 17/10/2026. Nenhum teste desta integração usa /data real.

## Recuperação e preservação

O workspace disponibilizado nesta retomada continha checkout limpo em `2667958`, sem os arquivos e commits locais das etapas anteriores. Foram verificados branches, reflogs, objetos Git, diretórios de evidências e imagens Docker. O estado disponível foi preservado em branch `preservation/workspace-before-integration-20261017` e bundle externo ao checkout (`/workspace/preservation/20261017/workspace.bundle`).

Como o snapshot anterior não estava disponível, newsletter e backup opcional foram recuperados a partir do registro técnico da implementação nesta conversa e revalidados. Não há alegação de identidade byte a byte com os arquivos desaparecidos. A busca foi reaproveitada diretamente da PR #6/main, evitando sua antiga duplicação local.

## Escopo

- Newsletter privada: consentimento, JSON adicional criado somente na primeira inscrição, deduplicação, limite de corpo/abuso, origem restrita, exclusão por link individual e administração/CSV autenticados.
- Campanhas seguem desativadas: nenhuma credencial ou remetente foi criado, nenhum envio é afirmado e endereços não verificados não habilitam envio.
- Backup restic opcional no próprio serviço que monta /data, desativado por padrão; não exige R2/monitor/senha nova para iniciar o site.
- Mídias: cache público só para arquivos individuais, derivados WebP limitados, srcSet responsivo, arquivos originais e enquadramento preservados, vídeo por Range.
- Sitemap passa a incluir Linktree com proveniência `published-snapshot`.
- Busca publicada mantida, com teste da interação respeitando fechamento do diálogo modal; sem troca de algoritmo/layout por uma cópia paralela.

## Dados e configuração

Nenhum seed/migração de produção, mudança de senha, alteração de volume, exclusão de mídia ou reset de coleção. JSONs anteriores seguem compatíveis. O deploy futuro usa o start atual; R2 permanece opt-in por `BACKUP_ENABLED=0`/ausente. Para ativar backups automáticos será necessária autorização operacional e configuração segura descrita em EXTERNAL-BACKUP-R2.md.

Novos cadastros gravam somente `newsletter.json`; dados e mídias existentes não são substituídos por fixtures. Suite E2E mantém diretório temporário isolado e credencial exclusivamente de teste. Conteúdo editorial incompleto e imagens/portfólio ainda não cadastrados continuam sob controle da responsável no /admin; não são preenchidos automaticamente com textos ou mídia inventados.

Pendências externas: configuração opcional de R2/monitor, remetente/provedor da newsletter e conferência editorial dos conteúdos. Hardening adicional da autenticação existente e recursos de fase 2 (cases/tags/filtros avançados) não foram confundidos com regressões desta integração. Não houve alteração da senha existente nem tentativa de acesso administrativo à produção.

## Revisão e validação isolada

A revisão independente identificou e corrigiu três pontos: saturação dos dois slots de transformação agora entrega o original sem quebrar a imagem; cadastro novo e repetido retornam a mesma estrutura com token opaco, sem revelar participação nem substituir o segredo anterior; testes resolvem restic pelo PATH no CI. A exclusão de inscrição repetida exige o link original ou solicitação administrativa, conforme informado no formulário.

Os testes de regressão reproduziram as falhas antes das correções. A suíte unitária final passou em 56/56, incluindo restic real 0.19.1, deduplicação, integridade e recuperação após perda da origem em diretórios temporários. A suíte E2E final passou em 32/32. `npm run build` e `npm run typecheck` concluíram com código zero. O supervisor iniciou a build de produção sem variáveis R2/backup, usando dados temporários: home 200, originais intactos, cache público, oito solicitações concorrentes, WebP, Range e APIs privadas verificados. A resolução de restic pelo PATH também passou nos 5 testes de armazenamento. A imagem Docker opt-in não foi construída nesta validação; o script/supervisor foi testado diretamente. Não houve acesso R2, publicação ou alteração de dados de produção.
