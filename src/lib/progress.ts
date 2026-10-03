import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/data/types";

export type QuestionResult = {
  correct: boolean;
  seen: number;
  right: number;
  wrong: number;
};

export type SignResult = {
  seen: number;
  right: number;
  wrong: number;
};

export type ExamRecord = {
  at: number;
  correct: number;
  total: number;
  points: number;
  maxPoints: number;
};

export type DriveRecord = {
  at: number;
  correct: number;
  total: number;
};

type ProgressState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  questionStats: Record<string, QuestionResult>;
  signStats: Record<string, SignResult>;
  exams: ExamRecord[];
  drives: DriveRecord[];
  lastPracticeId: number;
  lastJunctionId: number;
  lastByTopic: Record<string, number>;
  recordQuestion: (id: number, correct: boolean) => void;
  recordSign: (id: string, correct: boolean) => void;
  recordExam: (exam: Omit<ExamRecord, "at">) => void;
  recordDrive: (drive: Omit<DriveRecord, "at">) => void;
  setLastPracticeId: (id: number) => void;
  setLastJunctionId: (id: number) => void;
  setLastForTopic: (topic: string, id: number) => void;
  reset: () => void;
};

const emptyQuestion = (): QuestionResult => ({
  correct: false,
  seen: 0,
  right: 0,
  wrong: 0,
});

const emptySign = (): SignResult => ({ seen: 0, right: 0, wrong: 0 });

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
      questionStats: {},
      signStats: {},
      exams: [],
      drives: [],
      lastPracticeId: 1,
      lastJunctionId: 163,
      lastByTopic: {},
      recordQuestion: (id, correct) =>
        set((state) => {
          const key = String(id);
          const prev = state.questionStats[key] ?? emptyQuestion();
          return {
            questionStats: {
              ...state.questionStats,
              [key]: {
                correct,
                seen: prev.seen + 1,
                right: prev.right + (correct ? 1 : 0),
                wrong: prev.wrong + (correct ? 0 : 1),
              },
            },
          };
        }),
      recordSign: (id, correct) =>
        set((state) => {
          const prev = state.signStats[id] ?? emptySign();
          return {
            signStats: {
              ...state.signStats,
              [id]: {
                seen: prev.seen + 1,
                right: prev.right + (correct ? 1 : 0),
                wrong: prev.wrong + (correct ? 0 : 1),
              },
            },
          };
        }),
      recordExam: (exam) =>
        set((state) => ({
          exams: [{ ...exam, at: Date.now() }, ...state.exams].slice(0, 12),
        })),
      recordDrive: (drive) =>
        set((state) => ({
          drives: [{ ...drive, at: Date.now() }, ...state.drives].slice(0, 12),
        })),
      setLastPracticeId: (id) => set({ lastPracticeId: id }),
      setLastJunctionId: (id) => set({ lastJunctionId: id }),
      setLastForTopic: (topic, id) =>
        set((state) => ({ lastByTopic: { ...state.lastByTopic, [topic]: id } })),
      reset: () =>
        set({
          questionStats: {},
          signStats: {},
          exams: [],
          drives: [],
          lastPracticeId: 1,
          lastJunctionId: 163,
          lastByTopic: {},
        }),
    }),
    { name: "vozacka-progress-v1", skipHydration: true },
  ),
);
