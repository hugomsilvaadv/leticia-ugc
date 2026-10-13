"use client";
import type {
  LinktreeConfig,
  LinktreeLink,
  LinktreeVideo,
} from "@/lib/linktree-model";
import MediaControl from "./MediaControl";
const names: Record<string, string> = {
  profile: "Perfil",
  links: "Links",
  portfolio: "Fotos e vídeos",
  services: "Pacotes e serviços",
  contact: "Contato",
};
const textNames: Record<string, string> = {
  heroKicker: "Perfil → Chamada",
  heroTitle: "Perfil → Nome",
  heroDescription: "Perfil → Descrição",
  heroButtonPortfolio: "Links → Portfólio",
  heroButtonPackages: "Links → Serviços",
  heroButtonContact: "Links → Contato",
  portfolioEyebrow: "Portfólio → Chamada",
  portfolioTitle: "Portfólio → Título",
  portfolioSubtitle: "Portfólio → Descrição",
  servicesEyebrow: "Serviços → Chamada",
  servicesTitle: "Serviços → Título",
  servicesSubtitle: "Serviços → Descrição",
  proposalButton: "Serviços → Botão",
  footerTitle: "Contato → Título",
  footerDescription: "Contato → Descrição",
  footerEmail: "Contato → E-mail",
  footerLocation: "Contato → Localização",
  footerInstagram: "Contato → Instagram",
  footerWhatsapp: "Contato → WhatsApp",
};
export default function LinktreeEditor({
  config,
  onChange,
  password,
}: {
  config: LinktreeConfig;
  onChange: (c: LinktreeConfig) => void;
  password: string;
}) {
  const patch = (values: Partial<LinktreeConfig>) =>
    onChange({ ...config, ...values });
  function reorder<T>(list: T[], index: number, shift: number): T[] {
    const next = [...list];
    if (index + shift < 0 || index + shift >= next.length) return next;
    [next[index], next[index + shift]] = [next[index + shift], next[index]];
    return next;
  }
  function changeLink(
    key: "links" | "socials",
    index: number,
    values: Partial<LinktreeLink>,
  ) {
    const list = config[key].map((v, i) =>
      i === index ? { ...v, ...values } : v,
    );
    const textKey = config[key][index].labelKey;
    onChange({
      ...config,
      [key]: list,
      ...(values.label !== undefined && textKey
        ? {
            texts: {
              ...config.texts,
              [textKey]: { ...config.texts[textKey], text: values.label },
            },
          }
        : {}),
    });
  }
  function changeVideo(index: number, values: Partial<LinktreeVideo>) {
    patch({
      videos: config.videos.map((v, i) =>
        i === index ? { ...v, ...values } : v,
      ),
    });
  }
  return (
    <div className="linktreeEditor">
      {(config.provenance.kind === "git-reference" || config.provenance.kind === "published-snapshot") && (
        <div className="adminNotice" role="status">
          Os textos, fontes, cores e links do portfólio foram preservados.
          As fotos e os vídeos antigos são opcionais: envie novas mídias
          abaixo e clique em Salvar alterações. O portfólio anterior
          permanece independente.
        </div>
      )}
      <div className="adminCard">
        <strong>Linktree → Perfil → Fotografia</strong>
        <MediaControl
          label="Fotografia do perfil"
          asset={config.media.profile}
          password={password}
          imageOnly
          onChange={(asset) =>
            patch({ media: { ...config.media, profile: asset } })
          }
        />
      </div>
      <details className="adminCard">
        <summary>Perfil, textos e informações comerciais</summary>
        {Object.entries(config.texts).map(([key, t]) => (
          <label key={key}>
            {textNames[key] ??
              (key.startsWith("basic")
                ? "Plano Básico"
                : key.startsWith("monthly")
                  ? "Plano Mensal"
                  : key.startsWith("ugc")
                    ? "Plano UGC"
                    : key.startsWith("product")
                      ? "Foto do produto"
                      : key.startsWith("unboxing")
                        ? "Unboxing"
                        : "Provador") +
                " → " +
                key.replace(/^[a-z]+/, "")}
            <textarea
              rows={2}
              value={t.text}
              onChange={(e) =>
                patch({
                  texts: {
                    ...config.texts,
                    [key]: { ...t, text: e.target.value },
                  },
                })
              }
            />
          </label>
        ))}
      </details>
      {(["links", "socials"] as const).map((key) => (
        <section className="adminCard" key={key}>
          <strong>
            Linktree → {key === "links" ? "Links" : "Redes sociais"}
          </strong>
          {config[key].map((link, i) => (
            <details key={link.id} className="adminListItem">
              <summary>
                {i + 1}.{" "}
                {link.labelKey ? config.texts[link.labelKey]?.text : link.label}{" "}
                {link.enabled ? "" : "(desativado)"}
              </summary>
              <label>
                Texto do link
                <input
                  value={
                    link.labelKey
                      ? (config.texts[link.labelKey]?.text ?? link.label)
                      : link.label
                  }
                  onChange={(e) =>
                    changeLink(key, i, { label: e.target.value })
                  }
                />
              </label>
              <label>
                Endereço
                <input
                  value={link.href}
                  onChange={(e) => changeLink(key, i, { href: e.target.value })}
                />
              </label>
              <label className="adminCheck">
                <input
                  type="checkbox"
                  checked={link.enabled}
                  onChange={(e) =>
                    changeLink(key, i, { enabled: e.target.checked })
                  }
                />
                Ativo
              </label>
              <div className="portfolioEditorActions">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => patch({ [key]: reorder(config[key], i, -1) })}
                >
                  ↑ Subir
                </button>
                <button
                  type="button"
                  disabled={i === config[key].length - 1}
                  onClick={() => patch({ [key]: reorder(config[key], i, 1) })}
                >
                  ↓ Descer
                </button>
                <button
                  type="button"
                  className="adminDanger"
                  onClick={() => {
                    if (
                      confirm(
                        "Retirar este link ao salvar? Um backup do conteúdo anterior será mantido.",
                      )
                    )
                      patch({ [key]: config[key].filter((_, n) => n !== i) });
                  }}
                >
                  Retirar link
                </button>
              </div>
            </details>
          ))}
          <button
            type="button"
            onClick={() =>
              patch({
                [key]: [
                  ...config[key],
                  {
                    id: crypto.randomUUID(),
                    label: "Novo link",
                    href: "",
                    enabled: false,
                  },
                ],
              })
            }
          >
            + Adicionar {key === "links" ? "link" : "rede social"}
          </button>
        </section>
      ))}
      <section className="adminCard">
        <strong>Linktree → Fotografias e vídeos</strong>
        {config.videos.map((v, i) => (
          <details key={v.id} className="adminListItem">
            <summary>
              {i + 1}. {v.title} {v.enabled ? "" : "(desativado)"}
            </summary>
            <label>
              Título
              <input
                value={
                  v.labelKey
                    ? (config.texts[v.labelKey]?.text ?? v.title)
                    : v.title
                }
                onChange={(e) => {
                  const title = e.target.value;
                  onChange({
                    ...config,
                    videos: config.videos.map((item, n) =>
                      n === i ? { ...item, title } : item,
                    ),
                    ...(v.labelKey
                      ? {
                          texts: {
                            ...config.texts,
                            [v.labelKey]: {
                              ...config.texts[v.labelKey],
                              text: title,
                            },
                          },
                        }
                      : {}),
                  });
                }}
              />
            </label>
            <label>
              Descrição
              <textarea
                value={v.description}
                onChange={(e) =>
                  changeVideo(i, { description: e.target.value })
                }
              />
            </label>
            <label>
              Formato
              <select
                value={v.type}
                onChange={(e) =>
                  changeVideo(i, {
                    type: e.target.value as LinktreeVideo["type"],
                  })
                }
              >
                <option>Foto</option>
                <option>Vídeo</option>
              </select>
            </label>
            <label className="adminCheck">
              <input
                type="checkbox"
                checked={v.enabled}
                onChange={(e) => changeVideo(i, { enabled: e.target.checked })}
              />
              Ativo
            </label>
            <MediaControl
              label={v.title || "Mídia Linktree"}
              asset={v.media}
              password={password}
              onChange={(media) => changeVideo(i, { media })}
            />
            <div className="portfolioEditorActions">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => patch({ videos: reorder(config.videos, i, -1) })}
              >
                ↑ Subir
              </button>
              <button
                type="button"
                disabled={i === config.videos.length - 1}
                onClick={() => patch({ videos: reorder(config.videos, i, 1) })}
              >
                ↓ Descer
              </button>
              <button
                type="button"
                className="adminDanger"
                onClick={() => {
                  if (
                    confirm(
                      "Retirar esta associação ao salvar? O arquivo original será preservado.",
                    )
                  )
                    patch({ videos: config.videos.filter((_, n) => n !== i) });
                }}
              >
                Retirar mídia
              </button>
            </div>
          </details>
        ))}
        <button
          type="button"
          onClick={() =>
            patch({
              videos: [
                ...config.videos,
                {
                  id: crypto.randomUUID(),
                  title: "Novo vídeo",
                  description: "",
                  enabled: false,
                  type: "Vídeo",
                  media: {
                    url: "",
                    positionX: 50,
                    positionY: 50,
                    zoom: 100,
                    opacity: 100,
                    fit: "contain",
                  },
                },
              ],
            })
          }
        >
          + Adicionar foto ou vídeo
        </button>
      </section>
      <details className="adminCard">
        <summary>Linktree → Serviços → Links das propostas</summary>
        {config.services.map((s, i) => (
          <label key={s.id}>
            {config.texts[s.nameKey]?.text}
            <input
              value={s.href}
              onChange={(e) =>
                patch({
                  services: config.services.map((service, n) =>
                    n === i ? { ...service, href: e.target.value } : service,
                  ),
                })
              }
            />
            <span>
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) =>
                  patch({
                    services: config.services.map((service, n) =>
                      n === i
                        ? { ...service, enabled: e.target.checked }
                        : service,
                    ),
                  })
                }
              />{" "}
              Exibir pacote
            </span>
          </label>
        ))}
      </details>
      <details className="adminCard">
        <summary>Linktree → Apresentação e ordem dos blocos</summary>
        <MediaControl
          label="Fotografia de fundo"
          asset={config.background}
          password={password}
          imageOnly
          onChange={(background) => patch({ background })}
        />
        {config.blocks.map((block, i) => (
          <div key={block} className="portfolioEditorActions">
            <span>
              {i + 1}. {names[block]}
            </span>
            <button
              type="button"
              disabled={i === 0}
              aria-label={"Subir " + names[block]}
              onClick={() => patch({ blocks: reorder(config.blocks, i, -1) })}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={i === config.blocks.length - 1}
              aria-label={"Descer " + names[block]}
              onClick={() => patch({ blocks: reorder(config.blocks, i, 1) })}
            >
              ↓
            </button>
          </div>
        ))}
      </details>
    </div>
  );
}
