import { Request, Response } from 'express';
import Match from '../models/Match';
import Team from '../models/Teams';
import Player from '../models/Players';

export const createMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, venue, date, teams, toss, overs } = req.body;
    
    const match = await Match.create({
      name,
      venue,
      date,
      teams,
      toss,
      overs,
      status: 'upcoming'
    });
    
    res.status(201).json({ success: true, data: match });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

export const getMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const matches = await Match.find()
      .populate('teams.team1 teams.team2 toss.winner')
      .sort({ date: -1 });
    
    res.status(200).json({ success: true, data: matches });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

export const getMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.findById(req.params.id)
      .populate({
        path: 'teams.team1 teams.team2',
        populate: {
          path: 'players',
          model: 'Player'
        }
      })
      .populate('toss.winner');
    
    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }
    
    res.status(200).json({ success: true, data: match });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

export const updateMatchStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }
    
    res.status(200).json({ success: true, data: match });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

export const updateMatchResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { result } = req.body;
    
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { result, status: 'completed' },
      { new: true, runValidators: true }
    );
    
    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }
    
    res.status(200).json({ success: true, data: match });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};