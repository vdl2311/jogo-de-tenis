export type CourtSurface = 'HARD_COURT' | 'CLAY' | 'GRASS';

export type GameState = 
  | 'MENU'
  | 'CALIBRATION'
  | 'PLAYING'
  | 'POINT_ENDED'
  | 'GAME_WON'
  | 'MATCH_WON';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type GestureType = 'IDLE' | 'FOREHAND' | 'BACKHAND' | 'SERVE_TOSS' | 'SERVE_HIT' | 'SMASH';

export interface MotionData {
  playerX: number; // -1 (left) to 1 (right)
  playerZ: number; // -1 (net) to 1 (baseline)
  detectedGesture: GestureType;
  gestureSpeed: number; // 0 to 1
  motionIntensity: number; // 0 to 1
  isServingGesture: boolean;
  isSmashGesture: boolean;
  lastGestureTime: number;
}

export interface TennisScore {
  playerPoints: number; // 0, 1, 2, 3 (0, 15, 30, 40)
  opponentPoints: number;
  playerGames: number;
  opponentGames: number;
  playerSets: number;
  opponentSets: number;
  isDeuce: boolean;
  advantage: 'player' | 'opponent' | null;
  server: 'player' | 'opponent';
  serveFaultCount: number; // 0: 1st serve, 1: 2nd serve
}

export interface MatchStats {
  aces: number;
  winners: number;
  swingsCount: number;
  caloriesBurned: number;
  maxRally: number;
  currentRally: number;
  matchDurationSec: number;
}
