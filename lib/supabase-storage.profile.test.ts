import { describe, expect, it } from "vitest";
import { getOwnedProfileStorageUrls } from "./profile-storage-url";

describe("profile image cleanup ownership", () => {
  it("deletes only URLs from the configured origin, bucket, and session-owner prefix", async () => {
    expect(getOwnedProfileStorageUrls("https://potata.supabase.co", "profile-images", "owner", [
      "https://lh3.googleusercontent.com/avatar",
      "https://evil.example/storage/v1/object/public/profile-images/owner/evil.png",
      "https://potata.supabase.co/storage/v1/object/public/profile-images/other/foreign.png",
      "https://potata.supabase.co/storage/v1/object/public/profile-images/owner/mine.png",
    ])).toEqual(["https://potata.supabase.co/storage/v1/object/public/profile-images/owner/mine.png"]);
  });
});
