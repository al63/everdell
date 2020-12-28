import {
  CardName,
  ResourceType,
  ResourceMap,
  LocationName,
  LocationType,
  LocationOccupancy,
  LocationNameToPlayerIds,
  GameInput,
  GameInputType,
  Season,
} from "./types";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayFn,
} from "./gameState";
import { playGainResourceFactory } from "./gameStatePlayHelpers";
import { Player } from "./player";

export class Location implements GameStatePlayable {
  readonly name: LocationName;
  readonly type: LocationType;
  readonly occupancy: LocationOccupancy;
  readonly playInner: GameStatePlayFn;
  readonly canPlayInner: GameStateCanPlayFn | undefined;

  constructor({
    name,
    type,
    occupancy,
    playInner,
    canPlayInner,
  }: {
    name: LocationName;
    type: LocationType;
    occupancy: LocationOccupancy;
    playInner: GameStatePlayFn;
    canPlayInner?: GameStateCanPlayFn;
  }) {
    this.name = name;
    this.type = type;
    this.occupancy = occupancy;
    this.playInner = playInner;
    this.canPlayInner = canPlayInner;
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    if (!(this.name in gameState.locationsMap)) {
      return false;
    }
    if (gameState.getActivePlayer().numAvailableWorkers <= 0) {
      return false;
    }
    if (this.canPlayInner && !this.canPlayInner(gameState, gameInput)) {
      return false;
    }
    if (this.occupancy === LocationOccupancy.EXCLUSIVE) {
      return gameState.locationsMap[this.name]!.length === 0;
    } else if (this.occupancy === LocationOccupancy.EXCLUSIVE_FOUR) {
      return (
        gameState.locationsMap[this.name]!.length <
        (gameState.players.length < 4 ? 1 : 2)
      );
    } else if (this.occupancy === LocationOccupancy.UNLIMITED) {
      return true;
    } else {
      throw new Error(`Unexpected occupancy: ${this.occupancy}`);
    }
  }

  play(gameState: GameState, gameInput: GameInput): void {
    if (!this.canPlay(gameState, gameInput)) {
      throw new Error(`Unable to visit location ${this.name}`);
    }
    this.playInner(gameState, gameInput);
  }

  static fromName(name: LocationName): Location {
    return LOCATION_REGISTRY[name];
  }

  static byType(type: LocationType): LocationName[] {
    return ((Object.entries(LOCATION_REGISTRY) as unknown) as [
      LocationName,
      Location
    ][])
      .filter(([_, loc]) => {
        return loc.type === type;
      })
      .map(([name, _]) => {
        return name;
      });
  }
}

