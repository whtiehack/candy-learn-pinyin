export enum PinyinCategory {
  INITIALS = 'initials',
  FINALS = 'finals',
  OVERALL = 'overall',
}

export interface PinyinChar {
  char: string;
  category: PinyinCategory;
  example?: string; // e.g., 'b' -> 'ba'
}

export enum GameState {
  MENU = 'menu',
  LEARNING = 'learning',
  QUIZ = 'quiz',
}