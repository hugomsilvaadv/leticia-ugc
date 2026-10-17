# Letícia Leite — Blog de Moda + UGC

Projeto editorial de Letícia Leite com foco principal em moda, beleza e lifestyle, integrando portfólio e serviços de UGC sem transformar o site em uma landing page comercial.

## Direção do produto

O site deve parecer primeiro uma revista/blog autoral de moda e depois, de forma elegante, apresentar Letícia como criadora UGC.

### Pilares editoriais
- Moda
- Beleza
- Lifestyle
- Looks & Styling
- Achados / Curadoria
- Maternidade e universo feminino
- UGC / Trabalhe comigo

### Objetivos
1. Construir autoridade editorial e identidade própria.
2. Criar conteúdo pesquisável e compartilhável.
3. Atrair público orgânico via SEO e redes sociais.
4. Servir como portfólio vivo para marcas.
5. Converter marcas interessadas em UGC sem prejudicar a experiência editorial.

## Identidade inicial

Paleta derivada do material visual fornecido:
- Marfim: `#FDF9F2`
- Nude rosado: `#EAD9CF`
- Areia: `#DBC3AB`
- Taupe: `#918271`
- Rosa queimado: `#CB7C6D`
- Terracota: `#7C543D`
- Espresso: `#3B2B22`

A direção visual completa está em `docs/DESIGN-SYSTEM.md`.

## Stack sugerida
- Next.js
- TypeScript
- Tailwind CSS
- App Router
- Conteúdo inicialmente em MDX ou camada de conteúdo desacoplada
- GitHub como fonte oficial do projeto
- Deploy preparado para Railway
- Analytics/SEO preparados desde o MVP

## Documentação
- `AGENTS.md`: regras para agentes de IA
- `docs/PROJECT-BRIEF.md`: visão do produto
- `docs/DESIGN-SYSTEM.md`: identidade visual
- `docs/CONTENT-ARCHITECTURE.md`: estrutura editorial e páginas
- `docs/ANTIGRAVITY-BRIEF.md`: prompt inicial para o Google Antigravity

## Status
Aplicação Next.js implementada e busca editorial publicada pela PR #6. O Linktree preserva textos/estrutura e permite cadastrar novas fotos e vídeos pelo painel; não é necessário recuperar as mídias antigas.

## Desenvolvimento implementado

A aplicação atual usa Next.js App Router, TypeScript e CSS editorial. O painel `/admin` gerencia páginas, matérias, biblioteca de mídia, portfólio e o Linktree nativo em `/linktree`. A persistência é JSON no volume `CONTENT_DATA_DIR` (padrão `/data`), com backups e gravação atômica.

Instalação reproduzível: `npm ci`. Validação: `npm test`, `npm run test:e2e`, `npm run build` e `npm run typecheck`. A suíte E2E usa dados temporários isolados; não aponte testes para o volume real.

A importação do Linktree antigo é uma alternativa histórica, não um pré-requisito para cadastrar novas mídias no painel. Consulte [publicação e preservação](docs/DEPLOYMENT.md) e [relatório da auditoria](docs/AUDIT-AND-DELIVERY.md). Nenhum deploy é executado pelos comandos de validação.

## Integração preparada para revisão — 17/10/2026

Newsletter com consentimento e lista privada em `CONTENT_DATA_DIR/newsletter.json`; `/admin` → **Inscritos** permite consulta, CSV e exclusão. `/newsletter` oferece exclusão por link individual e contato para solicitações; `/privacidade` explica o tratamento. Campanhas permanecem desativadas e nenhum e-mail de confirmação é enviado.

Backup automático com restic/R2 é **opcional e desativado por padrão**. O site continua iniciando sem credenciais R2. Configuração, retenção e recuperação: [EXTERNAL-BACKUP-R2.md](docs/EXTERNAL-BACKUP-R2.md). O backup externo real de /data foi informado pelo responsável como realizado e validado em 17/10/2026; esta integração não o repete nem altera o volume.

Escopo e evidências da integração: [RELEASE-INTEGRATION-20261017.md](docs/RELEASE-INTEGRATION-20261017.md). Nenhum merge/deploy é feito por comandos de validação.
