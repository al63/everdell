import {
  Season,
  GameInputType,
  GameInput,
  CardName,
  EventName,
  LocationName,
  LocationNameToPlayerIds,
  EventNameToPlayerId,
} from "./types";
import { Player } from "./player";
import { CardStack, emptyCardStack } from "./cardStack";
import { initialLocationsMap } from "./location";
import { initialEventMap } from "./event";
import { initialShuffledDeck } from "./deck";

export class GameState {
  readonly activePlayerId: Player["playerId"];
  readonly players: Player[];
  readonly meadowCards: CardName[];
  readonly discardPile: CardStack;
  readonly deck: CardStack;
  readonly locationsMap: LocationNameToPlayerIds;
  readonly eventsMap: EventNameToPlayerId;
  readonly pendingGameInput: GameInput | null;

  constructor({
    activePlayerId,
    players,
    meadowCards,
    discardPile,
    deck,
    locationsMap,
    eventsMap,
    pendingGameInput,
  }: {
    activePlayerId: Player["playerId"];
    players: Player[];
    meadowCards: CardName[];
    discardPile: CardStack;
    deck: CardStack;
    locationsMap: LocationNameToPlayerIds;
    eventsMap: EventNameToPlayerId;
    pendingGameInput: GameInput | null;
  }) {
    this.activePlayerId = activePlayerId;
    this.players = players;
    this.locationsMap = locationsMap;
    this.meadowCards = meadowCards;
    this.discardPile = discardPile;
    this.deck = deck;
    this.eventsMap = eventsMap;
    this.pendingGameInput = pendingGameInput;
  }

  toJSON(includePrivate: boolean): object {
    return {
      activePlayerId: this.activePlayerId,
      players: this.players.map((p) => p.toJSON(includePrivate)),
      meadowCards: this.meadowCards,
      locationsMap: this.locationsMap,
      eventsMap: this.eventsMap,
      pendingGameInput: this.pendingGameInput,
      deck: this.deck.toJSON(includePrivate),
      discardPile: this.discardPile.toJSON(includePrivate),
    };
  }

  static fromJSON(gameStateJSON: any): GameState {
    return new GameState({
      ...gameStateJSON,
      deck: CardStack.fromJSON(gameStateJSON.deck),
      discardPile: CardStack.fromJSON(gameStateJSON.discardPile),
      players: gameStateJSON.players.map((pJSON: any) =>
        Player.fromJSON(pJSON)
      ),
    });
  }

  static initialGameState({ players }: { players: Player[] }): GameState {
    if (players.length < 2) {
      throw new Error(`Unable to create a game with ${players.length} players`);
    }

    const gameState = new GameState({
      activePlayerId: players[0].playerId,
      players,
      meadowCards: [],
      deck: initialShuffledDeck(),
      discardPile: emptyCardStack(),
      locationsMap: initialLocationsMap(),
      eventsMap: initialEventMap(),
      pendingGameInput: null,
    });

    return gameState;
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

  private getEligibleEvents = (): EventName[] => {
    const entries = (Object.entries(this.eventsMap) as unknown) as [
      EventName,
      string
    ][];
    return entries
      .filter(([eventName, playerIdIfTaken]) => {
        if (!!playerIdIfTaken) {
          return false;
        }
        // TODO check if player is eligible for event.
        return true;
      })
      .map(([eventName, _]) => eventName);
  };

  private getAvailableLocations = (): LocationName[] => {
    const keys = (Object.keys(this.locationsMap) as unknown) as LocationName[];
    return keys.filter((locationName) => {
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
