export type Lang = "en" | "mk";

export type MatchOption = {
  id: string;
  number: string;
  mk: string;
  en: string;
};

export type MatchSign = {
  id: string;
  image: string;
  correctNumber: string;
};

export type MultiAnswer = {
  id: string;
  mk: string;
  en: string;
  image: string | null;
  correct: boolean;
};

export type Topic =
  | "signs"
  | "junctions"
  | "police"
  | "lights"
  | "roads"
  | "theory"
  | "trucks"
  | "buses";

export type MatchingQuestion = {
  id: number;
  type: "matching";
  topic?: Topic;
  kind?: string;
  categories: string;
  points: number;
  promptMk: string;
  promptEn: string;
  image: string | null;
  signs: MatchSign[];
  options: MatchOption[];
};

export type MultiQuestion = {
  id: number;
  type: "multi";
  topic?: Topic;
  kind?: string;
  categories: string;
  points: number;
  promptMk: string;
  promptEn: string;
  image: string | null;
  answers: MultiAnswer[];
};

export type Question = MatchingQuestion | MultiQuestion;

export type SignCard = {
  id: string;
  image: string;
  mk: string;
  en: string;
  questionId: number;
  categories: string;
};

export function label(mk: string, en: string, lang: Lang) {
  return lang === "mk" ? mk : en;
}
