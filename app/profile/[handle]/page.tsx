import { notFound } from "next/navigation";
import Image from "next/image";
import { auth } from "@/auth";
import { getPublicProfile } from "@/lib/profile";
import FollowButton from "@/components/profile/FollowButton";

interface ProfilePageProps {
  params: Promise<{ handle: string }>;
}

/**
 * 공개 프로필 페이지 — server component, 비로그인 공개(middleware matcher 미포함).
 *
 * URL: /profile/[handle]  (@handle 표기는 UI에서만)
 * dicebear seed=handle — 7.x 버전 일관(mypage의 seed=name과 구별)
 */
export default async function ProfilePage({ params }: ProfilePageProps) {
  // Next 15+ params Promise → await 필수
  const { handle } = await params;

  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const profile = await getPublicProfile(handle, viewerId);

  if (!profile) notFound();

  // 본인 프로필 여부(팔로우 버튼 미노출)
  const isOwnProfile = viewerId !== null && viewerId === profile.id;

  return (
    <div className="min-h-screen bg-black pt-20 pb-24 text-white">
      <div className="max-w-2xl mx-auto px-6">

        {/* 프로필 헤더 */}
        <div className="flex items-start gap-6 mb-10">
          {/* dicebear 아바타 — seed=handle, 7.x 버전 일관 */}
          <div className="relative w-24 h-24 rounded-full p-[2px] bg-linear-to-r from-brand-neon to-purple-500 flex-shrink-0">
            <div className="relative w-full h-full rounded-full overflow-hidden bg-black border-2 border-black">
              <Image
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${handle}`}
                alt={profile.name}
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* 이름 + handle + 통계 + 팔로우 버튼 */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold font-outfit mb-0.5 truncate">
              {profile.name}
            </h1>
            <p className="text-zinc-400 text-sm mb-4">@{handle}</p>

            {/* 통계 그리드 */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-outfit text-white">
                  {profile.postCount}
                </span>
                <span className="text-xs text-zinc-400">Posts</span>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-outfit text-white">
                  {profile.followerCount}
                </span>
                <span className="text-xs text-zinc-400">Followers</span>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-outfit text-white">
                  {profile.followingCount}
                </span>
                <span className="text-xs text-zinc-400">Following</span>
              </div>
            </div>

            {/* 팔로우 버튼 — 본인 프로필에서는 미노출 */}
            {!isOwnProfile && (
              <FollowButton
                targetUserId={profile.id}
                initialFollowing={profile.isFollowing}
                initialCount={profile.followerCount}
              />
            )}
          </div>
        </div>

        {/* OOTD 그리드 */}
        {profile.posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <p className="text-lg font-medium mb-1">아직 게시물이 없습니다</p>
            <p className="text-sm">첫 OOTD를 기다려봐요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {profile.posts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square overflow-hidden bg-zinc-900"
              >
                {post.imageUrls[0] && (
                  <Image
                    src={post.imageUrls[0]}
                    alt="OOTD"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 33vw, 224px"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
