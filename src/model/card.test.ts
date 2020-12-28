import expect from "expect.js";
import { Card } from "./card";
import { GameState } from "./gameState";
import { createPlayer } from "./player";
import { ResourceType, GameInputType, GameInput, CardName } from "./types";

const playCardInput = (
  card: CardName,
  fromMeadow: boolean = false
): GameInput => {
  return {
    inputType: GameInputType.PLAY_CARD,
    card,
    fromMeadow,
  };
};

describe("Card", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = GameState.initialGameState({
      players: [createPlayer("One"), createPlayer("Two")],
    });
  });

  describe("fromName", () => {
    it("should return the expect Card instances", () => {
      for (const card in CardName) {
        expect(Card.fromName(card as CardName).name).to.be(card);
      }
    });
  });

  describe(CardName.FARM, () => {
    it("should have card to play it", () => {
      const card = Card.fromName(CardName.FARM);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();
      player.gainResources(card.baseCost);

      expect(card.canPlay(gameState, gameInput)).to.be(false);
      player.cardsInHand = [card.name];
      expect(card.canPlay(gameState, gameInput)).to.be(true);
    });

    it("should remove card from hand after playing it", () => {
      const card = Card.fromName(CardName.FARM);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();
      player.gainResources(card.baseCost);

      player.cardsInHand = [];
      expect(card.canPlay(gameState, gameInput)).to.be(false);
      player.cardsInHand = [card.name];
      expect(card.canPlay(gameState, gameInput)).to.be(true);

      expect(player.cardsInHand).to.not.eql([]);
      const nextGameState = gameState.next(gameInput);
      expect(nextGameState.getPlayer(player.playerId).cardsInHand).to.eql([]);
    });

    it("should be able to pay for the card to play it", () => {
      const card = Card.fromName(CardName.FARM);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();

      player.cardsInHand.push(card.name);

      expect(player.getNumResource(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResource(ResourceType.RESIN)).to.be(0);
      expect(card.canPlay(gameState, gameInput)).to.be(false);

      player.gainResources(card.baseCost);
      expect(card.canPlay(gameState, gameInput)).to.be(true);
    });

    it("should gain 1 berry when played", () => {
      const card = Card.fromName(CardName.FARM);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();

      player.cardsInHand.push(card.name);
      player.gainResources(card.baseCost);
      expect(player.getNumResource(ResourceType.BERRY)).to.be(0);
      const nextGameState = gameState.next(gameInput);
      expect(
        nextGameState
          .getPlayer(player.playerId)
          .getNumResource(ResourceType.BERRY)
      ).to.be(1);
    });
  });
});
