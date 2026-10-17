# Backup externo criptografado no Cloudflare R2

Esta implementação é opt-in e permanece desativada por padrão (`BACKUP_ENABLED=0`). Não cria bucket, credenciais, monitor, cobrança nem deploy. A responsável informou possuir backup externo real em 17/10/2026; ele não foi executado nem restaurado por estes testes. A validação desta implementação usa apenas repositórios restic locais temporários e dados sintéticos; não comprova acesso R2 nem recuperação de produção.

## Arquitetura e escopo

O mesmo serviço Railway que monta `CONTENT_DATA_DIR` (padrão `/data`) executa Next e o agendador Node. `flock` impede sobreposição entre operações normais manuais e agendadas. Não criar um segundo cron service supondo compartilhamento do volume. Manter uma única réplica escritora. A coordenação é local ao volume, não distribuída entre réplicas.

A captura inclui todos os arquivos `.json` da raiz ativa, exigindo `articles.json` e `site-config.json`, e toda a árvore `uploads/`. Assim inclui `newsletter.json` quando existir, além de portfolio/linktree e outras coleções JSON. Não inclui históricos `backups/`, `migration-backups/`, temporários, outros diretórios nem o estado `.external-backup/`. Isto é backup do conjunto ativo da aplicação, não uma imagem integral do volume ou do sistema.

JSONs são copiados e comparados por hash antes/depois da captura; mídias concluídas recebem hardlinks privados no mesmo volume, com fallback de cópia se necessário. O app grava uploads com nomes novos; não editar arquivos de mídia existentes durante a execução. Arquivos JSON são independentes; não há promessa de transação entre coleções. Para um ponto de corte estrito, suspender gravações. Symlinks, arquivos especiais, JSON inválido e origem sem as coleções obrigatórias causam falha.

Cada captura possui inventário SHA-256 e tamanho de todos os arquivos. O pipeline valida esse manifesto antes e depois do envio, executa `restic check --read-data` e só então aplica retenção. Uma falha anterior impede retenção/prune. O staging privado, permissão 0700, é removido ao finalizar, inclusive em falhas tratadas; uma interrupção abrupta pode deixar staging até a próxima execução. O cache e status permanecem privados no volume.

## Requisitos e segredos

Usar Node 22+, `flock` de util-linux, certificados CA e restic 0.19.1. O instalador aceita amd64 e arm64, baixa o release oficial por HTTPS e exige SHA-256 fixado:

```sh
mkdir -p /workspace/.tools/restic
bash scripts/install-restic.sh /workspace/.tools/restic/restic
RESTIC_TEST_BINARY=/workspace/.tools/restic/restic node --import tsx --test tests/external-backup.test.ts tests/external-backup-runtime.test.ts
```

O destino do instalador precisa ser gravável. `curl`, `bzip2` e `sha256sum` são necessários na instalação. Não executar estes testes apontando para `/data` real ou para repositório de produção. A execução sem `RESTIC_TEST_BINARY` resolve `restic` pelo PATH, como no CI.

Criar, em uma etapa operacional separada, bucket R2 privado dedicado. Desabilitar acesso público. Criar chave S3 de leitura/gravação restrita ao bucket necessário; restic precisa listar, ler, criar e excluir objetos para snapshots e retenção. Evitar chave administrativa de conta e prefixos compartilhados com outras aplicações. Não aplicar lifecycle que apague objetos restic por idade: objetos antigos podem pertencer a snapshots recentes. Object Lock incompatível com exclusões impedirá a política de retenção.

Guardar em variáveis secretas do Railway, nunca em Git, Dockerfile, argumentos de shell, CSV público ou logs:

| Variável | Uso |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | Access key S3 restrita ao bucket |
| `AWS_SECRET_ACCESS_KEY` | Secret key S3 |
| `RESTIC_PASSWORD` | Senha forte, exclusiva, de criptografia do repositório |
| `BACKUP_MONITOR_URL` | URL HTTPS secreta de ping Healthchecks compatível |

Guardar também a senha restic, parâmetros não secretos, IDs de snapshots e instruções de recuperação fora do volume e da conta Railway, em cofre seguro com acesso autorizado. Sem a senha, o backup não pode ser recuperado. O acesso à conta R2 não substitui a senha de criptografia. Rotacionar credenciais conforme a política operacional; não trocar a senha por simples alteração de variável em repositório existente.

