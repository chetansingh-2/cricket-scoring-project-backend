import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  players: string[];
  captain: string;
  score: {
    runs: number;
    wickets: number;
    overs: number;
    balls: number;
  };
  extras: {
    wide: number;
    noBall: number;
    bye: number;
    legBye: number;
    total: number;
  };
}

const TeamSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    players: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    captain: { type: Schema.Types.ObjectId, ref: 'Player' },
    score: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
    },
    extras: {
      wide: { type: Number, default: 0 },
      noBall: { type: Number, default: 0 },
      bye: { type: Number, default: 0 },
      legBye: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ITeam>('Team', TeamSchema);