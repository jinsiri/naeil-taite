export function normalizePostgresText(value: string) {
  const parts: string[] = [];
  let changed = false;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0) {
      changed = true;
      continue;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        parts.push(value[index], value[index + 1]);
        index += 1;
      } else {
        parts.push("�");
        changed = true;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      parts.push("�");
      changed = true;
      continue;
    }
    parts.push(value[index]);
  }

  return { text: parts.join(""), changed };
}

export function isPostgresSafeText(value: string) {
  return !normalizePostgresText(value).changed;
}