| Variável | Padrão / regra |
| --- | --- |
| `BACKUP_ENABLED` | `0`; somente `1` habilita e exige a configuração completa |
| `CONTENT_DATA_DIR` | `/data`; preservar o mesmo caminho ao recuperar |
| `BACKUP_R2_ACCOUNT_ID` | Obrigatório; ID hexadecimal de 32 caracteres |
| `BACKUP_R2_BUCKET` | Obrigatório; bucket privado |
| `BACKUP_R2_PREFIX` | `byleticia`; segmentos alfanuméricos, `_` ou `-` |
| `BACKUP_R2_JURISDICTION` | vazio; opcional `eu` ou `fedramp` quando o bucket exigir |
| `BACKUP_HOST` | `byleticia-production`; nome estável usado para filtrar snapshots |
| `BACKUP_RUN_AT_UTC` | `03:00`; HH:MM em UTC |
| `BACKUP_KEEP_DAILY` | `7`, entre 0 e 3650 |
| `BACKUP_KEEP_WEEKLY` | `4`, entre 0 e 3650 |
| `BACKUP_KEEP_MONTHLY` | `0`, entre 0 e 3650 |
| `BACKUP_PRUNE_DAY_UTC` | `0`, domingo; 0–6 |
| `BACKUP_TIMEOUT_SECONDS` | `3600`; 60–21600 por pipeline |
| `BACKUP_UPLOAD_KIB` | `4096`; limite de upload KiB/s |
| `BACKUP_DOWNLOAD_KIB` | `8192`; limite de download KiB/s |
| `RESTIC_BINARY` | `restic`; caminho do executável quando necessário |

A retenção sempre adiciona `--keep-last 1`; períodos são os critérios do restic e não uma promessa de número fixo de snapshots. `forget` remove referências após verificação; `prune` recupera espaço no dia configurado. Snapshots são criptografados e deduplicados. R2 conserva objetos criptografados, mas os metadados locais do staging são dados privados em claro, protegidos pelas permissões do volume.

## Alertas e agendamento

Criar e testar um monitor externo Healthchecks compatível com endpoints de ping, `/start` e `/fail`. Configurar nele o cron diário em UTC correspondente a `BACKUP_RUN_AT_UTC`, uma janela de tolerância maior que `BACKUP_TIMEOUT_SECONDS` mais margem, e um destinatário real autorizado. O endpoint precisa aceitar POST e não redirecionar. O script preserva query strings ao acrescentar o status ao caminho.

A implementação envia somente texto fixo `byleticia-backup start`, `success` ou `fail`, sem dados pessoais, nomes de arquivos, credenciais ou erros do backend. Um start-ping indisponível não impede preservar dados. O ping de sucesso é obrigatório para registrar sucesso local; se ele falhar, a execução fica em falha e tenta novamente em uma hora, mesmo que o snapshot tenha sido gravado. Falhas de entrega do ping de falha só podem ser detectadas pela ausência de sucesso no monitor independente.

Um `backup.completed` no log contém apenas o ID do snapshot. Erros são sanitizados; não imprimir ambiente, URL do monitor ou stderr do restic ao investigar. A ausência de execução depende do monitor externo já configurado, pois um processo parado não pode alertar sobre si mesmo. A simples presença de `BACKUP_MONITOR_URL` não configura destinatários nem prova entrega de alertas.

O scheduler verifica a necessidade a cada minuto, recupera uma janela diária perdida no startup, evita repetir uma janela concluída e tenta novamente após uma hora em caso de falha. O estado de sucesso só é persistido após backup/verificação/retenção e entrega do ping. O supervisor mantém o site disponível quando o worker falha e reinicia o worker após um minuto. SIGTERM encerra os grupos de processos, com prazo antes de SIGKILL.

## Ativação manual posterior

Não alterar o deploy atual para ativar este recurso sem revisão operacional. O arquivo `Dockerfile.backup` é uma opção de imagem que instala restic e util-linux e usa `node scripts/start-with-backup.mjs`. Não substitui o comando atual automaticamente. TypeScript permanece instalado, pois Next carrega `next.config.ts` também no startup de produção.

1. Revisar bucket, permissões, custos, monitor, cofre de recuperação e backup existente. Confirmar uma única réplica e mount de `/data`.
2. Construir a imagem em ambiente isolado: `docker build -f Dockerfile.backup -t byleticia-backup .`. Validar o site com `BACKUP_ENABLED=0`, sem fornecer novas credenciais. Este documento não afirma que essa construção Docker foi executada no ambiente Codex.
3. Configurar variáveis seguras e o binário na imagem, primeiro em staging com conjunto copiado e autorizado. Com `BACKUP_ENABLED=1`, executar uma única inicialização somente para repositório NOVO: `node scripts/backup/cli.mjs init`. Nunca usar `init` como tentativa automática de reparar um repositório perdido ou inacessível.
4. Executar `node scripts/backup/cli.mjs run`, conferir `backup.completed`, monitor e snapshots, e fazer o ensaio de restauração abaixo. `run` força execução, mas continua sob lock. `check` faz leitura integral de integridade; `snapshots` lista somente IDs e horários do host/tag/caminho configurados. Exit 75 significa outra operação com lock; não contornar o lock com comandos internos `_...`.
5. Só depois revisar o deploy opt-in do mesmo serviço e liberar o agendador. Não criar novos serviços pagos ou alterar configurações reais como efeito destes comandos de teste.

