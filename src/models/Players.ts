import mongoose, { Schema, Document } from 'mongoose';

export interface IBattingStats {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  notOut: boolean;
}

export interface IBowlingStats {
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
}

export interface IPlayer extends Document {
  name: string;
  team: string;
  battingStats: IBattingStats;
  bowlingStats: IBowlingStats;
}

const PlayerSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    battingStats: {
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      notOut: { type: Boolean, default: true },
    },
    bowlingStats: {
      overs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPlayer>('Player', PlayerSchema);