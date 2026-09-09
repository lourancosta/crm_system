export type Snippet = {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSnippetInput = {
  name: string;
  content: string;
};

export type UpdateSnippetInput = Partial<CreateSnippetInput>;