## Recuperação após perda de `/data`

Não apagar nem sobrescrever o volume existente. Conservar os backups externos e a configuração de recuperação. A restauração produz `DESTINO/data/` e `DESTINO/manifest.json` fora da origem; não recoloca automaticamente arquivos no volume da aplicação.

1. Suspender gravações e manter o agendador desativado. Provisionar máquina/serviço isolado autorizado com restic, segredos e a MESMA configuração de repositório, prefixo, `BACKUP_HOST` e caminho `CONTENT_DATA_DIR` usado na captura. Não servir tráfego público durante a recuperação.
2. Recriar somente o diretório vazio da origem, por exemplo `/data`, quando ele não existir. O CLI exige esse diretório para seu estado e lock; não exige JSONs para `snapshots`, `check` ou `restore`. Não iniciar o app para preencher defaults. Se o volume anterior ainda existir, não removê-lo. Uma origem com caminho diferente não encontra os mesmos snapshots, que são filtrados pelo caminho original de captura.
3. Em sessão administrativa com segredos já injetados, habilitar apenas o CLI explicitamente e listar snapshots:

   ```sh
   BACKUP_ENABLED=1 node scripts/backup/cli.mjs snapshots
   BACKUP_ENABLED=1 node scripts/backup/cli.mjs check
   BACKUP_ENABLED=1 node scripts/backup/cli.mjs restore SNAPSHOT_ID /restore/byleticia-recuperado
   ```

   Substituir `SNAPSHOT_ID` pelo ID selecionado; `latest` também é aceito, porém um ID explícito facilita auditoria. `/restore/byleticia-recuperado` deve ser novo ou vazio, fora de `/data`, sem componentes symlink, com espaço suficiente e acesso restrito. O CLI rejeita origem, ancestrais, descendentes, symlinks e destinos ocupados. A validação é `restic restore --verify` seguida de verificação de inventário/tamanhos/SHA-256. Uma falha não promove `data/` e remove o staging de restauração.
4. Comparar artigos, configurações, Linktree, portfolio, mídias e newsletter no conteúdo recuperado. Reaplicar exclusões de titulares ocorridas depois do snapshot, usando registro privado autorizado, antes de reabrir cadastros ou exportações. Não usar snapshots para campanhas.
5. Após revisão humana do resultado, planejar a cópia/troca para um volume novo, com a aplicação parada. O script não promove automaticamente a restauração para `/data`, não muda mount e não apaga o volume anterior. Validar leitura, mídias e escrita controlada antes de reabrir tráfego e scheduler. Preservar rollback.

O ensaio automatizado remove integralmente uma origem temporária, recria o diretório e recupera bytes/JSONs a partir do repositório externo ao diretório perdido. Isso comprova o mecanismo local, não um restore do backup real informado.

## Falhas, recursos e limitações

Em lock ocupado, aguardar a operação. Depois de OOM/SIGKILL pode haver lock restic remoto abandonado: investigar processos e origem antes de qualquer `restic unlock`, com operador autorizado e sem execução concorrente. Não remover locks ativos, usar `--no-lock`, reparar automaticamente ou excluir snapshots para contornar falhas. Se houver corrupção, preservar o repositório e investigar em cópia; o pipeline falha antes de retenção.

O restic usa uma CPU lógica, prioridade reduzida, alvo Go de memória de 128 MiB e duas conexões S3. Esses parâmetros não são limites rígidos do processo nem garantia contra OOM. `check --read-data` lê todo o repositório diariamente; `prune` também pode ser caro. No Railway Hobby, revisar RAM, CPU, espaço livre, tamanho do cache/staging e duração medidos com acervo representativo. JSONs são copiados, mídia por hardlink normalmente não duplica blocos, e o fallback de cópia precisa de espaço adicional. Restauração precisa de espaço para todos os bytes recuperados.

R2 e Railway podem cobrar armazenamento, operações, rede ou consumo de serviço conforme condições atuais; não se promete custo zero. Configurar limites/alertas financeiros e revisar políticas atuais separadamente. Não diminuir a verificação de integridade apenas para silenciar timeout: investigar volume, rede e orçamento operacional. Caso o conjunto deixe de caber nos recursos do Hobby, revisar a estratégia antes de habilitar.

A recuperação destes arquivos foi feita a partir do registro técnico da revisão de 15/10/2026, após o ambiente ter retornado a um checkout anterior. Mantém a arquitetura revisada e inclui as correções de symlink ancestral e revalidação pós-upload. Não é uma recuperação byte a byte de um commit perdido; os testes locais documentam o comportamento reconstruído.
