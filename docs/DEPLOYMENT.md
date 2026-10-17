> Atualização em 17/10/2026: a PR #6/busca já está publicada em main 1fdc77d. O responsável confirmou backup externo real de /data realizado e validado nesta data. A recuperação das mídias antigas não é obrigatória: novos arquivos podem ser cadastrados pelo painel. A seção de migração abaixo registra um procedimento histórico opcional. Para backup automático externo sem depender de Pro, consulte [EXTERNAL-BACKUP-R2.md](EXTERNAL-BACKUP-R2.md); integração desativada por padrão. Esta PR não faz deploy, muda senhas ou restaura o volume.

# Publicação e preservação — BY LETÍCIA

Nenhum deploy, DNS, configuração Railway ou credencial de produção foi alterado nesta tarefa. A publicação depende de autorização do responsável, depois da conferência dos dados reais.

## Desenvolvimento e validação

Node 22 na CI; Node 24.19.0/npm 11.9.0 validados no ambiente atual. Usar o checkout existente, sem worktree adicional.

```bash
cd /workspace/leticia-ugc
npm ci --no-audit --no-fund
export CONTENT_DATA_DIR=/workspace/.onboarding/leticia-ugc/content
export NEXT_TELEMETRY_DISABLED=1
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Em outro terminal: `npm test`, `npm run test:e2e`, `npm run build`, `npm run typecheck`. Pare somente o processo de desenvolvimento que você iniciou antes do build. A suíte de navegador inicia seu próprio servidor na porta 3001, com JSONs e credencial exclusivamente de teste em diretório temporário; não aponta para `/data`. Não use a credencial da suíte em um deploy.

O navegador usa Chromium do sistema quando disponível. Em outra máquina, execute `npx playwright install --with-deps chromium` ou indique um executável em `PLAYWRIGHT_EXECUTABLE_PATH`. `EVIDENCE_DIR` permite escolher o destino das capturas; o padrão é `test-results/evidence`.

Next pode regenerar `next-env.d.ts` e entradas de tipos do `tsconfig.json`; confira o diff depois das verificações. Os artefatos `.next`, `.next-qa`, `node_modules` e `test-results` são ignorados.

## Dados existentes no Railway

A arquitetura existente é arquivos JSON e uploads, não um banco SQL. Antes da publicação, confirme no serviço real o volume persistente, `CONTENT_DATA_DIR` (padrão `/data`), a variável administrativa já utilizada e os comandos de build/start. Esta tarefa não teve acesso autenticado ao Railway, portanto não certifica essas configurações.

O volume deve preservar `site-config.json`, `articles.json`, `portfolio.json`, `uploads/` e, depois da integração, `linktree.json`. Copie e verifique um backup completo do volume fora da aplicação, com inventário de tamanhos e SHA-256, antes de qualquer migração. Não execute seeds, resets ou cópias de fixtures sobre esse volume.

Use uma única instância que grave no volume. A fila de escrita e o controle de revisão desta implementação coordenam o processo Next; não representam um banco distribuído. Os clientes novos enviam `If-Match`; clientes antigos sem esse cabeçalho continuam compatíveis, sem a proteção otimista.

A gravação de JSON mantém o arquivo anterior em `backups/`, sincroniza um arquivo temporário e faz a substituição atômica. Falhas de leitura/estrutura não viram defaults silenciosos. Esses backups locais complementam, não substituem, o backup externo do volume. Monitore espaço e defina retenção com o responsável; nenhum backup é apagado automaticamente.

Uploads mantêm o limite existente de 30 MB por arquivo e têm limite total de 31 MB para o multipart, inclusive sem Content-Length. Fotografias são verificadas por assinatura e decodificação, com limite de 40 megapixels; bytes válidos não são recomprimidos. Para vídeos maiores, use os provedores já suportados. Não foi contratado armazenamento ou serviço pago.

## Migração do Linktree

Origem informada: `https://portfolio-leticia-linkbio.vercel.app/`. O projeto Astro original guarda edições no Vercel Blob; seu Git não contém todas as fotografias/vídeos publicados. A configuração pública é `/api/config`. O proxy bloqueou sua leitura nesta tarefa.

