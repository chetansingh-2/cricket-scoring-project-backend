import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Match from '../models/Match';
import Team from '../models/Teams';
import Player from '../models/Players';
import Delivery from '../models/Delivery';
import { IDeliveryPayload } from '../types/delivery';
import scoreCalculator from '../utils/scoreCalculator';

// Define interfaces for documents to help TypeScript understand their structure
interface IPlayer {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  battingStats: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
  };
  bowlingStats: {
    overs: number;
    balls: number;
    runs: number;
    wickets: number;
    maidens: number;
  };
}

interface IDeliveryDocument {
  _id: mongoose.Types.ObjectId | string;
  match: mongoose.Types.ObjectId | string;
  innings: number;
  over: number;
  ball: number;
  batsman: mongoose.Types.ObjectId | string | IPlayer;
  bowler: mongoose.Types.ObjectId | string | IPlayer;
  nonStriker: mongoose.Types.ObjectId | string | IPlayer;
  deliveryType: string;
  outcome: string;
  runs: number;
  isOverthrow: boolean;
  overthrowRuns?: number;
  isBoundary?: boolean;
  isSix?: boolean;
  wicket?: {
    type: string;
    player: string;
    fielder?: string;
  };
  extras?: {
    wide?: number;
    noBall?: number;
    bye?: number;
    legBye?: number;
  };
}

