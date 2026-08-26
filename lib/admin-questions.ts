import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminQuestionPage, AdminQuestionStatus } from "@/types/admin-questions";

export type AdminQuestionQuery = {
  readonly status: AdminQuestionStatus;
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_PAGE = 100;
const MAX_QUERY_LENGTH = 100;

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStatus(value: string | null): AdminQuestionStatus {
  if (value === "answered" || value === "all" || value === "unanswered") return value;
  return "unanswered";
}

export function parseAdminQuestionQuery(searchParams: URLSearchParams): AdminQuestionQuery {
  return {
    status: parseStatus(searchParams.get("status")),
    query: (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    page: Math.min(parsePositiveInteger(searchParams.get("page"), 1), MAX_PAGE),
    pageSize: Math.min(parsePositiveInteger(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
  };
}

function buildQuestionWhere(input: AdminQuestionQuery): Prisma.QuestionWhereInput {
  const statusFilter = input.status === "unanswered"
    ? { answers: { none: {} } }
    : input.status === "answered"
      ? { answers: { some: {} } }
      : {};
  const searchFilter = input.query.length === 0
    ? {}
    : {
        OR: [
          { content: { contains: input.query, mode: "insensitive" as const } },
          { user: { is: { name: { contains: input.query, mode: "insensitive" as const } } } },
          { product: { is: { name: { contains: input.query, mode: "insensitive" as const } } } },
          { product: { is: { brand: { contains: input.query, mode: "insensitive" as const } } } },
        ],
      };
  return { ...statusFilter, ...searchFilter };
}

export async function listAdminQuestions(input: AdminQuestionQuery): Promise<AdminQuestionPage> {
  const where = buildQuestionWhere(input);
  const [rows, total] = await prisma.$transaction([
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true } },
        product: { select: { id: true, name: true, brand: true, imageUrl: true, isActive: true } },
        answers: {
          orderBy: { createdAt: "asc" },
          select: { id: true, content: true, createdAt: true, updatedAt: true, user: { select: { name: true } } },
        },
      },
    }),
    prisma.question.count({ where }),
  ]);
  const items = rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customerName: row.user.name,
    product: row.product,
    answers: row.answers.map((answer) => ({
      id: answer.id,
      content: answer.content,
      createdAt: answer.createdAt.toISOString(),
      updatedAt: answer.updatedAt.toISOString(),
      authorName: answer.user.name,
    })),
  }));
  return { items, total, page: input.page, pageSize: input.pageSize, hasMore: input.page * input.pageSize < total };
}
