import { Request, Response } from 'express';
import Team from '../models/Teams';
import Player from '../models/Players';

// Create a new team
export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const team = await Team.create(req.body);
    res.status(201).json({ success: true, data: team });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

// Get all teams
export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const teams = await Team.find();
    res.status(200).json({ success: true, data: teams });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

// Get a single team
export const getTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const team = await Team.findById(req.params.id).populate('players');
    
    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }
    
    res.status(200).json({ success: true, data: team });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

// Update a team
export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }
    
    res.status(200).json({ success: true, data: team });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

// Delete a team
export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }
    
    // Remove team
    await Team.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, data: {} });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};