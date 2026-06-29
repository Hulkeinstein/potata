"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Pencil, Trash2, MessageSquare } from "lucide-react";
import type { QuestionListResponse } from "@/types";

interface QASectionProps {
  productId: string;
}

export function QASection({ productId }: QASectionProps) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user?.id;

  // 목록 상태
  const [data, setData] = useState<QuestionListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 질문 작성 폼 상태
  const [asking, setAsking] = useState(false);
  const [questionContent, setQuestionContent] = useState("");

  // 질문 수정 상태
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionContent, setEditQuestionContent] = useState("");

  // 답변 작성 폼 상태 (questionId 기준)
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [answerContent, setAnswerContent] = useState("");

  // 답변 수정 상태
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerContent, setEditAnswerContent] = useState("");

  // 전송 상태
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // 서버 응답 기반 admin 판정 — 클라에서 isAdmin 직접 호출 금지
  const viewerIsAdmin = data?.viewerIsAdmin ?? false;

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/questions`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data as QuestionListResponse);
      }
    } catch {
      // 로드 실패는 조용히 처리 — 빈 상태로 렌더
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // 질문 작성
  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!questionContent.trim()) {
      setFormError("질문 내용을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: questionContent }),
      });
      const json = await res.json();
      if (res.status === 401) {
        setFormError("문의를 작성하려면 로그인이 필요합니다.");
        return;
      }
      if (!json.success) {
        setFormError(json.error ?? "질문 제출에 실패했습니다.");
        return;
      }
      setQuestionContent("");
      setAsking(false);
      setNotice("문의가 등록되었습니다.");
      await loadQuestions();
    } catch {
      setFormError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 질문 수정
  const handleQuestionEditSubmit = async (e: React.FormEvent, questionId: string) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!editQuestionContent.trim()) {
      setFormError("질문 내용을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editQuestionContent }),
      });
      const json = await res.json();
      if (res.status === 401) {
        setFormError("로그인이 필요합니다.");
        return;
      }
      if (res.status === 403) {
        setFormError("본인의 문의만 수정할 수 있습니다.");
        return;
      }
      if (!json.success) {
        setFormError(json.error ?? "수정에 실패했습니다.");
        return;
      }
      setEditingQuestionId(null);
      setEditQuestionContent("");
      setNotice("문의가 수정되었습니다.");
      await loadQuestions();
    } catch {
      setFormError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 질문 삭제
  const handleQuestionDelete = async (questionId: string) => {
    if (!confirm("문의를 삭제하시겠습니까?")) return;
    setFormError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/questions/${questionId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.status === 401) {
        setFormError("로그인이 필요합니다.");
        return;
      }
      if (res.status === 403) {
        setFormError("삭제 권한이 없습니다.");
        return;
      }
      if (!json.success) {
        setFormError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      setNotice("문의가 삭제되었습니다.");
      await loadQuestions();
    } catch {
      setFormError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 답변 작성
  const handleAnswerSubmit = async (e: React.FormEvent, questionId: string) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!answerContent.trim()) {
      setFormError("답변 내용을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/products/${productId}/questions/${questionId}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: answerContent }),
        },
      );
      const json = await res.json();
      if (res.status === 401) {
        setFormError("로그인이 필요합니다.");
        return;
      }
      if (res.status === 403) {
        setFormError("관리자만 답변을 작성할 수 있습니다.");
        return;
      }
      if (!json.success) {
        setFormError(json.error ?? "답변 제출에 실패했습니다.");
        return;
      }
      setAnsweringQuestionId(null);
      setAnswerContent("");
      setNotice("답변이 등록되었습니다.");
      await loadQuestions();
    } catch {
      setFormError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 답변 수정
  const handleAnswerEditSubmit = async (
    e: React.FormEvent,
    questionId: string,
    answerId: string,
  ) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!editAnswerContent.trim()) {
      setFormError("답변 내용을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/products/${productId}/questions/${questionId}/answers/${answerId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editAnswerContent }),
        },
      );
      const json = await res.json();
      if (res.status === 401) {
        setFormError("로그인이 필요합니다.");
        return;
      }
      if (res.status === 403) {
        setFormError("관리자만 답변을 수정할 수 있습니다.");
        return;
      }
      if (!json.success) {
        setFormError(json.error ?? "수정에 실패했습니다.");
        return;
      }
      setEditingAnswerId(null);
      setEditAnswerContent("");
      setNotice("답변이 수정되었습니다.");
      await loadQuestions();
    } catch {
      setFormError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 답변 삭제
  const handleAnswerDelete = async (questionId: string, answerId: string) => {
    if (!confirm("답변을 삭제하시겠습니까?")) return;
    setFormError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/products/${productId}/questions/${questionId}/answers/${answerId}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (res.status === 401) {
        setFormError("로그인이 필요합니다.");
        return;
      }
      if (res.status === 403) {
        setFormError("관리자만 답변을 삭제할 수 있습니다.");
        return;
      }
      if (!json.success) {
        setFormError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      setNotice("답변이 삭제되었습니다.");
      await loadQuestions();
    } catch {
      setFormError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-4 space-y-6">
      {/* 헤더 — Q&A 타이틀 + 문의 수 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Q&amp;A</h3>
        {data && data.questionCount > 0 && (
          <span className="text-zinc-400 text-sm">{data.questionCount}개 문의</span>
        )}
      </div>

      {/* 전역 알림/에러 */}
      {notice && (
        <p className="text-sm text-brand-neon">{notice}</p>
      )}
      {formError && !asking && editingQuestionId === null && answeringQuestionId === null && editingAnswerId === null && (
        <p className="text-sm text-red-400">{formError}</p>
      )}

      {/* 로그인 상태 — 문의하기 버튼 또는 폼 */}
      {isLoggedIn ? (
        <>
          {/* 문의 작성 트리거 — 폼 닫혀 있을 때만 */}
          {!asking && (
            <button
              type="button"
              onClick={() => {
                setQuestionContent("");
                setFormError(null);
                setNotice(null);
                setAsking(true);
              }}
              className="px-5 py-2 rounded-full bg-brand-neon text-black text-sm font-medium hover:opacity-90 transition-opacity"
            >
              문의하기
            </button>
          )}

          {/* 질문 작성 폼 */}
          {asking && (
            <form
              onSubmit={handleAskSubmit}
              className="bg-zinc-900/30 border border-white/10 rounded-xl p-5 space-y-4"
            >
              <p className="text-sm font-medium text-zinc-300">문의 작성</p>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400" htmlFor="question-content">
                  질문 내용 * (최대 2000자)
                </label>
                <textarea
                  id="question-content"
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="상품에 대해 궁금한 점을 남겨 주세요."
                  className="w-full bg-zinc-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-brand-neon/50 transition-colors"
                />
                <p className="text-right text-xs text-zinc-600">
                  {questionContent.length}/2000
                </p>
              </div>
              {formError && asking && (
                <p className="text-sm text-red-400">{formError}</p>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-full bg-brand-neon text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? "제출 중..." : "문의 등록"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAsking(false);
                    setQuestionContent("");
                    setFormError(null);
                  }}
                  className="px-5 py-2 rounded-full border border-white/15 text-zinc-400 text-sm hover:text-zinc-200 hover:border-white/30 transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        status !== "loading" && (
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl px-5 py-4 text-sm text-zinc-400">
            문의를 작성하려면{" "}
            <a href="/login" className="text-brand-neon hover:underline">
              로그인
            </a>
            이 필요합니다.
          </div>
        )
      )}

      {/* 질문 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-zinc-900/30 animate-pulse"
            />
          ))}
        </div>
      ) : data && data.questions.length > 0 ? (
        <ul className="space-y-4">
          {data.questions.map((question) => {
            const isMyQuestion =
              isLoggedIn && session?.user?.id === question.userId;
            const isEditingThisQuestion = editingQuestionId === question.id;
            const isAnsweringThisQuestion = answeringQuestionId === question.id;

            return (
              <li
                key={question.id}
                className="bg-zinc-900/20 border border-white/5 rounded-xl p-4 space-y-3"
              >
                {/* 질문 헤더 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-200">
                      {question.userName || "익명"}
                    </span>
                    {isMyQuestion && (
                      <span className="text-xs text-brand-neon border border-brand-neon/30 rounded-full px-2 py-0.5 leading-none">
                        내 문의
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* 본인 질문 — 수정/삭제 버튼 (클라는 본인 버튼만 노출) */}
                    {isMyQuestion && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestionId(question.id);
                            setEditQuestionContent(question.content);
                            setFormError(null);
                            setNotice(null);
                          }}
                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                          aria-label="문의 수정"
                        >
                          <Pencil className="w-3 h-3" />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuestionDelete(question.id)}
                          disabled={submitting}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                          aria-label="문의 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                          삭제
                        </button>
                      </>
                    )}
                    <span className="text-xs text-zinc-600">
                      {new Date(question.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>

                {/* 질문 수정 폼 */}
                {isEditingThisQuestion ? (
                  <form
                    onSubmit={(e) => handleQuestionEditSubmit(e, question.id)}
                    className="space-y-3"
                  >
                    <textarea
                      value={editQuestionContent}
                      onChange={(e) => setEditQuestionContent(e.target.value)}
                      maxLength={2000}
                      rows={3}
                      className="w-full bg-zinc-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-brand-neon/50 transition-colors"
                    />
                    {formError && isEditingThisQuestion && (
                      <p className="text-sm text-red-400">{formError}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-1.5 rounded-full bg-brand-neon text-black text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {submitting ? "저장 중..." : "수정 완료"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestionId(null);
                          setEditQuestionContent("");
                          setFormError(null);
                        }}
                        className="px-4 py-1.5 rounded-full border border-white/15 text-zinc-400 text-xs hover:text-zinc-200 hover:border-white/30 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {question.content}
                  </p>
                )}

                {/* 답변 목록 (중첩, 들여쓰기 카드) */}
                {question.answers.length > 0 && (
                  <ul className="space-y-2 pl-4 border-l-2 border-brand-neon/20">
                    {question.answers.map((answer) => {
                      const isEditingThisAnswer = editingAnswerId === answer.id;

                      return (
                        <li
                          key={answer.id}
                          className="bg-zinc-900/30 border border-white/5 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-200">
                                {answer.userName || "관리자"}
                              </span>
                              {/* 관리자 답변 배지 */}
                              <span className="text-xs text-brand-neon border border-brand-neon/30 rounded-full px-2 py-0.5 leading-none">
                                판매자
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* admin — 답변 수정/삭제 버튼 */}
                              {viewerIsAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAnswerId(answer.id);
                                      setEditAnswerContent(answer.content);
                                      setFormError(null);
                                      setNotice(null);
                                    }}
                                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                                    aria-label="답변 수정"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    수정
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAnswerDelete(question.id, answer.id)
                                    }
                                    disabled={submitting}
                                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                    aria-label="답변 삭제"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    삭제
                                  </button>
                                </>
                              )}
                              <span className="text-xs text-zinc-600">
                                {new Date(answer.createdAt).toLocaleDateString("ko-KR")}
                              </span>
                            </div>
                          </div>

                          {/* 답변 수정 폼 */}
                          {isEditingThisAnswer ? (
                            <form
                              onSubmit={(e) =>
                                handleAnswerEditSubmit(e, question.id, answer.id)
                              }
                              className="space-y-2"
                            >
                              <textarea
                                value={editAnswerContent}
                                onChange={(e) => setEditAnswerContent(e.target.value)}
                                maxLength={2000}
                                rows={3}
                                className="w-full bg-zinc-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-brand-neon/50 transition-colors"
                              />
                              {formError && isEditingThisAnswer && (
                                <p className="text-sm text-red-400">{formError}</p>
                              )}
                              <div className="flex items-center gap-3">
                                <button
                                  type="submit"
                                  disabled={submitting}
                                  className="px-5 py-1.5 rounded-full bg-brand-neon text-black text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                  {submitting ? "저장 중..." : "수정 완료"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAnswerId(null);
                                    setEditAnswerContent("");
                                    setFormError(null);
                                  }}
                                  className="px-4 py-1.5 rounded-full border border-white/15 text-zinc-400 text-xs hover:text-zinc-200 hover:border-white/30 transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                              {answer.content}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* admin — 답변 작성 트리거 + 폼 */}
                {viewerIsAdmin && (
                  <>
                    {!isAnsweringThisQuestion ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAnsweringQuestionId(question.id);
                          setAnswerContent("");
                          setFormError(null);
                          setNotice(null);
                        }}
                        className="text-xs text-zinc-400 hover:text-brand-neon transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        답변하기
                      </button>
                    ) : (
                      <form
                        onSubmit={(e) => handleAnswerSubmit(e, question.id)}
                        className="space-y-2 pl-4 border-l-2 border-brand-neon/20"
                      >
                        <p className="text-xs text-zinc-400">답변 작성</p>
                        <textarea
                          value={answerContent}
                          onChange={(e) => setAnswerContent(e.target.value)}
                          maxLength={2000}
                          rows={3}
                          placeholder="고객 문의에 대한 답변을 입력해 주세요."
                          className="w-full bg-zinc-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-brand-neon/50 transition-colors"
                        />
                        {formError && isAnsweringThisQuestion && (
                          <p className="text-sm text-red-400">{formError}</p>
                        )}
                        <div className="flex items-center gap-3">
                          <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-1.5 rounded-full bg-brand-neon text-black text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {submitting ? "제출 중..." : "답변 등록"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnsweringQuestionId(null);
                              setAnswerContent("");
                              setFormError(null);
                            }}
                            className="px-4 py-1.5 rounded-full border border-white/15 text-zinc-400 text-xs hover:text-zinc-200 hover:border-white/30 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        /* 빈 상태 */
        <div className="py-20 flex flex-col items-center justify-center text-center gap-3 bg-zinc-900/20 rounded-xl border border-white/5">
          <MessageSquare className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-400 font-medium">아직 문의가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
