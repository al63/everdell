import expect from "expect.js";
import { Location } from "./location";
import { GameState } from "./gameState";
import { createPlayer } from "./player";
import {
  Season,
  LocationName,
  GameInputType,
  GameInput,
  CardName,
} from "./types";

const placeWorkerInput = (location: LocationName): GameInput => {
  return {
    inputType: GameInputType.PLACE_WORKER,
    location,
  };
};

describe("Location", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = GameState.initialGameState({
      players: [createPlayer("One"), createPlayer("Two")],
    });
  });

  describe("fromName", () => {
    it("should return the expect Location instances", () => {
      for (const loc in LocationName) {
        expect(Location.fromName(loc as LocationName).name).to.be(loc);
      }
    });
  });

  describe("Available workers", () => {
    it("should not allow players w/o workers", () => {
      const location = Location.fromName(LocationName.BASIC_ONE_BERRY);
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      gameState.getActivePlayer().numAvailableWorkers = 0;
      expect(location.canPlay(gameState, gameInput)).to.be(false);
    });
  });

  describe("Location Occupancy", () => {
    it("should allow unlimited workers on BASIC_ONE_BERRY", () => {
      const location = Location.fromName(LocationName.BASIC_ONE_BERRY);
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      gameState.next(gameInput);
      gameState.nextPlayer();
      expect(location.canPlay(gameState, gameInput)).to.be(true);
    });

    it("should not allow unlimited workers on BASIC_ONE_BERRY_AND_ONE_CARD", () => {
      const location = Location.fromName(
        LocationName.BASIC_ONE_BERRY_AND_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      gameState.next(gameInput);
      gameState.nextPlayer();
      expect(location.canPlay(gameState, gameInput)).to.be(false);
    });

    it("should allow 2 workers on SPECIAL_TWO_BERRY_ONE_CARD if 4+ players", () => {
      const gameState = GameState.initialGameState({
        players: [
          createPlayer("One"),
          createPlayer("Two"),
          createPlayer("Three"),
          createPlayer("Four"),
        ],
      });
      const location = Location.fromName(
        LocationName.SPECIAL_TWO_BERRY_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.SPECIAL_TWO_BERRY_ONE_CARD] = [];
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      gameState.next(gameInput);
      gameState.nextPlayer();
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      gameState.next(gameInput);
      gameState.nextPlayer();
      expect(location.canPlay(gameState, gameInput)).to.be(false);
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
        expect(gameState.getActivePlayer().currentSeason).to.be(Season.WINTER);
        expect(location.canPlay(gameState, gameInput)).to.be(false);
        gameState.getActivePlayer().currentSeason = Season.AUTUMN;
        expect(location.canPlay(gameState, gameInput)).to.be(true);
      });

      it("requires X cards in hand", () => {
        const location = Location.fromName(locationName);
        const gameInput = placeWorkerInput(locationName);
        expect(gameState.getActivePlayer().currentSeason).to.be(Season.WINTER);

        gameState.getActivePlayer().currentSeason = Season.AUTUMN;
        expect(location.canPlay(gameState, gameInput)).to.be(true);

        gameState.getActivePlayer().cardsInHand = [];
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        gameState.getActivePlayer().cardsInHand = [CardName.RUINS];
        expect(location.canPlay(gameState, gameInput)).to.be(false);
      });
    });
  });
});
