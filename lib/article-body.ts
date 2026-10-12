/** Interpreta títulos numerados do texto sem modificar a redação original. */
export type TextBlock = { type: "paragraph" | "heading" | "quote"; text: string };
export type NumberedBlock = {
  type: "numbered";
  key: string;
  number: string;
  title: string;
  content: TextBlock[];
};
export type BodyBlock = TextBlock | NumberedBlock;

export function parseArticleBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  for (const raw of body.split(/\n\s*\n/)) {
    const text = raw.trim();
    if (!text) continue;

    const numbered = text.match(/^(\d{1,3})[.)]\s+([^\n]+)$/);
    if (numbered) {
      blocks.push({ type: "numbered", key: numbered[1], number: numbered[1], title: numbered[2], content: [] });
      continue;
    }

    const block: TextBlock = text.startsWith("## ")
      ? { type: "heading", text: text.slice(3) }
      : text.startsWith("> ")
        ? { type: "quote", text: text.slice(2) }
        : { type: "paragraph", text };
    const previous = blocks[blocks.length - 1];
    if (previous?.type === "numbered" && block.type !== "heading") {
      previous.content.push(block);
    } else {
      blocks.push(block);
    }
  }
  return blocks;
}

export function getNumberedSections(body: string) {
  return parseArticleBody(body)
    .filter((block): block is NumberedBlock => block.type === "numbered")
    .map(({ key, number, title }) => ({ key, number, title }));
}
