import type { LearningStatus } from "./api";

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const LEARNING_STATUS_LABELS: Record<LearningStatus, string> = {
  WANT_TO_LEARN: "Quiero aprender",
  NOT_INTERESTED: "No me interesa",
  LEARNED: "Ya la aprendí",
};