export const addDelivery = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const deliveryData: IDeliveryPayload = req.body;
    const { matchId, batsmanId, bowlerId, nonStrikerId } = deliveryData;
    
    // Get the match details
    const match = await Match.findById(matchId).session(session);
    if (!match) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }
    
    // Get the batting team and bowling team
    const battingTeamId = match.currentInnings === 1 
      ? match.teams.team1 
      : match.teams.team2;
    
    const bowlingTeamId = match.currentInnings === 1 
      ? match.teams.team2 
      : match.teams.team1;
    
    // Get player details
    const batsman = await Player.findById(batsmanId).session(session);
    const bowler = await Player.findById(bowlerId).session(session);
    
    if (!batsman || !bowler) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    
    // Calculate the current over and ball
    const lastDelivery = await Delivery.findOne({
      match: matchId,
      innings: match.currentInnings
    })
    .sort({ over: -1, ball: -1 })
    .session(session);
    
    let currentOver = 0;
    let currentBall = 0;
    
    if (lastDelivery) {
      currentOver = lastDelivery.over;
      currentBall = lastDelivery.ball;
      
      // Check if we need to start a new over
      if (currentBall === 6 && 
          deliveryData.deliveryType !== 'wide' && 
          deliveryData.deliveryType !== 'noball') {
        currentOver += 1;
        currentBall = 1;
      } else {
        // Only increment the ball for legal deliveries
        if (deliveryData.deliveryType !== 'wide' && deliveryData.deliveryType !== 'noball') {
          currentBall += 1;
        } else {
          // For wide and no-ball, the ball number doesn't change
        }
      }
    } else {
      // First ball of the innings
      currentOver = 0;
      currentBall = 1;
    }
    
    // Calculate score updates
    const scoreUpdate = scoreCalculator.calculateScoreUpdate(deliveryData);
    
    // Update the batsman's stats
    await Player.findByIdAndUpdate(batsmanId, {
      $inc: {
        'battingStats.runs': scoreUpdate.batsman.runs,
        'battingStats.balls': scoreUpdate.batsman.balls,
        'battingStats.fours': scoreUpdate.batsman.fours,
        'battingStats.sixes': scoreUpdate.batsman.sixes
      }
    }).session(session);
    
    // Update the bowler's stats
    const bowlerUpdate: any = {
      $inc: {
        'bowlingStats.runs': scoreUpdate.bowler.runs,
        'bowlingStats.wickets': scoreUpdate.bowler.wickets
      }
    };
    
    // Only increment legal deliveries
    if (scoreUpdate.bowler.balls > 0) {
      // Calculate overs
      if ((bowler.bowlingStats.balls + scoreUpdate.bowler.balls) >= 6) {
        bowlerUpdate.$inc['bowlingStats.overs'] = 1;
        bowlerUpdate.$set = { 'bowlingStats.balls': (bowler.bowlingStats.balls + scoreUpdate.bowler.balls) % 6 };
      } else {
        bowlerUpdate.$inc['bowlingStats.balls'] = scoreUpdate.bowler.balls;
      }
    }
    
    await Player.findByIdAndUpdate(bowlerId, bowlerUpdate).session(session);
    
    // Update the batting team's stats
    const battingTeamUpdate: any = {
      $inc: {
        'score.runs': scoreUpdate.team.runs,
        'score.wickets': scoreUpdate.team.wickets,
        'extras.wide': scoreUpdate.extras.wide,
        'extras.noBall': scoreUpdate.extras.noBall,
        'extras.bye': scoreUpdate.extras.bye,
        'extras.legBye': scoreUpdate.extras.legBye,
        'extras.total': scoreUpdate.extras.total
      }
    };
    
    // Update overs and balls
    if (scoreUpdate.team.balls > 0) {
      const team = await Team.findById(battingTeamId).session(session);
      if (!team) {
        await session.abortTransaction();
        session.endSession();
        res.status(404).json({ success: false, error: 'Team not found' });
        return;
      }
      
      const totalBalls = team.score.balls + scoreUpdate.team.balls;
      if (totalBalls >= 6) {
        battingTeamUpdate.$inc['score.overs'] = Math.floor(totalBalls / 6);
        battingTeamUpdate.$set = { 'score.balls': totalBalls % 6 };
      } else {
        battingTeamUpdate.$inc['score.balls'] = scoreUpdate.team.balls;
      }
    }
    
    await Team.findByIdAndUpdate(battingTeamId, battingTeamUpdate).session(session);
    
    // Create the delivery record
    const deliveryDoc = {
      match: matchId,
      innings: match.currentInnings,
      over: currentOver,
      ball: currentBall,
      batsman: batsmanId,
      bowler: bowlerId,
      nonStriker: nonStrikerId,
      deliveryType: deliveryData.deliveryType,
      outcome: deliveryData.outcome,
      runs: deliveryData.runs,
      isOverthrow: deliveryData.isOverthrow,
      overthrowRuns: deliveryData.overthrowRuns,
      isBoundary: deliveryData.isBoundary,
      isSix: deliveryData.isSix,
      wicket: deliveryData.wicket,
      extras: deliveryData.extras,
      timestamp: new Date()
    };
    
    const delivery = await Delivery.create([deliveryDoc], { session });
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({
      success: true,
      data: {
        delivery: delivery[0],
        scoreUpdate
      }
    });
  } catch (error: unknown) {
    await session.abortTransaction();
    session.endSession();
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

export const getDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId, innings, over } = req.query;
    
    const query: any = {};
    
    if (matchId) query.match = matchId;
    if (innings) query.innings = innings;
    if (over) query.over = over;
    
    const deliveries = await Delivery.find(query)
      .populate('batsman bowler nonStriker')
      .sort({ innings: 1, over: 1, ball: 1 });
    
    res.status(200).json({ success: true, data: deliveries });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

