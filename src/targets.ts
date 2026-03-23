export function normalizeBuzTarget(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let value = trimmed;
  if (/^buz:/i.test(value)) {
    value = value.replace(/^buz:/i, "").trim();
  }
  if (!value) {
    return null;
  }

  if (/^(group|user):/i.test(value)) {
    const normalized = value.replace(/^(group|user):/i, (m) => m.toLowerCase());
    return `buz:${normalized}`;
  }

  return `buz:user:${value}`;
}

export function looksLikeBuzId(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  return Boolean(normalizeBuzTarget(trimmed));
}

export function parseBuzTarget(raw: string): { kind: "user" | "group"; id: string } | null {
  const normalized = normalizeBuzTarget(raw);
  if (!normalized) {
    return null;
  }
  const withoutProvider = normalized.replace(/^buz:/i, "");
  if (withoutProvider.startsWith("group:")) {
    const id = withoutProvider.substring("group:".length).trim();
    return id ? { kind: "group", id } : null;
  }
  if (withoutProvider.startsWith("user:")) {
    const id = withoutProvider.substring("user:".length).trim();
    return id ? { kind: "user", id } : null;
  }
  return null;
}
