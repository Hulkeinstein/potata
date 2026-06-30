"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing: boolean;
  initialCount: number;
}

interface FollowResponse {
  success: boolean;
  data?: { targetUserId: string; following: boolean; followerCount: number };
  error?: string;
}

/**
 * 팔로우/언팔로우 낙관적 토글 버튼.
 *
 * 비로그인: confirm → /login 유도.
 * 로그인: 낙관적 setState → POST /api/users/[id]/follow → 응답으로 정정, 실패 시 롤백.
 * (WhatToWearClient.toggleLike 패턴 복제)
 */
export default function FollowButton({
  targetUserId,
  initialFollowing,
  initialCount,
}: FollowButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    // 비로그인 — confirm 후 /login 유도
    if (status !== "authenticated") {
      if (confirm("로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?")) {
        router.push("/login");
      }
      return;
    }

    if (loading) return;

    // 낙관적 업데이트
    const prevFollowing = following;
    const prevCount = count;
    setFollowing(!following);
    setCount(following ? count - 1 : count + 1);
    setLoading(true);

    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`follow ${res.status}`);

      const json = (await res.json()) as FollowResponse;
      if (json.success && json.data) {
        // 서버 응답으로 정정 (count 정합)
        setFollowing(json.data.following);
        setCount(json.data.followerCount);
      }
    } catch {
      // 실패 시 롤백
      setFollowing(prevFollowing);
      setCount(prevCount);
      console.warn("[FollowButton] 팔로우 저장 실패, 롤백");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
          following
            ? "bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:text-white"
            : "bg-brand-neon text-black hover:opacity-90"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {following ? "팔로잉" : "팔로우"}
      </button>
      <span className="text-sm text-zinc-400">
        팔로워 <span className="text-white font-semibold">{count}</span>
      </span>
    </div>
  );
}
