# BY LETÍCIA Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** corrigir mídia e administração, modernizar editorial e integrar Linktree sem perda de conteúdo.
**Architecture:** Next.js e JSON existentes, camada de armazenamento segura, mídia compartilhada, Linktree nativo com importação explícita.
**Tech Stack:** Next.js 15, React 19, TypeScript, npm, Node test runner e Playwright.
**Spec:** docs/superpowers/specs/2026-10-12-editorial-linktree-design.md

## Global Constraints
- Preservar conteúdo e mídias; nunca escrever em produção.
- Sem deploy/DNS/custos/credenciais novos; volume CONTENT_DATA_DIR.
- Não incluir Astro no runtime ou iframe externo para Linktree.

## Review Focus
- JSON corrompido não pode retornar seed e sobrescrever dados reais.
- Falha parcial de save mantém dirty e informa exatamente a coleção.
- Dados antigos sem metadados novos preservam URLs/textos e não recortam mobile.
- Importação sem mídia completa falha antes de ativar novo dataset.
- URL ativa, arquivo com MIME falso ou traversal não pode ser servido como conteúdo executável.

### Task 1: persistência e segurança
Files: lib/json-store.ts, lib/media.ts, stores/APIs, tests/storage.test.ts, tests/media.test.ts.
Interfaces: readJsonFile<T>(path,fallback), writeJsonFile(path,data,expectedRevision?), revisionFor(data); safe URLs/embed helpers; MediaAsset aditivo.
- [ ] Testar backup, corrupção, conflito e URLs perigosas (RED).
- [ ] Implementar escrita atômica/validação sem alterar fonte real; GREEN.
- [ ] Repetir suite e registrar evidência.

### Task 2: mídia/editorial/menu
Files: components/Media.tsx, Site.tsx, MobileNavigation.tsx, ArticleBody.tsx, PortfolioGallery.tsx, globals.css, tests/browser.spec.ts.
Interfaces: SharedMedia({asset,alt,priority?,video?}); regras mobile consistentes.
- [ ] Reproduzir crop/overflow/menu por browser (RED).
- [ ] Usar mídia comum, menu modal, design tokens e layout refinado.
- [ ] Validar imagens reais, foco, Escape e todos os breakpoints (GREEN).

### Task 3: administração
Files: AdminEditor.tsx, admin/MediaControl.tsx, admin/MediaLibrary.tsx; tests/integration.test.ts.
Interfaces: saves com ETag/If-Match, dirty por coleção, biblioteca autenticada.
- [ ] Testar save parcial/conflito/unauth/upload-card roundtrip (RED).
- [ ] Implementar dashboard, breadcrumbs, dirty, erros e previews.
- [ ] Validar edição/upload/refresh com dados temporários isolados (GREEN).

### Task 4: Linktree
Files: lib/linktree-model.ts, linktree-store.ts, content/linktree-original.json, app/linktree/page.tsx, api/linktree, components/LinktreeView.tsx, admin/LinktreeEditor.tsx, scripts/import-linktree.ts.
Interfaces: modelo compatível com config Astro + listas e blocks; import preview e commit sem sobrescrita.
- [ ] Testar preservação exata dos textos/URLs/ordem e recusa de import incompleto (RED).
- [ ] Portar conteúdo conhecido, copiar background, desenvolver gerenciamento unificado e migração segura.
- [ ] Testar rota nativa e admin; distinguir baseline Git de conteúdo live (GREEN).

### Task 5: SEO, QA e entrega
Files: metadata/routes, tests, docs/AUDIT-AND-DELIVERY.md, docs/DEPLOYMENT.md.
- [ ] Metadados por rota, sitemap/robots, Article JSON-LD, dependências auditadas.
- [ ] Build, tipos, unitários, integração, Chromium/axe em larguras exigidas.
- [ ] Revisão independente; corrigir achados relevantes e documentar limites.
- [ ] Entregar código e evidências sem publicar.
