export type Section = "Moda" | "Beleza" | "Lifestyle" | "Achados";

export type Article = {
  slug: string;
  title: string;
  dek: string;
  category: Section;
  readTime: string;
};

export const articles: Article[] = [
  {
    slug: "camadas-sem-excesso",
    title: "Camadas sem excesso: um guia visual para a meia-estação",
    dek: "Proporção, textura e fórmulas simples para montar looks que parecem pensados sem perder conforto.",
    category: "Moda",
    readTime: "5 min"
  },
  {
    slug: "acessorios-que-mudam-o-look",
    title: "Acessórios que mudam o look sem competir com ele",
    dek: "Como usar brilho, escala e repetição para elevar produções básicas.",
    category: "Moda",
    readTime: "4 min"
  },
  {
    slug: "make-leve-com-presenca",
    title: "Make leve, acabamento polido e presença",
    dek: "Uma leitura prática de textura, cor e acabamento para uma maquiagem de uso real.",
    category: "Beleza",
    readTime: "6 min"
  },
  {
    slug: "wishlist-da-semana",
    title: "O que realmente vale entrar na wishlist desta semana",
    dek: "Uma curadoria pequena, intencional e fácil de combinar.",
    category: "Achados",
    readTime: "3 min"
  },
  {
    slug: "estilo-sem-uniforme",
    title: "Vestir-se bem sem transformar estilo em uniforme",
    dek: "Repetir referências pode construir identidade, desde que ainda exista espaço para experimentação.",
    category: "Lifestyle",
    readTime: "5 min"
  },
  {
    slug: "tres-formas-uma-peca-forte",
    title: "Três formas de usar uma peça forte em dias diferentes",
    dek: "Um exercício de styling para tirar mais do que você já tem no armário.",
    category: "Moda",
    readTime: "4 min"
  }
];

export const sectionCopy: Record<Section, string> = {
  Moda: "Tendências, styling, looks e peças que merecem espaço no armário.",
  Beleza: "Maquiagem, skincare, testes e favoritos sem excesso de promessa.",
  Lifestyle: "Rotina, repertório, lugares e o que atravessa o estilo fora do armário.",
  Achados: "Curadoria de peças, acessórios e beleza para comprar com mais intenção."
};

export function sectionFromSlug(slug: string): Section | null {
  const map: Record<string, Section> = {
    moda: "Moda",
    beleza: "Beleza",
    lifestyle: "Lifestyle",
    achados: "Achados"
  };
  return map[slug] ?? null;
}
