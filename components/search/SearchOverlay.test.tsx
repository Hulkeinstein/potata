/**
 * SearchOverlay 컴포넌트 테스트
 * - 케이스 ①: 검색어 2자 이상 → form submit → router.push("/search?q=...") + onClose() 호출
 * - 케이스 ②: 검색어 1자(2자 미만 가드) → submit → router.push 호출 안 됨
 * - 케이스 ③: 앞뒤 공백 trim + 한글 encodeURIComponent 인코딩 확인
 * - 케이스 ④: isOpen=false → input 미렌더(AnimatePresence 언마운트)
 *
 * @testing-library/jest-dom 미설치 환경이므로 순수 vitest expect 사용
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SearchOverlay } from "./SearchOverlay";

// --- framer-motion mock (AnimatePresence/motion이 jsdom에서 exit 애니메이션 지연 방지) ---
// motion prop(initial/animate/exit/transition/whileHover 등)을 제거해 DOM warning 방지
// 알려진 motion prop 키를 오브젝트 필터로 제거 — 명명 destructure 없이 unused-var 경고 회피
const MOTION_PROP_KEYS = new Set([
  "initial", "animate", "exit", "transition",
  "whileHover", "whileTap", "whileFocus", "whileDrag",
  "layout", "layoutId", "variants", "custom",
]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripMotion(props: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in props) {
    if (!MOTION_PROP_KEYS.has(k)) out[k] = props[k];
  }
  return out;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  // motion.div, motion.span 등을 해당 HTML 태그로 passthrough (motion prop 제거)
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: (props: Record<string, any>) => <div {...stripMotion(props)}>{props.children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    span: (props: Record<string, any>) => <span {...stripMotion(props)}>{props.children}</span>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    button: (props: Record<string, any>) => <button {...stripMotion(props)}>{props.children}</button>,
  },
}));

// --- next/navigation mock ---
// vi.hoisted로 pushMock을 먼저 선언해 mock factory 클로저에서 참조 가능하게 함
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: vi.fn(() => "/"),
}));

// --- next/link mock (RECENT_BRANDS의 <Link> 렌더 대비) ---
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

// --- lucide-react mock (jsdom에서 SVG 렌더 단순화) ---
vi.mock("lucide-react", () => ({
  Search: () => <svg data-testid="icon-search" />,
  X: () => <svg data-testid="icon-x" />,
  TrendingUp: () => <svg data-testid="icon-trending" />,
  Store: () => <svg data-testid="icon-store" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// 헬퍼: SearchOverlay를 isOpen=true로 렌더 후 input 반환
function renderOpen(onClose = vi.fn()) {
  render(<SearchOverlay isOpen={true} onClose={onClose} />);
  // aria-label="Search products" 로 input 탐색
  const input = screen.getByLabelText("Search products") as HTMLInputElement;
  return { input, onClose };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("SearchOverlay", () => {
  // 케이스 ①: Happy path — 2자 이상 검색어 → router.push + onClose
  it("검색어 2자 이상 입력 후 form submit → router.push('/search?q=denim') + onClose 호출", () => {
    const { input, onClose } = renderOpen();

    fireEvent.change(input, { target: { value: "denim" } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    expect(pushMock).toHaveBeenCalledWith("/search?q=denim");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 케이스 ②: 2자 미만 가드 — router.push 호출 안 됨
  it("검색어 1자(2자 미만 가드) → submit → router.push 미호출", () => {
    const { input, onClose } = renderOpen();

    fireEvent.change(input, { target: { value: "a" } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    expect(pushMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  // 케이스 ②-b: 빈 문자열도 미호출
  it("검색어 빈 문자열 → submit → router.push 미호출", () => {
    const { input } = renderOpen();

    // value 변경 없이(기본값 "") submit
    const form = input.closest("form")!;
    fireEvent.submit(form);

    expect(pushMock).not.toHaveBeenCalled();
  });

  // 케이스 ③: 앞뒤 공백 trim + 한글 encodeURIComponent 인코딩
  it("앞뒤 공백 포함 한글 검색어 → trim 후 encodeURIComponent 인코딩으로 push", () => {
    const { input, onClose } = renderOpen();

    fireEvent.change(input, { target: { value: "  데님 " } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    const expected = `/search?q=${encodeURIComponent("데님")}`;
    expect(pushMock).toHaveBeenCalledWith(expected);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 케이스 ③-b: 공백만 → trim 결과 빈 문자열(0자) → 미호출
  it("공백만 입력 → trim 후 0자 → router.push 미호출", () => {
    const { input } = renderOpen();

    fireEvent.change(input, { target: { value: "   " } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    expect(pushMock).not.toHaveBeenCalled();
  });

  // 케이스 ④: isOpen=false → AnimatePresence가 children을 언마운트 → input 미렌더
  it("isOpen=false → input 미렌더", () => {
    render(<SearchOverlay isOpen={false} onClose={vi.fn()} />);

    const input = screen.queryByLabelText("Search products");
    expect(input).toBeNull();
  });
});
