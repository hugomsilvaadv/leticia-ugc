# Integração final — plano de execução

Base confirmada: main 1fdc77d (PR #6 publicada). Branch release/byleticia-integracao-final-20261017. Backup externo real de /data informado pelo responsável como realizado e validado em 17/10/2026; não repetir nem alterar volume nesta tarefa.

O ambiente fornecido nesta retomada estava limpo em 2667958, sem os commits/arquivos locais de newsletter/restic nem imagens Docker anteriores. Reflogs, objetos Git e diretórios de artefatos foram examinados. Bundle e branch de preservação criados antes da sincronização. Recuperar os módulos a partir do registro técnico da implementação nesta conversa, com novos testes, sem afirmar identidade binária com o snapshot ausente.

- [x] Preservar estado inicial e sincronizar release com main sem reset destrutivo.
- [x] Recuperar newsletter: consentimento, armazenamento privado/atômico, exclusão por token, painel e CSV. Campanhas desativadas.
- [x] Recuperar restic opcional com agendador no mesmo serviço, desativado por padrão; não inicializar R2 ou exigir credenciais no startup do site.
- [x] Reutilizar busca publicada; testar e corrigir apenas regressões comprovadas, sem algoritmo duplicado.
- [x] Corrigir cache/derivados responsivos de mídias e sitemap para Linktree publicado sem mudar originais.
- [x] Atualizar documentação e inventário de pendências (conteúdo/media continuam sob controle do administrador).
- [x] Rodar unitários, E2E, build, typecheck e revisão independente; corrigir falhas relevantes.
- [x] Preparar entrega por commit/push somente release e PR main; nunca merge/deploy nesta tarefa. Link final registrado na resposta e no GitHub.
