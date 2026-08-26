export type AdminQuestionStatus = "unanswered" | "answered" | "all";

export type AdminQuestionAnswer = {
  readonly id: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly authorName: string;
};

export type AdminQuestionItem = {
  readonly id: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly customerName: string;
  readonly product: {
    readonly id: string;
    readonly name: string;
    readonly brand: string;
    readonly imageUrl: string;
    readonly isActive: boolean;
  };
  readonly answers: readonly AdminQuestionAnswer[];
};

export type AdminQuestionPage = {
  readonly items: readonly AdminQuestionItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
};
