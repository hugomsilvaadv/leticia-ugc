export function assertMatchingShape(
  value: unknown,
  template: unknown,
  field = "conteúdo",
): void {
  if (
    template !== null &&
    typeof template === "object" &&
    !Array.isArray(template)
  ) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error(`Formato inválido em ${field}.`);
    for (const [key, v] of Object.entries(value))
      if (Object.hasOwn(template, key))
        assertMatchingShape(
          v,
          (template as Record<string, unknown>)[key],
          `${field} → ${key}`,
        );
  } else if (
    typeof value !== typeof template ||
    (typeof value === "number" && !Number.isFinite(value))
  )
    throw new Error(`Valor inválido em ${field}.`);
}
