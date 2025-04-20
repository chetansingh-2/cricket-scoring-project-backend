import { Request, Response } from 'express';
import Player from '../models/Players';
import Team from '../models/Teams';

// Create a new player
export const createPlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { team, ...playerData } = req.body;
    
    // Check if team exists
    const teamExists = await Team.findById(team);
    if (!teamExists) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }
    
    // Create player
    const player = await Player.create(req.body);
    
    // Add player to team's players array if not already there
    await Team.findByIdAndUpdate(
      team,
      { $addToSet: { players: player._id } }
    );
    
    res.status(201).json({ success: true, data: player });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

// Get all players (with optional team filter)
export const getPlayers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { team } = req.query;
    const filter: any = {};
    
    if (team) {
      filter.team = team;
    }
    
    const players = await Player.find(filter).populate('team', 'name');
    res.status(200).json({ success: true, data: players });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

// Get a single player
export const getPlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const player = await Player.findById(req.params.id).populate('team', 'name');
    
    if (!player) {
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    
    res.status(200).json({ success: true, data: player });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

// Update a player
export const updatePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get player before update to check if team is changing
    const oldPlayer = await Player.findById(req.params.id);
    if (!oldPlayer) {
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    
    const { team: newTeamId } = req.body;
    const oldTeamId = oldPlayer.team;
    
    // Update player
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    // If team is changing, update team references
    if (newTeamId && newTeamId !== oldTeamId.toString()) {
      // Remove player from old team
      await Team.findByIdAndUpdate(
        oldTeamId,
        { $pull: { players: oldPlayer._id } }
      );
      
      // Add player to new team
      await Team.findByIdAndUpdate(
        newTeamId,
        { $addToSet: { players: oldPlayer._id } }
      );
    }
    
    res.status(200).json({ success: true, data: player });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};

// Delete a player
export const deletePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const player = await Player.findById(req.params.id);
    
    if (!player) {
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    
    // Remove player from team
    await Team.findByIdAndUpdate(
      player.team,
      { $pull: { players: player._id } }
    );
    
    // Delete player
    await Player.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, data: {} });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
};