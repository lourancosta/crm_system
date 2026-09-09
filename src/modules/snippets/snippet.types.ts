export type Snippet = {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSnippetInput = {
  name: string;
  content: string;
};

export type UpdateSnippetInput = Partial<CreateSnippetInput>;
