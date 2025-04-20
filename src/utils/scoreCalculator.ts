import { IDeliveryPayload, IScoreUpdate } from '../types/delivery';

class ScoreCalculator {
  /**
   * Calculate score updates based on the delivery
   */
  calculateScoreUpdate(delivery: IDeliveryPayload): IScoreUpdate {
    // Initialize the score update object
    const scoreUpdate: IScoreUpdate = {
      team: { runs: 0, wickets: 0, overs: 0, balls: 1 },  // Always increment by 1 ball by default
      batsman: { id: delivery.batsmanId, runs: 0, balls: 0, fours: 0, sixes: 0 },
      bowler: { id: delivery.bowlerId, overs: 0, balls: 0, runs: 0, wickets: 0, maidenOvers: 0 },
      extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, total: 0 }
    };

    // Calculate total runs
    let totalRuns = delivery.runs;
    
    // Add overthrow runs if applicable
    if (delivery.isOverthrow && delivery.overthrowRuns) {
      totalRuns += delivery.overthrowRuns;
    }

    // Handle different delivery types
    switch (delivery.deliveryType) {
      case 'normal':
        this.handleNormalDelivery(delivery, scoreUpdate, totalRuns);
        break;
      case 'wide':
        this.handleWideDelivery(delivery, scoreUpdate, totalRuns);
        break;
      case 'noball':
        this.handleNoBallDelivery(delivery, scoreUpdate, totalRuns);
        break;
      case 'bye':
        this.handleByeDelivery(delivery, scoreUpdate, totalRuns);
        break;
      case 'legbye':
        this.handleLegByeDelivery(delivery, scoreUpdate, totalRuns);
        break;
    }

    // Handle wicket
    if (delivery.wicket) {
      scoreUpdate.team.wickets += 1;
      scoreUpdate.bowler.wickets += 1;
      
      // Except for run-out, the bowler gets credit for the wicket
      if (delivery.wicket.type !== 'run_out') {
        scoreUpdate.bowler.wickets += 1;
      }
    }

    // Handle boundary
    if (delivery.isBoundary) {
      scoreUpdate.batsman.fours += 1;
    }

    // Handle six
    if (delivery.isSix) {
      scoreUpdate.batsman.sixes += 1;
    }

    // Calculate total extras
    scoreUpdate.extras.total = 
      scoreUpdate.extras.wide + 
      scoreUpdate.extras.noBall + 
      scoreUpdate.extras.bye + 
      scoreUpdate.extras.legBye;

    return scoreUpdate;
  }

  /**
   * Handle normal delivery
   */
  private handleNormalDelivery(
    delivery: IDeliveryPayload, 
    scoreUpdate: IScoreUpdate, 
    totalRuns: number
  ): void {
    // Update batsman stats
    scoreUpdate.batsman.runs += totalRuns;
    scoreUpdate.batsman.balls += 1;

    // Update bowler stats
    scoreUpdate.bowler.runs += totalRuns;
    scoreUpdate.bowler.balls += 1;

    // Update team stats
    scoreUpdate.team.runs += totalRuns;
    scoreUpdate.team.balls += 1;
  }

  /**
   * Handle wide delivery
   * For Wide + runs:
   * - No balls increase.
   * - 1 run conceded in bowler data.
   * - All runs are added to the team data.
   * - No runs are credited to the batsman.
   * - Wide extra includes all runs.
   */
  private handleWideDelivery(
    delivery: IDeliveryPayload, 
    scoreUpdate: IScoreUpdate, 
    totalRuns: number
  ): void {
    // For wides, the ball is not counted as a legal delivery
    scoreUpdate.team.balls = 0;

    // Default wide is 1 run, plus any additional runs
    const wideRuns = 1 + (totalRuns - 1);
    
    // Update extras
    scoreUpdate.extras.wide += wideRuns;

    // Update bowler stats - wides count against the bowler
    scoreUpdate.bowler.runs += wideRuns;
    
    // Wide is not a legal delivery, so don't increment bowler's balls
    scoreUpdate.bowler.balls = 0;

    // Update team stats
    scoreUpdate.team.runs += wideRuns;

    // Batsman doesn't get credit for wide runs and doesn't face a ball
    scoreUpdate.batsman.balls = 0;
  }

  /**
   * Handle no-ball delivery
   */
  private handleNoBallDelivery(
    delivery: IDeliveryPayload, 
    scoreUpdate: IScoreUpdate, 
    totalRuns: number
  ): void {
    // For no-balls, the ball is not counted as a legal delivery
    scoreUpdate.team.balls = 0;

    // Default no-ball is 1 run, plus any additional runs
    const noBallPenalty = 1;
    const additionalRuns = totalRuns - 1;
    
    // Update extras
    scoreUpdate.extras.noBall += noBallPenalty;

    // Update bowler stats
    scoreUpdate.bowler.runs += noBallPenalty;
    
    // No ball is not a legal delivery, so don't increment bowler's balls
    scoreUpdate.bowler.balls = 0;

    // Update team stats - both the penalty and any runs scored
    scoreUpdate.team.runs += totalRuns;

    // Handle batsman stats for no-ball
    if (delivery.extras?.bye || delivery.extras?.legBye) {
      // If it's a bye or leg-bye off a no-ball
      scoreUpdate.batsman.balls += 1;  // Batsman faces the ball
      
      // Batsman doesn't get credit for bye/leg-bye runs
      if (delivery.extras.bye) {
        scoreUpdate.extras.bye += additionalRuns;
      } else if (delivery.extras.legBye) {
        scoreUpdate.extras.legBye += additionalRuns;
      }
    } else {
      // Regular no-ball with runs
      scoreUpdate.batsman.balls += 1;  // Batsman faces the ball
      scoreUpdate.batsman.runs += additionalRuns;  // Batsman gets credit for runs (except the no-ball penalty)
    }
  }

  /**
   * Handle bye delivery
   */
  private handleByeDelivery(
    delivery: IDeliveryPayload, 
    scoreUpdate: IScoreUpdate, 
    totalRuns: number
  ): void {
    // Update batsman balls - batsman faced the ball but doesn't get runs
    scoreUpdate.batsman.balls += 1;
    
    // Update bowler stats - bowler doesn't concede runs for byes
    scoreUpdate.bowler.balls += 1;
    
    // Update extras
    scoreUpdate.extras.bye += totalRuns;
    
    // Update team stats
    scoreUpdate.team.runs += totalRuns;
    scoreUpdate.team.balls += 1;
  }

  /**
   * Handle leg-bye delivery
   */
  private handleLegByeDelivery(
    delivery: IDeliveryPayload, 
    scoreUpdate: IScoreUpdate, 
    totalRuns: number
  ): void {
    // Update batsman balls - batsman faced the ball but doesn't get runs
    scoreUpdate.batsman.balls += 1;
    
    // Update bowler stats - bowler doesn't concede runs for leg byes
    scoreUpdate.bowler.balls += 1;
    
    // Update extras
    scoreUpdate.extras.legBye += totalRuns;
    
    // Update team stats
    scoreUpdate.team.runs += totalRuns;
    scoreUpdate.team.balls += 1;
  }
}

export default new ScoreCalculator();