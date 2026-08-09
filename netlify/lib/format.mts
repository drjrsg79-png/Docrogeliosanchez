/** Precio en centavos → texto legible, p. ej. 89000 → "$890 MXN". */
export function formatPrice(cents: number, currency = "MXN"): string {
  const amount = (cents || 0) / 100;
  const text = Number.isInteger(amount)
    ? amount.toLocaleString("es-MX")
    : amount.toLocaleString("es-MX", { minimumFractionDigits: 2 });
  return `$${text} ${currency}`;
}

export function slugify(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function siteUrl(req: Request): string {
  const configured = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (configured) return configured.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
