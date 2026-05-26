export interface RadarStat {
  name: string;
  value: number;
}

export interface Character {
  id: string;
  name: string;
  tags: string;
  race: string;
  gender: string;
  age: string;
  height: string;
  weight: string;
  orientation: string;
  spouse: string;
  themeColor: string;
  hairColor: string;
  eyeColor: string;
  backstory: string;
  temperature: string;
  strength: string;
  dominantHand: string;
  eyesight: string;
  healthStatus: string;
  physicalNotes: string;
  personality: string;
  mbti: string;
  likes: string;
  dislikes: string;
  strengths: string;
  habits: string;
  catchphrase: string;
  imageUrl: string;
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  isImported?: boolean;
  isNPC?: boolean;
  radarStats: RadarStat[];
}

export interface CanvasNode {
  id: string;
  charId: string;
  x: number;
  y: number;
  customNote?: string;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  color: string;
}

export interface CPEntity {
  id: string;
  charAId: string;
  charBId: string;
  charAName?: string;
  charBName?: string;
  relation: string;
  type: string;
  color: string;
}

export interface AppSettings {
  themeMode: 'dark' | 'light';
  fontFamily: string;
  fontSize: number;
  titleColor: string;
  subtitleColor: string;
  contentColor: string;
}