export const removeDelivery = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const deliveryId = req.params.id;
    
    // Get the delivery
    const delivery = await Delivery.findById(deliveryId).session(session);
    if (!delivery) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ success: false, error: 'Delivery not found' });
      return;
    }
    
    // Get the match
    const match = await Match.findById(delivery.match).session(session);
    if (!match) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }
    
    // Get the batting team
    const battingTeamId = delivery.innings === 1 
      ? match.teams.team1 
      : match.teams.team2;
    
    // Get players
    const batsman = await Player.findById(delivery.batsman).session(session);
    const bowler = await Player.findById(delivery.bowler).session(session);
    
    if (!batsman || !bowler) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    
    // Calculate updates to revert
    // For batsman
    const batsmanUpdate: any = {};
    if (delivery.deliveryType === 'normal' || 
        delivery.deliveryType === 'noball') {
      batsmanUpdate.$inc = {
        'battingStats.runs': -delivery.runs,
        'battingStats.balls': delivery.deliveryType === 'noball' ? -1 : -1,
      };
      
      if (delivery.isBoundary) {
        batsmanUpdate.$inc['battingStats.fours'] = -1;
      }
      
      if (delivery.isSix) {
        batsmanUpdate.$inc['battingStats.sixes'] = -1;
      }
    } else if (delivery.deliveryType === 'bye' || 
               delivery.deliveryType === 'legbye') {
      batsmanUpdate.$inc = {
        'battingStats.balls': -1
      };
    }
    
    if (Object.keys(batsmanUpdate).length > 0) {
      await Player.findByIdAndUpdate(delivery.batsman, batsmanUpdate).session(session);
    }
    
    // For bowler
    const bowlerUpdate: any = {};
    
    // Revert runs
    if (delivery.deliveryType === 'normal') {
      bowlerUpdate.$inc = {
        'bowlingStats.runs': -delivery.runs,
        'bowlingStats.balls': -1
      };
    } else if (delivery.deliveryType === 'wide') {
      // For wide, revert the extra wide run plus any additional runs
      bowlerUpdate.$inc = {
        'bowlingStats.runs': -(1 + delivery.runs)
      };
    } else if (delivery.deliveryType === 'noball') {
      // For no-ball, revert the extra no-ball run plus any additional runs
      bowlerUpdate.$inc = {
        'bowlingStats.runs': -(1 + delivery.runs)
      };
    } else if (delivery.deliveryType === 'bye' ||
               delivery.deliveryType === 'legbye') {
      bowlerUpdate.$inc = {
        'bowlingStats.balls': -1
      };
    }
    
    // Revert wickets
    if (delivery.wicket && delivery.wicket.type !== 'run_out') {
      if (!bowlerUpdate.$inc) bowlerUpdate.$inc = {};
      bowlerUpdate.$inc['bowlingStats.wickets'] = -1;
    }
    
    // Revert overs
    if (bowlerUpdate.$inc && 'bowlingStats.balls' in bowlerUpdate.$inc) {
      if (bowler.bowlingStats.balls === 0) {
        // If we're removing the first ball of an over, decrement the over count
        bowlerUpdate.$inc['bowlingStats.overs'] = -1;
        bowlerUpdate.$set = { 'bowlingStats.balls': 5 }; // Set to 5 as we're removing 1 ball
      } else {
        // Otherwise, just decrement the ball count
      }
    }
    
    if (Object.keys(bowlerUpdate).length > 0) {
      await Player.findByIdAndUpdate(delivery.bowler, bowlerUpdate).session(session);
    }
    
    // For team
    const teamUpdate: any = {
      $inc: {}
    };
    
    // Revert runs
    teamUpdate.$inc['score.runs'] = -delivery.runs;
    
    // Revert extras
    if (delivery.extras) {
      if (delivery.extras.wide) {
        teamUpdate.$inc['extras.wide'] = -delivery.extras.wide;
        teamUpdate.$inc['extras.total'] = -delivery.extras.wide;
      }
      
      if (delivery.extras.noBall) {
        teamUpdate.$inc['extras.noBall'] = -delivery.extras.noBall;
        teamUpdate.$inc['extras.total'] = -delivery.extras.noBall;
      }
      
      if (delivery.extras.bye) {
        teamUpdate.$inc['extras.bye'] = -delivery.extras.bye;
        teamUpdate.$inc['extras.total'] = -delivery.extras.bye;
      }
      
      if (delivery.extras.legBye) {
        teamUpdate.$inc['extras.legBye'] = -delivery.extras.legBye;
        teamUpdate.$inc['extras.total'] = -delivery.extras.legBye;
      }
    }
    
    // Revert wickets
    if (delivery.wicket) {
      teamUpdate.$inc['score.wickets'] = -1;
    }
    
    // Revert balls and overs
    if (delivery.deliveryType !== 'wide' && delivery.deliveryType !== 'noball') {
      const team = await Team.findById(battingTeamId).session(session);
      if (!team) {
        await session.abortTransaction();
        session.endSession();
        res.status(404).json({ success: false, error: 'Team not found' });
        return;
      }
      
      if (team.score.balls === 0) {
        // If we're removing the first ball of an over, decrement the over count
        teamUpdate.$inc['score.overs'] = -1;
        teamUpdate.$set = { 'score.balls': 5 }; // Set to 5 as we're removing 1 ball
      } else {
        // Otherwise, just decrement the ball count
        teamUpdate.$inc['score.balls'] = -1;
      }
    }
    
    await Team.findByIdAndUpdate(battingTeamId, teamUpdate).session(session);
    
    // Delete the delivery
    await Delivery.findByIdAndDelete(deliveryId).session(session);
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({ success: true, data: {} });
  } catch (error: unknown) {
    await session.abortTransaction();
    session.endSession();
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

export const updateBattingOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId, teamId, battingOrder } = req.body;
    
    // Validate that all players belong to the team
    const team = await Team.findById(teamId).populate('players');
    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }
    
    const teamPlayerIds = team.players.map((player: any) => player._id.toString());
    const isValid = battingOrder.every((playerId: string) => 
      teamPlayerIds.includes(playerId)
    );
    
    if (!isValid) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid batting order. All players must belong to the team.' 
      });
      return;
    }
    
    // Implement the batting order logic here
    // This could be stored in a separate collection or as part of the match document
    
    res.status(200).json({ success: true, data: { battingOrder } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

export const getCurrentScorecard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;
    
    // Get the match
    const match = await Match.findById(matchId);
    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }
    
    // Get the current batting team
    const battingTeamId = match.currentInnings === 1 
      ? match.teams.team1 
      : match.teams.team2;
    
    const bowlingTeamId = match.currentInnings === 1 
      ? match.teams.team2 
      : match.teams.team1;
    
    // Get the teams with players
    const battingTeam = await Team.findById(battingTeamId).populate('players');
    const bowlingTeam = await Team.findById(bowlingTeamId).populate('players');
    
    if (!battingTeam || !bowlingTeam) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }
    
    // Get the deliveries for the current innings
    const deliveries = await Delivery.find({
      match: matchId,
      innings: match.currentInnings
    })
    .sort({ over: 1, ball: 1 })
    .populate('batsman bowler nonStriker');
    
    // Calculate current over
    let currentOver = 0;
    let currentBall = 0;
    
    if (deliveries.length > 0) {
      const lastDelivery = deliveries[deliveries.length - 1];
      currentOver = lastDelivery.over;
      currentBall = lastDelivery.ball;
    }
    
    // Find current batsmen (the last two unique batsmen)
    const uniqueBatsmen = new Set<string>();
    const recentBatsmen: IPlayer[] = [];

    for (let i = deliveries.length - 1; i >= 0 && uniqueBatsmen.size < 2; i--) {
      const delivery = deliveries[i] as IDeliveryDocument;
      
      // Handle batsman
      if (delivery.batsman) {
        let batsmanId: string;
        let batsmanObject: IPlayer | null = null;
        
        if (typeof delivery.batsman === 'string') {
          batsmanId = delivery.batsman;
          const foundBatsman = await Player.findById(batsmanId);
          if (foundBatsman) batsmanObject = foundBatsman as unknown as IPlayer;
        } else if (typeof delivery.batsman === 'object' && delivery.batsman._id) {
          batsmanId = delivery.batsman._id.toString();
          batsmanObject = delivery.batsman as IPlayer;
        } else {
          continue; // Skip if batsman is neither string nor object with _id
        }
        
        if (batsmanId && !uniqueBatsmen.has(batsmanId)) {
          uniqueBatsmen.add(batsmanId);
          if (batsmanObject) {
            recentBatsmen.push(batsmanObject);
          }
        }
      }
      
      // Handle non-striker
      if (delivery.nonStriker) {
        let nonStrikerId: string;
        let nonStrikerObject: IPlayer | null = null;
        
        if (typeof delivery.nonStriker === 'string') {
          nonStrikerId = delivery.nonStriker;
          const foundNonStriker = await Player.findById(nonStrikerId);
          if (foundNonStriker) nonStrikerObject = foundNonStriker as unknown as IPlayer;
        } else if (typeof delivery.nonStriker === 'object' && delivery.nonStriker._id) {
          nonStrikerId = delivery.nonStriker._id.toString();
          nonStrikerObject = delivery.nonStriker as IPlayer;
        } else {
          continue; // Skip if non-striker is neither string nor object with _id
        }
        
        if (nonStrikerId && !uniqueBatsmen.has(nonStrikerId)) {
          uniqueBatsmen.add(nonStrikerId);
          if (nonStrikerObject) {
            recentBatsmen.push(nonStrikerObject);
          }
        }
      }
    }
    
    // Find current bowler (the most recent one)
    let currentBowler: IPlayer | null = null;
    if (deliveries.length > 0) {
      const lastDelivery = deliveries[deliveries.length - 1] as IDeliveryDocument;
      
      if (typeof lastDelivery.bowler === 'string') {
        const foundBowler = await Player.findById(lastDelivery.bowler);
        if (foundBowler) currentBowler = foundBowler as unknown as IPlayer;
      } else if (typeof lastDelivery.bowler === 'object' && lastDelivery.bowler._id) {
        currentBowler = lastDelivery.bowler as IPlayer;
      }
    }
    
    // Calculate partnership
    let partnershipRuns = 0;
    let partnershipBalls = 0;
    
    if (recentBatsmen.length === 2) {
      // Find the last wicket delivery
      const lastWicketDelivery = deliveries
        .filter(d => d.wicket && d.wicket.type)
        .pop();
      
      if (lastWicketDelivery) {
        // Calculate partnership since the last wicket
        const partnershipDeliveries = deliveries.filter(d => 
          d.over > lastWicketDelivery.over || 
          (d.over === lastWicketDelivery.over && d.ball > lastWicketDelivery.ball)
        );
        
        partnershipRuns = partnershipDeliveries.reduce((total, d) => total + d.runs, 0);
        partnershipBalls = partnershipDeliveries.filter(d => 
          d.deliveryType !== 'wide' && d.deliveryType !== 'noball'
        ).length;
      } else {
        // If no wicket yet, partnership is the entire innings
        partnershipRuns = deliveries.reduce((total, d) => total + d.runs, 0);
        partnershipBalls = deliveries.filter(d => 
          d.deliveryType !== 'wide' && d.deliveryType !== 'noball'
        ).length;
      }
    }
    
    // Format the response
    const scorecard = {
      match: {
        id: match._id,
        name: match.name,
        overs: match.overs,
        currentInnings: match.currentInnings,
        status: match.status
      },
      battingTeam: {
        id: battingTeam._id,
        name: battingTeam.name,
        score: battingTeam.score,
        extras: battingTeam.extras
      },
      bowlingTeam: {
        id: bowlingTeam._id,
        name: bowlingTeam.name
      },
      currentOver: currentOver,
      currentBall: currentBall,
      currentBatsmen: recentBatsmen.map(batsman => ({
        id: batsman._id,
        name: batsman.name,
        stats: batsman.battingStats
      })),
      currentBowler: currentBowler ? {
        id: currentBowler._id,
        name: currentBowler.name,
        stats: currentBowler.bowlingStats
      } : null,
      partnership: {
        runs: partnershipRuns,
        balls: partnershipBalls
      },
      // Recent deliveries (last over)
      recentDeliveries: deliveries
        .filter(d => d.over === currentOver)
        .map(d => ({
          ball: d.ball,
          type: d.deliveryType,
          runs: d.runs,
          extras: d.extras,
          wicket: d.wicket
        }))
    };
    
    res.status(200).json({ success: true, data: scorecard });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};