1. Habilite o domínio no ambiente e obtenha o JSON público real. Não envie senhas pelo chat.
2. Inventarie todas as URLs de mídia e autorize somente os hosts necessários para sua leitura. Os links sociais/comerciais existentes permanecem iguais; apenas referências de arquivos migrados passam a apontar para a mídia do site principal.
3. Guarde uma cópia verificada do export e das mídias originais. Para referências locais, reúna os arquivos originais em um diretório de origem, mantendo seus caminhos.
4. Execute primeiro em uma cópia de staging do volume, com a aplicação sem gravar durante a importação:

```bash
NODE_USE_ENV_PROXY=1 npx tsx scripts/import-linktree.ts /caminho/export-real.json /caminho/midias-originais /caminho/volume-staging --dry-run
NODE_USE_ENV_PROXY=1 npx tsx scripts/import-linktree.ts /caminho/export-real.json /caminho/midias-originais /caminho/volume-staging
```

O comando verifica disponibilidade, formato e integridade das fotografias antes de ativar a configuração; copia os bytes, registra hashes, guarda o export/manifesto em `migration-backups/` e recusa sobrescrever um `linktree.json` existente. Downloads HTTPS não desativam TLS e recusam redirecionamentos; limite de importação por mídia remota: 250 MB. Avalie previamente o espaço do volume. Node deve usar a configuração de proxy já fornecida pelo ambiente. Downloads externos não foram validados enquanto o domínio estava bloqueado.

Se já existe `linktree.json`, compare e planeje uma atualização revisada; não remova o arquivo para contornar a proteção. Nenhuma importação real foi executada nesta tarefa.

5. Compare textos, ordem, links, preços, fotografias, vídeos e metadados de apresentação com o export e o site antigo. Registre a data de corte; evite edições concorrentes no painel antigo durante o corte aprovado.
6. Valide `/linktree` e suas edições no `/admin` em staging, usando o volume real copiado. A rota de produção só é ativada com configuração importada. O modelo de referência Git é disponibilizado para desenvolvimento/admin, não para publicação automática de preços potencialmente desatualizados.
7. Após autorização, aplique o mesmo procedimento no volume principal e publique o código. Não altere a senha existente como parte da migração.
8. Somente depois da validação integral e de nova autorização, planeje o redirecionamento do endereço antigo. O repositório original e seu projeto Vercel permanecem intactos.

O Git original inclui um JPEG de fundo inválido e referências a quatro mídias ausentes. O JPEG foi copiado sem alteração e preservado no arquivo de fonte, mas sua exibição é omitida quando não decodificável. Não o substitua por uma fotografia de demonstração: obtenha o arquivo correto na origem publicada.

## Build, startup e rollback

Os scripts continuam `npm run build` e `npm run start`. Next atende à variável `PORT` fornecida pelo Railway; confirme o comando e a conexão com o volume em staging. Foi atualizada a série de patches Next 15 e foram fixadas versões corrigidas de PostCSS/Sharp, sem mudar de framework. O lockfile deve acompanhar o código.

Para rollback: pare as gravações, mantenha um backup do estado novo, restaure a versão anterior do código e o snapshot de volume verificado, confira leitura/mídias e reabra a aplicação. O arquivo anterior de cada coleção também está em `backups/`; não restaure um backup sem verificar seu conteúdo e sua revisão. O modelo Astro original e o serviço antigo não foram desativados, permitindo comparações.

Publicar o ambiente Codex é uma operação diferente de fazer deploy do site. O rascunho de rede do ambiente contém os domínios solicitados para auditoria; salvar esse rascunho não prova aplicação da política nem publicação do site.

## Leitura pública e edição autenticada

GETs de artigos/portfólio entregam apenas registros publicados quando não há autenticação. Linktree público entrega somente dados utilizados pelos blocos ativos. Para obter a coleção completa antes de editar, clientes devem enviar o mesmo `x-admin-password` também no GET e conservar o ETag para o PUT. O painel implementa esse fluxo e não permite editar um snapshot público parcial. A prévia de artigo começa apenas com conteúdo publicado; o rascunho autorizado é enviado pela janela do editor, não por uma URL pública com senha.

Os leitores públicos filtram JSONs locais antes da fronteira assíncrona, porque o diagnóstico RSC do Next em desenvolvimento podia serializar resultados de I/O. O escopo é JSONs pequenos, volume local e uma instância. Quando o acervo crescer, avalie banco/armazenamento apropriados em uma mudança separada, mantendo a migração não destrutiva.
