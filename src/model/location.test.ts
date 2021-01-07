import expect from "expect.js";
import { Location } from "./location";
import { GameState } from "./gameState";
import { Player } from "./player";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";
import {
  Season,
  LocationName,
  LocationType,
  GameInputType,
  GameInputPlaceWorker,
  CardName,
  ResourceType,
} from "./types";

const placeWorkerInput = (location: LocationName): GameInputPlaceWorker => {
  return {
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location,
    },
  };
};

describe("Location", () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState();
    player = gameState.getActivePlayer();
  });

  describe("fromName", () => {
    it("should return the expect Location instances", () => {
      Object.values(LocationName).forEach((loc) => {
        expect(Location.fromName(loc as LocationName).name).to.be(loc);
      });
    });
  });

  describe("Available workers", () => {
    it("should not allow players w/o workers", () => {
      const location = Location.fromName(LocationName.BASIC_ONE_BERRY);
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);

      const numAvailableWorkers = player.numAvailableWorkers;
      for (let i = 0; i < numAvailableWorkers; i++) {
        // Place workers on unlimited location
        player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      }
      expect(location.canPlay(gameState, gameInput)).to.be(false);
    });
  });

  describe("Location Occupancy", () => {
    it("should allow unlimited workers on BASIC_ONE_BERRY", () => {
      const location = Location.fromName(LocationName.BASIC_ONE_BERRY);
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      const nextGameState = gameState.next(gameInput);
      expect(location.canPlay(nextGameState, gameInput)).to.be(true);
    });

    it("should not allow unlimited workers on BASIC_ONE_BERRY_AND_ONE_CARD", () => {
      const location = Location.fromName(
        LocationName.BASIC_ONE_BERRY_AND_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      const nextGameState = gameState.next(gameInput);
      expect(location.canPlay(nextGameState, gameInput)).to.be(false);
    });

    it("should allow 2 workers on FOREST_TWO_BERRY_ONE_CARD if 4+ players", () => {
      const gameState = testInitialGameState({ numPlayers: 4 });
      const location = Location.fromName(
        LocationName.FOREST_TWO_BERRY_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_TWO_BERRY_ONE_CARD] = [];
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      const gameState2 = gameState.next(gameInput);
      expect(location.canPlay(gameState2, gameInput)).to.be(true);
      const gameState3 = gameState2.next(gameInput);
      expect(location.canPlay(gameState3, gameInput)).to.be(false);
    });
  });

  describe("BASIC_ONE_BERRY_AND_ONE_CARD", () => {
    it("should give the player 1 berry and on card after placing worker", () => {
      const location = Location.fromName(
        LocationName.BASIC_ONE_BERRY_AND_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);

      expect(location.canPlay(gameState, gameInput)).to.be(true);

      gameState.deck.addToStack(CardName.FARM);

      expect(player.numAvailableWorkers).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.cardsInHand).to.eql([]);

      const nextGameState = gameState.next(gameInput);
      expect(location.canPlay(nextGameState, gameInput)).to.be(false);
      expect(location.canPlay(nextGameState, gameInput)).to.be(false);

      player = nextGameState.getPlayer(player.playerId);
      expect(player.numAvailableWorkers).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      expect(player.cardsInHand).to.eql([CardName.FARM]);
    });
  });

  describe("FOREST_TWO_WILD", () => {
    it("player can specify 2 wild resources", () => {
      const location = Location.fromName(LocationName.FOREST_TWO_WILD);
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_TWO_WILD] = [];

      expect(location.canPlay(gameState, gameInput)).to.be(true);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_TWO_WILD,
          maxResources: 2,
          minResources: 2,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 1,
            },
          },
        },
      ]);

      player = gameState.getPlayer(player.playerId);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
    });
  });

  describe("FOREST_TWO_CARDS_ONE_WILD", () => {
    it("player draws 2 cards + gets 1 wild resource", () => {
      const location = Location.fromName(
        LocationName.FOREST_TWO_CARDS_ONE_WILD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_TWO_CARDS_ONE_WILD] = [];

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.cardsInHand.length).to.be(0);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_TWO_CARDS_ONE_WILD,
          maxResources: 1,
          minResources: 1,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
            },
          },
        },
      ]);

      player = gameState.getPlayer(player.playerId);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.cardsInHand.length).to.be(2);
    });
  });

  describe("FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD", () => {
    it("player can discard cards and get resources", () => {
      const location = Location.fromName(
        LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD
      ] = [];
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.cardsInHand.length).to.be(4);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext:
            LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
          minCards: 0,
          maxCards: 3,
          clientOptions: {
            cardsToDiscard: [CardName.FARM, CardName.WIFE, CardName.WIFE],
          },
        },
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.DISCARD_CARDS,
          locationContext:
            LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 2,
            },
          },
        },
      ]);

      player = gameState.getPlayer(player.playerId);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(2);
      expect(player.cardsInHand.length).to.be(1);
    });
  });

  describe("FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD", () => {
    it("player can visit FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD", () => {
      const location = Location.fromName(
        LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
      ] = [];
      player.addCardToHand(gameState, CardName.BARD);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.FOOL);
      player.addCardToHand(gameState, CardName.BARGE_TOAD);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.HUSBAND);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.cardsInHand.length).to.be(6);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext:
            LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
          minCards: 0,
          maxCards: 8,
          clientOptions: {
            cardsToDiscard: [
              CardName.FARM,
              CardName.FOOL,
              CardName.INN,
              CardName.BARD,
            ],
          },
        },
      ]);

      player = gameState.getPlayer(player.playerId);

      // player gained 8 cards but already had 2 in hand + can't have more than 8 cards in hand
      expect(player.cardsInHand.length).to.be(8);
    });
  });

  describe("HAVEN", () => {
    it("player can visit the haven", () => {
      const location = Location.fromName(LocationName.HAVEN);
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.HAVEN] = [];
      player.addCardToHand(gameState, CardName.BARD);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.FOOL);
      player.addCardToHand(gameState, CardName.BARGE_TOAD);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.HUSBAND);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.cardsInHand.length).to.be(6);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.HAVEN,
          minCards: 0,
          maxCards: player.cardsInHand.length,
          clientOptions: {
            cardsToDiscard: [
              CardName.FARM,
              CardName.FOOL,
              CardName.INN,
              CardName.BARD,
            ],
          },
        },
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.DISCARD_CARDS,
          locationContext: LocationName.HAVEN,
          maxResources: 2,
          minResources: 2,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 1,
            },
          },
        },
      ]);

      expect(gameState.getActivePlayer().playerId).not.to.be.eql(
        player.playerId
      );

      player = gameState.getPlayer(player.playerId);

      // player gained 8 cards but already had 2 in hand + can't have more than 8 cards in hand
      expect(player.cardsInHand.length).to.be(2);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
    });
  });

  describe("FOREST_COPY_BASIC_ONE_CARD", () => {
    it("player can visit FOREST_COPY_BASIC_ONE_CARD", () => {
      const location = Location.fromName(
        LocationName.FOREST_COPY_BASIC_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_COPY_BASIC_ONE_CARD] = [];
      player.addCardToHand(gameState, CardName.BARD);
      player.addCardToHand(gameState, CardName.INN);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_COPY_BASIC_ONE_CARD,
          locationOptions: Location.byType(LocationType.BASIC),
          clientOptions: {
            selectedLocation: LocationName.BASIC_ONE_BERRY,
          },
        },
      ]);

      player = gameState.getPlayer(player.playerId);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      expect(player.cardsInHand.length).to.be(3);
    });
  });

  [
    LocationName.JOURNEY_TWO,
    LocationName.JOURNEY_THREE,
    LocationName.JOURNEY_FOUR,
    LocationName.JOURNEY_FIVE,
  ].forEach((locationName) => {
    describe(`JOURNEY: ${locationName}`, () => {
      it("cannot be played until autumn", () => {
        const location = Location.fromName(locationName);
        const gameInput = placeWorkerInput(locationName);
        player.cardsInHand = [
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ];

        expect(player.currentSeason).to.be(Season.WINTER);
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.nextSeason();
        expect(player.currentSeason).to.be(Season.SPRING);
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.nextSeason();
        expect(player.currentSeason).to.be(Season.SUMMER);
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.nextSeason();
        expect(player.currentSeason).to.be(Season.AUTUMN);
        expect(location.canPlay(gameState, gameInput)).to.be(true);
      });

      it("requires X cards in hand", () => {
        const location = Location.fromName(locationName);
        const gameInput = placeWorkerInput(locationName);

        expect(player.currentSeason).to.be(Season.WINTER);
        player.nextSeason();
        player.nextSeason();
        player.nextSeason();
        expect(player.currentSeason).to.be(Season.AUTUMN);

        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.cardsInHand = [CardName.RUINS];
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.cardsInHand = [
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ];
        expect(location.canPlay(gameState, gameInput)).to.be(true);
      });
    });
  });
});
