export function getStorageAuthHeaders(key: string): Readonly<Record<string, string>> {
  if (key.startsWith("sb_")) {
    return { apikey: key };
  }

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}
