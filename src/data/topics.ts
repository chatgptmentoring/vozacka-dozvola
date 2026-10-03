import type { Topic } from "./types";

export type TopicMeta = {
  id: Topic;
  icon: "signpost" | "fork" | "shield" | "traffic" | "road" | "book" | "truck" | "bus";
  title: { en: string; mk: string };
  lead: { en: string; mk: string };
};

export const TOPICS: TopicMeta[] = [
  {
    id: "signs",
    icon: "signpost",
    title: { en: "Signs", mk: "Знаци" },
    lead: {
      en: "Match the official traffic signs to their names.",
      mk: "Поврзете ги официјалните сообраќајни знаци со називите.",
    },
  },
  {
    id: "junctions",
    icon: "fork",
    title: { en: "Who goes first", mk: "Кој минува прв" },
    lead: {
      en: "Junction diagrams — yield, passing order, turning paths.",
      mk: "Крстосници — првенство, редослед, патеки на свртување.",
    },
  },
  {
    id: "police",
    icon: "shield",
    title: { en: "Cop on the street", mk: "Полицаец" },
    lead: {
      en: "Officer signals, escorts, and emergency vehicles.",
      mk: "Знаци од полицаец, придружба и возила со првенство.",
    },
  },
  {
    id: "lights",
    icon: "traffic",
    title: { en: "Traffic lights", mk: "Семафор" },
    lead: {
      en: "Red, amber, green, arrows, and lane signals.",
      mk: "Црвено, жолто, зелено, стрелки и ленти над коловозот.",
    },
  },
  {
    id: "roads",
    icon: "road",
    title: { en: "On the road", mk: "На патот" },
    lead: {
      en: "Lanes, overtaking, pedestrians, parking, railway.",
      mk: "Ленти, престигнување, пешаци, паркирање, пруга.",
    },
  },
  {
    id: "theory",
    icon: "book",
    title: { en: "Theory", mk: "Теорија" },
    lead: {
      en: "Licence, alcohol, categories, equipment, fatigue.",
      mk: "Дозвола, алкохол, категории, опрема, замор.",
    },
  },
  {
    id: "trucks",
    icon: "truck",
    title: { en: "Trucks (C)", mk: "Товарни (Ц)" },
    lead: {
      en: "Category C — loads, tachograph, rest times, mass limits.",
      mk: "Категорија Ц — товар, тахограф, одмор, маса.",
    },
  },
  {
    id: "buses",
    icon: "bus",
    title: { en: "Buses (D)", mk: "Автобуси (Д)" },
    lead: {
      en: "Category D — passengers, stops, child groups, rest.",
      mk: "Категорија Д — патници, стојалишта, деца, одмор.",
    },
  },
];

export function topicMeta(id: Topic | undefined) {
  return TOPICS.find((t) => t.id === id) ?? TOPICS[0];
}

export function isTopic(value: unknown): value is Topic {
  return TOPICS.some((t) => t.id === value);
}
