export type SavedLine = {
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};
