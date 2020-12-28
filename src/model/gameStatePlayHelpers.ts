import {
  CardName,
  ResourceType,
  ResourceMap,
  GameInput,
  GameInputType,
} from "./types";
import {
  GameState,
  GameStatePlayFn,
  GameStateCountPointsFn,
} from "./gameState";

import { Card } from "./card";

export function playGainResourceFactory({
  resourceMap,
  numCardsToDraw = 0,
}: {
  resourceMap: ResourceMap;
  numCardsToDraw?: number;
}): GameStatePlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    player.gainResources(resourceMap);
    if (numCardsToDraw !== 0) {
      player.drawCards(gameState, numCardsToDraw);
    }
  };
}

export function playSpendResourceToGetVPFactory({
  resourceType,
  maxToSpend,
}: {
  resourceType: ResourceType;
  maxToSpend: number;
}) {
  return (gameState: GameState, gameInput: GameInput) => {
    if (gameInput.inputType !== GameInputType.PLAY_CARD) {
      throw new Error("Invalid input type");
    }
    if (!gameInput.clientOptions?.resourcesToSpend) {
      throw new Error("Invalid input");
    }
    const player = gameState.getActivePlayer();
    const numToSpend =
      gameInput.clientOptions.resourcesToSpend[resourceType] || 0;
    if (numToSpend > maxToSpend) {
      throw new Error(
        `Too many resources, max: ${maxToSpend}, got: ${numToSpend}`
      );
    }
    player.spendResources({
      [resourceType]: numToSpend,
    });
    player.gainResources({
      [ResourceType.VP]: numToSpend,
    });
  };
}

export function sumResources(resourceMap: ResourceMap): number {
  return (Object.values(resourceMap) as number[]).reduce((a, b) => a + b, 0);
}

export function getPointsPerRarityLabel({
  isCritter,
  isUnique,
}: {
  isCritter: boolean;
  isUnique: boolean;
}): GameStateCountPointsFn {
  return (gameState: GameState, playerId: string) => {
    const player = gameState.getPlayer(playerId);
    const playedCards = player.playedCards;
    if (!playedCards) {
      throw new Error("Invalid list of played cards");
    }
    let numCardsToCount = 0;
    for (let cardName in playedCards) {
      let card = Card.fromName(cardName as CardName);
      if (card.isCritter == isCritter && card.isUnique == isUnique) {
        numCardsToCount++;
      }
    }
    return numCardsToCount;
  };
}
