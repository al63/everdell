import expect from "expect.js";
import { Adornment } from "./adornment";
import { Player } from "./player";
import { GameState } from "./gameState";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";
import {
  AdornmentName,
  ExpansionType,
  LocationName,
  GameInputType,
  GameInputPlayAdornment,
  CardName,
  ResourceType,
} from "./types";

const playAdornmentInput = (
  adornment: AdornmentName
): GameInputPlayAdornment => {
  return {
    inputType: GameInputType.PLAY_ADORNMENT,
    clientOptions: {
      adornment,
    },
  };
};

describe("Adornment", () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState();
    player = gameState.getActivePlayer();
  });

  describe("fromName", () => {
    it("should return the expect Adornment instances", () => {
      Object.values(AdornmentName).forEach((adt) => {
        expect(Adornment.fromName(adt as AdornmentName).name).to.be(adt);
      });
    });
  });

  describe(AdornmentName.BELL, () => {
    it("can play adornment", () => {
      const adornment = Adornment.fromName(AdornmentName.BELL);
      const gameInput = playAdornmentInput(adornment.name);

      player.gainResources({ [ResourceType.PEARL]: 1 });
      player.adornmentsInHand.push(adornment.name);

      expect(adornment.canPlay(gameState, gameInput)).to.be(true);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      gameState = gameState.next(gameInput);

      expect(adornment.canPlay(gameState, gameInput)).to.be(false);

      player = gameState.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      expect(player.getPoints(gameState)).to.be(0);
    });

    it("calculate points when city has critters", () => {
      const adornment = Adornment.fromName(AdornmentName.BELL);
      const gameInput = playAdornmentInput(adornment.name);

      player.gainResources({ [ResourceType.PEARL]: 1 });
      player.adornmentsInHand.push(adornment.name);
      player.addToCity(CardName.WIFE);
      player.addToCity(CardName.POSTAL_PIGEON);
      player.addToCity(CardName.HUSBAND);
      player.addToCity(CardName.HUSBAND);

      expect(adornment.canPlay(gameState, gameInput)).to.be(true);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(adornment.canPlay(gameState, gameInput)).to.be(false);

      player = gameState.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      expect(player.getPointsFromAdornments(gameState)).to.be(2);
      expect(player.getPoints(gameState)).to.be(9);
    });
  });

  describe(AdornmentName.SPYGLASS, () => {
    beforeEach(() => {
      player.gainResources({ [ResourceType.PEARL]: 1 });
      player.adornmentsInHand.push(AdornmentName.SPYGLASS);
    });

    it("should gain 1 ANY, CARD and PEARL", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);

      expect(player.cardsInHand.length).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        playAdornmentInput(AdornmentName.SPYGLASS),
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: GameInputType.PLAY_ADORNMENT,
          adornmentContext: AdornmentName.SPYGLASS,
          options: [
            ResourceType.BERRY,
            ResourceType.TWIG,
            ResourceType.RESIN,
            ResourceType.PEBBLE,
          ],
          clientOptions: {
            selectedOption: ResourceType.PEBBLE,
          },
        },
      ]);

      expect(player.adornmentsInHand).to.eql([]);
      expect(player.playedAdornments).to.eql([AdornmentName.SPYGLASS]);
      expect(player.cardsInHand.length).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
    });
  });

  describe(AdornmentName.HOURGLASS, () => {
    beforeEach(() => {
      player.gainResources({ [ResourceType.PEARL]: 1 });
      player.adornmentsInHand.push(AdornmentName.HOURGLASS);

      gameState.locationsMap[LocationName.FOREST_TWO_BERRY_ONE_CARD] = [];
      gameState.locationsMap[LocationName.FOREST_THREE_BERRY] = [];
    });

    it("should allow the player to copy a forest location and gain 1 ANY", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);

      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      [player, gameState] = multiStepGameInputTest(
        gameState,
        [
          playAdornmentInput(AdornmentName.HOURGLASS),
          {
            inputType: GameInputType.SELECT_LOCATION,
            prevInputType: GameInputType.PLAY_ADORNMENT,
            adornmentContext: AdornmentName.HOURGLASS,
            locationOptions: [
              LocationName.FOREST_TWO_BERRY_ONE_CARD,
              LocationName.FOREST_THREE_BERRY,
            ],
            clientOptions: {
              selectedLocation: LocationName.FOREST_THREE_BERRY,
            },
          },
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLAY_ADORNMENT,
            adornmentContext: AdornmentName.HOURGLASS,
            options: [
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ],
            clientOptions: {
              selectedOption: ResourceType.PEBBLE,
            },
          },
        ],
        { skipMultiPendingInputCheck: true }
      );

      expect(player.adornmentsInHand).to.eql([]);
      expect(player.playedAdornments).to.eql([AdornmentName.HOURGLASS]);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
    });
  });
});
