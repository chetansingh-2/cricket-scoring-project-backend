import mongoose, { Schema, Document } from 'mongoose';
import { DeliveryType, DeliveryOutcome, WicketType } from '../types/delivery';

export interface IDelivery extends Document {
  match: string;
  innings: number;
  over: number;
  ball: number;
  batsman: string;
  bowler: string;
  nonStriker: string;
  deliveryType: DeliveryType;
  outcome: DeliveryOutcome;
  runs: number;
  isOverthrow: boolean;
  overthrowRuns?: number;
  isBoundary?: boolean;
  isSix?: boolean;
  wicket?: {
    type: WicketType;
    player: string;
    fielder?: string;
  };
  extras?: {
    wide?: number;
    noBall?: number;
    bye?: number;
    legBye?: number;
  };
  timestamp: Date;
}

const DeliverySchema: Schema = new Schema({
  match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  innings: { type: Number, required: true },
  over: { type: Number, required: true },
  ball: { type: Number, required: true },
  batsman: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  bowler: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  nonStriker: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  deliveryType: { 
    type: String, 
    enum: Object.values(DeliveryType), 
    required: true 
  },
  outcome: { 
    type: String, 
    enum: Object.values(DeliveryOutcome), 
    required: true 
  },
  runs: { type: Number, default: 0 },
  isOverthrow: { type: Boolean, default: false },
  overthrowRuns: { type: Number },
  isBoundary: { type: Boolean, default: false },
  isSix: { type: Boolean, default: false },
  wicket: {
    type: { type: String, enum: Object.values(WicketType) },
    player: { type: Schema.Types.ObjectId, ref: 'Player' },
    fielder: { type: Schema.Types.ObjectId, ref: 'Player' },
  },
  extras: {
    wide: { type: Number },
    noBall: { type: Number },
    bye: { type: Number },
    legBye: { type: Number },
  },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IDelivery>('Delivery', DeliverySchema);