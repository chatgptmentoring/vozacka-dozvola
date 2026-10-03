import type { Question, SignCard, Topic } from "./types";
import questionsJson from "./questions.json";
import signsJson from "./signs.json";
import { TOPICS } from "./topics";

export const questions = questionsJson as Question[];
export const signs = signsJson as SignCard[];

export const signQuestions = questions.filter((q) => q.topic === "signs");
export const junctionQuestions = questions.filter((q) => q.topic === "junctions");

export function questionsByTopic(topic: Topic | "all") {
  if (topic === "all") return questions;
  return questions.filter((q) => q.topic === topic);
}

export function topicCounts() {
  const counts = Object.fromEntries(TOPICS.map((t) => [t.id, 0])) as Record<Topic, number>;
  for (const q of questions) {
    const key = q.topic ?? "roads";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export const TOTAL_QUESTIONS = questions.length;
export const TOTAL_SIGNS = signs.length;
export const TOTAL_JUNCTIONS = junctionQuestions.length;

export function getQuestion(id: number) {
  return questions.find((q) => q.id === id);
}

export function getSign(id: string) {
  return signs.find((s) => s.id === id);
}
