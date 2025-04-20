import mongoose, { Schema, Document } from 'mongoose';

export interface IMatch extends Document {
  name: string;
  venue: string;
  date: Date;
  teams: {
    team1: string;
    team2: string;
  };
  toss: {
    winner: string;
    decision: 'bat' | 'bowl';
  };
  currentInnings: number;
  overs: number;
  status: 'upcoming' | 'live' | 'completed';
  result?: {
    winner: string;
    margin: string;
  };
}

const MatchSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    venue: { type: String, required: true },
    date: { type: Date, required: true },
    teams: {
      team1: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
      team2: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    },
    toss: {
      winner: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
      decision: { type: String, enum: ['bat', 'bowl'], required: true },
    },
    currentInnings: { type: Number, required: true, default: 1 },
    overs: { type: Number, required: true },
    status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
    result: {
      winner: { type: Schema.Types.ObjectId, ref: 'Team' },
      margin: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IMatch>('Match', MatchSchema);