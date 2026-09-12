export function getOwnedProfileStorageUrls(
  storageOrigin: string,
  bucket: string,
  userId: string,
  publicUrls: string[],
): string[] {
  const ownerPrefix = `/storage/v1/object/public/${bucket}/${userId}/`;
  return publicUrls.filter((publicUrl) => {
    try {
      const candidate = new URL(publicUrl);
      return candidate.origin === storageOrigin && candidate.pathname.startsWith(ownerPrefix);
    } catch {
      return false;
    }
  });
}
