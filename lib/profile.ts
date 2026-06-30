/**
 * 공개 프로필 조회 헬퍼.
 *
 * 왜 별도 모듈인가:
 *   getPublicProfile는 server component + 향후 API 라우트 양쪽에서
 *   재사용 가능하도록 분리. 화이트리스트 select를 한 곳에서 관리해
 *   email/passwordHash 누출 경로를 단일 지점으로 봉쇄한다.
 */

import { prisma } from "@/lib/prisma";
import type { PublicProfile } from "@/types";

export interface PublicProfileWithPosts extends PublicProfile {
  posts: { id: string; imageUrls: string[] }[];
}

/**
 * handle로 공개 프로필 + OOTD 게시물 목록 조회.
 *
 * @param handle  URL 세그먼트에서 추출한 handle 문자열 (null 불가)
 * @param viewerId 현재 로그인 유저 id (비로그인 시 null)
 * @returns 프로필 + posts, handle에 해당하는 유저가 없으면 null
 */
export async function getPublicProfile(
  handle: string,
  viewerId: string | null
): Promise<PublicProfileWithPosts | null> {
  // 화이트리스트 select — email/passwordHash/orders 등 민감 필드 절대 포함 금지
  const user = await prisma.user.findUnique({
    where: { handle },
    select: { id: true, name: true, avatar: true, handle: true },
  });

  if (!user) return null;

  // 팔로워/팔로잉/게시물 수는 비정규화 금지 — 항상 count 쿼리
  const [followerCount, followingCount, postCount, isFollowingRow, posts] =
    await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.oOTDPost.count({ where: { userId: user.id } }),
      viewerId !== null
        ? prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: user.id,
              },
            },
          })
        : Promise.resolve(null),
      prisma.oOTDPost.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, imageUrls: true },
      }),
    ]);

  const isFollowing = isFollowingRow !== null;

  return {
    id: user.id,
    handle: user.handle,
    name: user.name,
    avatar: user.avatar,
    followerCount,
    followingCount,
    postCount,
    isFollowing,
    posts,
  };
}
