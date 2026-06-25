/**
 * ReviewSection 컴포넌트 테스트
 * - 케이스 ①: reviews 다건 GET mock → 목록 렌더
 * - 케이스 ②: reviews 빈 배열 → 빈 상태 메시지
 * - 케이스 ③: 비로그인 → 작성 폼 미노출 + 로그인 안내
 * - 케이스 ④: 로그인 → 폼 노출, 별점 클릭 + textarea 입력 + 제출 → POST fetch 호출
 * - 케이스 ⑤: POST 409 → 한글 안내 메시지 표시
 *
 * @testing-library/jest-dom 미설치 환경이므로 순수 vitest expect 사용
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ReviewSection } from "./ReviewSection";

// --- next-auth/react mock ---
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// --- next/navigation mock (내부 Link 등 대비) ---
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/"),
}));

import { useSession } from "next-auth/react";

// --- 픽스처 ---
const MOCK_REVIEWS = [
  {
    id: "r1",
    userId: "u1",
    userName: "Kim",
    productId: "p1",
    rating: 5,
    comment: "Great product!",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "r2",
    userId: "u2",
    userName: "Lee",
    productId: "p1",
    rating: 4,
    comment: "Very nice.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const makeGetResponse = (reviews: typeof MOCK_REVIEWS) => ({
  ok: true,
  json: async () => ({
    success: true,
    data: {
      reviews,
      averageRating: reviews.length
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : null,
      reviewCount: reviews.length,
    },
  }),
});

const makePostResponse = () => ({
  ok: true,
  status: 201,
  json: async () => ({
    success: true,
    data: {
      id: "r-new",
      userId: "u1",
      userName: "Kim",
      productId: "p1",
      rating: 4,
      comment: "테스트 코멘트",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
});

// 세션 helper
const setAuth = (authenticated: boolean) => {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue(
    authenticated
      ? {
          data: { user: { id: "u1", name: "Kim", email: "kim@test.com" } },
          status: "authenticated",
        }
      : { data: null, status: "unauthenticated" },
  );
};

beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = vi.fn();
  window.confirm = vi.fn(() => true);
});

// ─────────────────────────────────────────────────────────────────────────────
describe("ReviewSection", () => {
  // 케이스 ①: reviews 다건 → 목록 렌더
  it("reviews 2건 GET → 작성자명/코멘트 렌더", async () => {
    setAuth(false);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeGetResponse(MOCK_REVIEWS),
    );

    render(<ReviewSection productId="p1" />);

    await waitFor(() => {
      expect(screen.queryByText("Kim")).not.toBeNull();
    });
    expect(screen.queryByText("Lee")).not.toBeNull();
    expect(screen.queryByText("Great product!")).not.toBeNull();
    expect(screen.queryByText("Very nice.")).not.toBeNull();
  });

  // 케이스 ②: reviews 빈 배열 → 빈 상태 메시지
  it("reviews 없음 → 빈 상태 텍스트 렌더", async () => {
    setAuth(false);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeGetResponse([]),
    );

    render(<ReviewSection productId="p1" />);

    await waitFor(() => {
      expect(
        screen.queryByText("No reviews yet. Be the first to review!"),
      ).not.toBeNull();
    });
  });

  // 케이스 ③: 비로그인 → 작성 폼 미노출 + 로그인 안내
  it("비로그인 → textarea 미노출 + 로그인 안내 렌더", async () => {
    setAuth(false);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeGetResponse([]),
    );

    render(<ReviewSection productId="p1" />);

    await waitFor(() => {
      expect(
        screen.queryByText("No reviews yet. Be the first to review!"),
      ).not.toBeNull();
    });

    // 작성 폼(textarea) 미노출 확인
    expect(
      screen.queryByPlaceholderText("상품에 대한 솔직한 리뷰를 남겨 주세요."),
    ).toBeNull();

    // 로그인 안내 문구 (실제 렌더 텍스트: "리뷰를 작성하려면 로그인이 필요합니다.")
    expect(screen.queryByText(/리뷰를 작성하려면/)).not.toBeNull();
    // 로그인 링크
    const loginLink = screen.queryByRole("link", { name: "로그인" });
    expect(loginLink).not.toBeNull();
  });

  // 케이스 ④: 로그인 → 폼 노출 + 별점 클릭 + 제출 → POST fetch 호출
  it("로그인 → 폼 노출, 별점 4점 + 코멘트 + 제출 → POST fetch 호출", async () => {
    setAuth(true);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    // 초기 GET (빈 목록)
    fetchMock.mockResolvedValueOnce(makeGetResponse([]));
    // POST 응답
    fetchMock.mockResolvedValueOnce(makePostResponse());
    // POST 후 loadReviews 재호출 GET
    fetchMock.mockResolvedValueOnce(
      makeGetResponse([
        {
          id: "r-new",
          userId: "u1",
          userName: "Kim",
          productId: "p1",
          rating: 4,
          comment: "테스트 코멘트",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    );

    render(<ReviewSection productId="p1" />);

    // 로그인 상태 → textarea 노출 대기
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("상품에 대한 솔직한 리뷰를 남겨 주세요."),
      ).not.toBeNull();
    });

    // 별점 4점 클릭 (StarRating interactive: aria-label="별점 4점")
    const star4 = screen.getByRole("button", { name: "별점 4점" });
    fireEvent.click(star4);

    // 코멘트 입력
    const textarea = screen.getByPlaceholderText(
      "상품에 대한 솔직한 리뷰를 남겨 주세요.",
    );
    fireEvent.change(textarea, { target: { value: "테스트 코멘트" } });

    // 제출 버튼 클릭 ("리뷰 등록")
    const submitBtn = screen.getByRole("button", { name: "리뷰 등록" });
    fireEvent.click(submitBtn);

    // POST fetch 호출 검증
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/products/p1/reviews",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 4, comment: "테스트 코멘트" }),
        }),
      );
    });
  });

  // 케이스 ⑤: POST 409 → 한글 안내 메시지 표시
  it("POST 409 → 이미 처리된 리뷰 한글 안내 표시", async () => {
    setAuth(true);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    // 초기 GET (빈 목록 — 폼 노출용)
    fetchMock.mockResolvedValueOnce(makeGetResponse([]));
    // POST → 409 응답
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ success: false, error: "Review already exists" }),
    });

    render(<ReviewSection productId="p1" />);

    // 폼 노출 대기
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("상품에 대한 솔직한 리뷰를 남겨 주세요."),
      ).not.toBeNull();
    });

    // 별점 4점 클릭
    const star4 = screen.getByRole("button", { name: "별점 4점" });
    fireEvent.click(star4);

    // 제출
    const submitBtn = screen.getByRole("button", { name: "리뷰 등록" });
    fireEvent.click(submitBtn);

    // 409 한글 안내 메시지 확인
    await waitFor(() => {
      expect(
        screen.queryByText("이미 리뷰가 처리되었습니다. 새로고침 후 다시 시도해 주세요."),
      ).not.toBeNull();
    });
  });
});
