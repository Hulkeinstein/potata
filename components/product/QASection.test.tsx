/**
 * QASection 컴포넌트 테스트
 * - 케이스 ①: 질문 목록 GET mock(질문 1건+답변 1건) → 질문/답변 content + userName 렌더
 * - 케이스 ②: questions 빈 배열 → 빈 상태 메시지("아직 문의가 없습니다.")
 * - 케이스 ③: 비로그인(unauthenticated) → "문의하기" 버튼/질문 작성 폼 미노출 + 로그인 안내 렌더
 * - 케이스 ④: 로그인 + viewerIsAdmin false → "문의하기" 노출, 클릭 후 textarea 입력 + 제출 → POST fetch 호출
 * - 케이스 ⑤: viewerIsAdmin true → "답변하기" 버튼 노출 / false → 미노출
 *
 * @testing-library/jest-dom 미설치 환경이므로 순수 vitest expect 사용
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QASection } from "./QASection";

// --- next-auth/react mock ---
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// --- next/navigation mock (내부 a 태그 등 대비) ---
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/"),
}));

import { useSession } from "next-auth/react";

// --- 픽스처 ---
const NOW = new Date().toISOString();

const MOCK_ANSWER = {
  id: "a1",
  questionId: "q1",
  userName: "Admin",
  content: "답변입니다",
  createdAt: NOW,
  updatedAt: NOW,
};

const MOCK_QUESTION_WITH_ANSWER = {
  id: "q1",
  userId: "u1",
  userName: "Kim",
  productId: "p1",
  content: "사이즈 문의",
  answers: [MOCK_ANSWER],
  createdAt: NOW,
  updatedAt: NOW,
};

const MOCK_QUESTION_NO_ANSWER = {
  id: "q2",
  userId: "u2",
  userName: "Lee",
  productId: "p1",
  content: "재고 문의",
  answers: [],
  createdAt: NOW,
  updatedAt: NOW,
};

// GET 응답 팩토리
const makeGetResponse = (
  questions: typeof MOCK_QUESTION_WITH_ANSWER[],
  viewerIsAdmin = false,
) => ({
  ok: true,
  json: async () => ({
    success: true,
    data: {
      questions,
      questionCount: questions.length,
      viewerIsAdmin,
    },
  }),
});

// POST 응답 팩토리
const makePostResponse = () => ({
  ok: true,
  status: 201,
  json: async () => ({
    success: true,
    data: {
      id: "q-new",
      userId: "u1",
      userName: "Kim",
      productId: "p1",
      content: "새 문의 내용",
      answers: [],
      createdAt: NOW,
      updatedAt: NOW,
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
describe("QASection", () => {
  // 케이스 ①: 질문 목록 렌더 (답변 중첩)
  it("질문 1건+답변 1건 GET → 질문 content·답변 content·userName 렌더", async () => {
    setAuth(false);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeGetResponse([MOCK_QUESTION_WITH_ANSWER]),
    );

    render(<QASection productId="p1" />);

    await waitFor(() => {
      // 질문 userName 및 content
      expect(screen.queryByText("Kim")).not.toBeNull();
      expect(screen.queryByText("사이즈 문의")).not.toBeNull();
      // 답변 userName 및 content
      expect(screen.queryByText("Admin")).not.toBeNull();
      expect(screen.queryByText("답변입니다")).not.toBeNull();
      // 답변 배지 "판매자"
      expect(screen.queryByText("판매자")).not.toBeNull();
      // 문의 수 표시
      expect(screen.queryByText("1개 문의")).not.toBeNull();
    });
  });

  // 케이스 ②: 빈 상태
  it("questions 빈 배열 → 빈 상태 텍스트 렌더", async () => {
    setAuth(false);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeGetResponse([]),
    );

    render(<QASection productId="p1" />);

    await waitFor(() => {
      expect(screen.queryByText("아직 문의가 없습니다.")).not.toBeNull();
    });
    // 문의 수 카운터 미노출 (questionCount === 0)
    expect(screen.queryByText(/개 문의/)).toBeNull();
  });

  // 케이스 ③: 비로그인 → 질문 작성 폼/문의하기 버튼 미노출 + 로그인 안내
  it("비로그인 → 문의하기 버튼 미노출 + 로그인 안내 렌더", async () => {
    setAuth(false);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeGetResponse([]),
    );

    render(<QASection productId="p1" />);

    await waitFor(() => {
      expect(screen.queryByText("아직 문의가 없습니다.")).not.toBeNull();
    });

    // "문의하기" 버튼 미노출
    expect(screen.queryByRole("button", { name: "문의하기" })).toBeNull();

    // 질문 작성 textarea 미노출
    expect(
      screen.queryByPlaceholderText("상품에 대해 궁금한 점을 남겨 주세요."),
    ).toBeNull();

    // 로그인 안내 문구
    expect(screen.queryByText(/문의를 작성하려면/)).not.toBeNull();
    // 로그인 링크
    const loginLink = screen.queryByRole("link", { name: "로그인" });
    expect(loginLink).not.toBeNull();
  });

  // 케이스 ④: 로그인 → "문의하기" 노출, 클릭 후 textarea 입력 + 제출 → POST fetch 호출
  it("로그인 → 문의하기 버튼 노출, textarea 입력 후 제출 → POST /api/products/p1/questions 호출", async () => {
    setAuth(true);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    // 초기 GET (빈 목록)
    fetchMock.mockResolvedValueOnce(makeGetResponse([], false));
    // POST 응답
    fetchMock.mockResolvedValueOnce(makePostResponse());
    // POST 후 loadQuestions 재호출 GET
    fetchMock.mockResolvedValueOnce(
      makeGetResponse(
        [
          {
            id: "q-new",
            userId: "u1",
            userName: "Kim",
            productId: "p1",
            content: "새 문의 내용",
            answers: [],
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
        false,
      ),
    );

    render(<QASection productId="p1" />);

    // "문의하기" 버튼 대기 + 클릭 → 폼 열기
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "문의하기" })).not.toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "문의하기" }));

    // textarea 노출 확인
    const textarea = screen.getByPlaceholderText(
      "상품에 대해 궁금한 점을 남겨 주세요.",
    );
    expect(textarea).not.toBeNull();

    // 내용 입력
    fireEvent.change(textarea, { target: { value: "새 문의 내용" } });

    // "문의 등록" 버튼 클릭 (제출)
    const submitBtn = screen.getByRole("button", { name: "문의 등록" });
    fireEvent.click(submitBtn);

    // POST fetch 호출 검증
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/products/p1/questions",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "새 문의 내용" }),
        }),
      );
    });
  });

  // 케이스 ⑤-A: viewerIsAdmin true → "답변하기" 버튼 노출
  it("viewerIsAdmin true → 답변하기 버튼 노출", async () => {
    setAuth(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeGetResponse([MOCK_QUESTION_NO_ANSWER], true),
    );

    render(<QASection productId="p1" />);

    await waitFor(() => {
      expect(screen.queryByText("재고 문의")).not.toBeNull();
    });

    // "답변하기" 버튼 노출 확인
    expect(screen.queryByRole("button", { name: /답변하기/ })).not.toBeNull();
  });

  // 케이스 ⑤-B: viewerIsAdmin false → "답변하기" 버튼 미노출
  it("viewerIsAdmin false → 답변하기 버튼 미노출", async () => {
    setAuth(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeGetResponse([MOCK_QUESTION_NO_ANSWER], false),
    );

    render(<QASection productId="p1" />);

    await waitFor(() => {
      expect(screen.queryByText("재고 문의")).not.toBeNull();
    });

    // "답변하기" 버튼 미노출 확인
    expect(screen.queryByRole("button", { name: /답변하기/ })).toBeNull();
  });
});
