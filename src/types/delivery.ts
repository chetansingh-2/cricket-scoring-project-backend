export enum DeliveryType {
    NORMAL = 'normal',
    WIDE = 'wide',
    NO_BALL = 'noball',
    BYE = 'bye',
    LEG_BYE = 'legbye',
  }
  
  export enum DeliveryOutcome {
    RUN = 'run',
    WICKET = 'wicket',
    DOT = 'dot',
  }
  
  export enum WicketType {
    BOWLED = 'bowled',
    CAUGHT = 'caught',
    LBW = 'lbw',
    RUN_OUT = 'run_out',
    STUMPED = 'stumped',
    HIT_WICKET = 'hit_wicket',
    RETIRED_HURT = 'retired_hurt',
    OBSTRUCTING_FIELD = 'obstructing_field',
    TIMED_OUT = 'timed_out',
    HANDLED_BALL = 'handled_ball',
  }
  
  export interface IDeliveryPayload {
    matchId: string;
    deliveryType: DeliveryType;
    outcome: DeliveryOutcome;
    runs: number;
    isOverthrow: boolean;
    overthrowRuns?: number;
    isBoundary?: boolean;
    isSix?: boolean;
    batsmanId: string;
    bowlerId: string;
    // Add the following line
    nonStrikerId: string; 
    wicket?: {
      type: WicketType;
      playerId: string;
      fielder?: string;
    };
    extras?: {
      wide?: number;
      noBall?: number;
      bye?: number;
      legBye?: number;
    };
  }  
  export interface IScoreUpdate {
    team: {
      runs: number;
      wickets: number;
      overs: number;
      balls: number;
    };
    batsman: {
      id: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
    };
    bowler: {
      id: string;
      overs: number;
      balls: number;
      runs: number;
      wickets: number;
      maidenOvers: number;
    };
    extras: {
      wide: number;
      noBall: number;
      bye: number;
      legBye: number;
      total: number;
    };
  }