const LOCATION_REGISTRY: Record<LocationName, Location> = {
  [LocationName.HAVEN]: new Location({
    name: LocationName.HAVEN,
    type: LocationType.HAVEN,
    occupancy: LocationOccupancy.UNLIMITED,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLACE_WORKER) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions) {
        throw new Error("Invalid input");
      }
      if (
        !(
          gameInput.clientOptions.cardsToDiscard &&
          gameInput.clientOptions.resourcesToGain
        )
      ) {
        throw new Error("Invalid game input");
      }

      const numToDiscard = gameInput.clientOptions.cardsToDiscard.length;
      const numResourcesToGain = Math.floor(numToDiscard / 2);
      const resourcesToGain = gameInput.clientOptions.resourcesToGain;

      let gainingNumResources = 0;
      (Object.entries(resourcesToGain) as [ResourceType, number][]).forEach(
        ([resourceType, count]) => {
          if (
            [
              ResourceType.TWIG,
              ResourceType.BERRY,
              ResourceType.PEBBLE,
              ResourceType.RESIN,
            ].indexOf(resourceType) === -1
          ) {
            throw new Error(`Cannot gain: ${resourceType} from the haven`);
          }
          gainingNumResources += count;
        }
      );

      if (gainingNumResources !== numResourcesToGain) {
        throw new Error(
          `Mismatch resources: can gain: ${numResourcesToGain}, gaining: ${gainingNumResources}`
        );
      }

      const player = gameState.getActivePlayer();
      gameInput.clientOptions.cardsToDiscard.forEach((card: CardName) => {
        player.removeCardFromHand(card);
        gameState.discardPile.addToStack(card);
      });
      player.gainResources(resourcesToGain);
    },
  }),
  [LocationName.JOURNEY_FIVE]: new Location({
    name: LocationName.JOURNEY_FIVE,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playInnerJourneyFactory(5),
    canPlayInner: canPlayInnerJourneyFactory(5),
  }),
  [LocationName.JOURNEY_FOUR]: new Location({
    name: LocationName.JOURNEY_FOUR,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playInnerJourneyFactory(4),
    canPlayInner: canPlayInnerJourneyFactory(4),
  }),
  [LocationName.JOURNEY_THREE]: new Location({
    name: LocationName.JOURNEY_THREE,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playInnerJourneyFactory(3),
    canPlayInner: canPlayInnerJourneyFactory(3),
  }),
  [LocationName.JOURNEY_TWO]: new Location({
    name: LocationName.JOURNEY_TWO,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.UNLIMITED,
    playInner: playInnerJourneyFactory(2),
    canPlayInner: canPlayInnerJourneyFactory(2),
  }),
  [LocationName.BASIC_ONE_BERRY]: new Location({
    name: LocationName.BASIC_ONE_BERRY,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.BERRY]: 1 },
    }),
  }),
  [LocationName.BASIC_ONE_BERRY_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.BERRY]: 1 },
      numCardsToDraw: 1,
    }),
  }),
  [LocationName.BASIC_ONE_RESIN_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.RESIN]: 1 },
      numCardsToDraw: 1,
    }),
  }),
  [LocationName.BASIC_ONE_STONE]: new Location({
    name: LocationName.BASIC_ONE_STONE,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.PEBBLE]: 1 },
    }),
  }),
  [LocationName.BASIC_THREE_TWIGS]: new Location({
    name: LocationName.BASIC_THREE_TWIGS,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.TWIG]: 3 },
    }),
  }),
  [LocationName.BASIC_TWO_CARDS_AND_ONE_VP]: new Location({
    name: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.VP]: 1 },
      numCardsToDraw: 2,
    }),
  }),
  [LocationName.BASIC_TWO_RESIN]: new Location({
    name: LocationName.BASIC_TWO_RESIN,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.RESIN]: 2 },
    }),
  }),
  [LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.RESIN]: 2 },
      numCardsToDraw: 1,
    }),
  }),
  [LocationName.FOREST_TWO_BERRY_ONE_CARD]: new Location({
    name: LocationName.FOREST_TWO_BERRY_ONE_CARD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.BERRY]: 2 },
      numCardsToDraw: 1,
    }),
  }),
  [LocationName.FOREST_TWO_WILD]: new Location({
    name: LocationName.FOREST_TWO_WILD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
  [LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD]: new Location({
    name: LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
  [LocationName.FOREST_COPY_BASIC_ONE_CARD]: new Location({
    name: LocationName.FOREST_COPY_BASIC_ONE_CARD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
  [LocationName.FOREST_ONE_PEBBLE_THREE_CARD]: new Location({
    name: LocationName.FOREST_ONE_PEBBLE_THREE_CARD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: playGainResourceFactory({
      resourceMap: { [ResourceType.PEBBLE]: 1 },
      numCardsToDraw: 3,
    }),
  }),
  [LocationName.FOREST_ONE_TWIG_RESIN_BERRY]: new Location({
    name: LocationName.FOREST_ONE_TWIG_RESIN_BERRY,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: playGainResourceFactory({
      resourceMap: {
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
        [ResourceType.BERRY]: 1,
      },
    }),
  }),
  [LocationName.FOREST_THREE_BERRY]: new Location({
    name: LocationName.FOREST_THREE_BERRY,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: playGainResourceFactory({
      resourceMap: {
        [ResourceType.BERRY]: 3,
      },
    }),
  }),
  [LocationName.FOREST_TWO_RESIN_ONE_TWIG]: new Location({
    name: LocationName.FOREST_TWO_RESIN_ONE_TWIG,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: playGainResourceFactory({
      resourceMap: {
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 2,
      },
    }),
  }),
  [LocationName.FOREST_TWO_CARDS_ONE_WILD]: new Location({
    name: LocationName.FOREST_TWO_CARDS_ONE_WILD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
  [LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD]: new Location(
    {
      name: LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
      type: LocationType.FOREST,
      occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
      playInner: () => {
        throw new Error("Not Implemented");
      },
    }
  ),
  [LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS]: new Location({
    name: LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
};

export const initialLocationsMap = (): LocationNameToPlayerIds => {
  const ret: LocationNameToPlayerIds = {};
  [
    ...Location.byType(LocationType.BASIC),
    ...Location.byType(LocationType.HAVEN),
    ...Location.byType(LocationType.JOURNEY),
  ].forEach((ty) => {
    ret[ty] = [];
  });
  return ret;
};

/**
 * Helpers
 */

function playInnerJourneyFactory(numPoints: number): GameStatePlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (player.cardsInHand.length < numPoints) {
      throw new Error("Insufficient cards for journey");
    }
    if (gameInput.inputType !== GameInputType.PLACE_WORKER) {
      throw new Error("Invalid input type");
    }
    if (!gameInput.clientOptions) {
      throw new Error("Invalid input");
    }
    if (gameInput.clientOptions.cardsToDiscard?.length !== numPoints) {
      throw new Error("Must specify cards to discard for journey");
    }
    gameInput.clientOptions.cardsToDiscard.forEach((card: CardName) => {
      player.removeCardFromHand(card);
      gameState.discardPile.addToStack(card);
    });
    player.gainResources({
      [ResourceType.VP]: numPoints,
    });
  };
}

function canPlayInnerJourneyFactory(numPoints: number): GameStateCanPlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (player.currentSeason !== Season.AUTUMN) {
      return false;
    }
    if (player.cardsInHand.length < numPoints) {
      return false;
    }
    return true;
  };
}
