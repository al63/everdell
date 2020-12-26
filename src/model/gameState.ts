import {
  Season,
  GameInputType,
  GameInput,
  CardName,
  IEvent,
  ILocation,
} from "./types";
import { Player } from "./player";

export class GameState {
  constructor(
    readonly activePlayerId: Player["playerId"],
    readonly players: Player[],
    readonly locations: ILocation[],
    readonly meadowCards: CardName[],
    readonly discardPile: CardName[],
    readonly deck: CardName[],
    readonly events: IEvent[],
    readonly pendingGameInput: GameInput | null
  ) {}

  toJSON(includePrivate: boolean): object {
    return {
      activePlayerId: this.activePlayerId,
      players: this.players.map((p) => p.toJSON(includePrivate)),
      meadowCards: this.meadowCards,
      locations: this.locations,
      events: this.events,
      pendingGameInput: this.pendingGameInput,
      ...(includePrivate
        ? {
            deck: this.deck,
            discardPile: this.discardPile,
          }
        : {}),
    };
  }

  static fromJSON(gameStateJSON: any): GameState {
    return new GameState(
      gameStateJSON.activePlayerId,
      gameStateJSON.players.map((pJSON: any) => Player.fromJSON(pJSON)),
      gameStateJSON.locations,
      gameStateJSON.meadowCards,
      gameStateJSON.discardPile,
      gameStateJSON.desk,
      gameStateJSON.events,
      gameStateJSON.pendingGameInput
    );
  }

  getActivePlayer(): Player {
    const activePlayer = this.players.find(
      (player) => player.playerId === this.activePlayerId
    );

    if (!activePlayer) {
      throw new Error(`Unable to find the active player`);
    }
    return activePlayer;
  }

  private getEligibleEvents = (): IEvent[] => {
    return this.events.filter((event) => {
      // TODO
      return true;
    });
  };

  private getAvailableLocations = (): ILocation[] => {
    return this.locations.filter((location) => {
      // TODO
      return true;
    });
  };

  private getPlayableCards = (): CardName[] => {
    return [...this.meadowCards, ...this.getActivePlayer().cardsInHand].filter(
      (card) => {
        // TODO
        return true;
      }
    );
  };

  getPossibleGameInputs(): GameInput[] {
    const player = this.getActivePlayer();
    const playerId = player.playerId;
    const possibleGameInputs: GameInput[] = [];

    if (this.pendingGameInput) {
      if (this.pendingGameInput.inputType === GameInputType.PLAY_CARD) {
        // figure out how to pay
      } else if (
        this.pendingGameInput.inputType === GameInputType.PLACE_WORKER
      ) {
        // game options for the worker placement
      } else if (
        this.pendingGameInput.inputType === GameInputType.CLAIM_EVENT
      ) {
        // game options for the claiming event
      } else {
        throw new Error(
          "Unexpected pending game input type " + this.pendingGameInput
        );
      }
    } else {
      if (player.currentSeason !== Season.WINTER) {
        possibleGameInputs.push({
          inputType: GameInputType.PREPARE_FOR_SEASON,
          playerId,
        });
      }

      if (player.numAvailableWorkers > 0) {
        this.getAvailableLocations().forEach((location) => {
          possibleGameInputs.push({
            inputType: GameInputType.PLACE_WORKER,
            playerId,
            location,
          });
        });

        this.getEligibleEvents().forEach((event) => {
          possibleGameInputs.push({
            inputType: GameInputType.CLAIM_EVENT,
            playerId,
            event,
          });
        });
      }

      this.getPlayableCards().forEach((card) => {
        possibleGameInputs.push({
          inputType: GameInputType.PLAY_CARD,
          playerId,
          card,
        });
      });
    }

    return possibleGameInputs;
  }
}
