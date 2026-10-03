export type Dir = "N" | "E" | "S" | "W";
export type Turn = "left" | "straight" | "right";
export type SignKind = "none" | "yield" | "stop" | "priority" | "lights";
export type LightKind = "off" | "green" | "red" | "amber-flash";
export type ActorKind = "car" | "van" | "bus" | "ambulance" | "police" | "moped";
export type Phase =
  | "menu"
  | "brief"
  | "drive"
  | "pass"
  | "fail"
  | "complete";

export type NpcSpec = {
  from: Dir;
  turn: Turn;
  order: number;
  label: string;
  kind: ActorKind;
  color: string;
};

export type Scenario = {
  id: string;
  titleEn: string;
  titleMk: string;
  briefEn: string;
  briefMk: string;
  ruleEn: string;
  ruleMk: string;
  playerTurn: Turn;
  playerOrder: number;
  mustStop: boolean;
  sign: SignKind;
  light: LightKind;
  zebra: boolean;
  pedestrian: boolean;
  npcs: NpcSpec[];
};

export type Hud = {
  phase: Phase;
  index: number;
  total: number;
  score: number;
  speed: number;
  heading: number;
  coachEn: string;
  coachMk: string;
  failEn: string;
  failMk: string;
  waiting: boolean;
  yourTurn: boolean;
};
