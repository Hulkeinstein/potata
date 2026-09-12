import { describe, expect, it } from "vitest";
import { getOwnedProfileStorageUrls } from "./profile-storage-url";
import { getStorageAuthHeaders } from "./supabase-storage-auth";

describe("Supabase Storage authentication", () => {
  it("sends an opaque secret key only through the apikey header", () => {
    expect(getStorageAuthHeaders("sb_secret_example")).toEqual({
      apikey: "sb_secret_example",
    });
  });

  it("keeps legacy service-role JWT authentication compatible", () => {
    expect(getStorageAuthHeaders("legacy-jwt")).toEqual({
      apikey: "legacy-jwt",
      Authorization: "Bearer legacy-jwt",
    });
  });
});

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
