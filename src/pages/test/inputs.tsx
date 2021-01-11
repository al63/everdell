import { GetServerSideProps } from "next";

import { GameJSON, GameStateJSON, PlayerJSON } from "../../model/jsonTypes";
import {
  CardName,
  LocationName,
  ResourceType,
  EventName,
  GameInputType,
} from "../../model/types";
import { Game as GameModel } from "../../model/game";
import { GameState } from "../../model/gameState";
import GameInputBox from "../../components/GameInputBox";

import { testInitialGameState } from "../../model/testHelpers";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const playerNames = ["Michael", "Elynn", "Chris", "Vanessa"];
  const numPlayers = playerNames.length;
  let gameState = testInitialGameState({
    numPlayers,
    playerNames,
    noForestLocations: true,
    noSpecialEvents: false,
    shuffleDeck: true,
  });
  gameState.players.forEach((player, idx) => {
    player.nextSeason();
    player.nextSeason();

    player.drawCards(gameState, idx);
    player.cardsInHand.push(CardName.RANGER);
    player.cardsInHand.push(CardName.FOOL);
    player.cardsInHand.push(CardName.INNKEEPER);
    player.cardsInHand.push(CardName.WANDERER);
    player.cardsInHand.push(CardName.KING);
    player.cardsInHand.push(CardName.POSTAL_PIGEON);
    player.cardsInHand.push(CardName.BARD);

    player.gainResources({
      [ResourceType.VP]: 12,
      [ResourceType.TWIG]: 4,
      [ResourceType.BERRY]: 7,
      [ResourceType.PEBBLE]: 3,
      [ResourceType.RESIN]: 6,
    });

    // City
    player.addToCity(CardName.UNIVERSITY);
    player.addToCity(CardName.DUNGEON);
    player.addToCity(CardName.WANDERER);
    player.addToCity(CardName.HUSBAND);
    player.addToCity(CardName.RESIN_REFINERY);
    player.addToCity(CardName.INN);
    player.addToCity(CardName.FARM);
    player.addToCity(CardName.MINE);
    player.addToCity(CardName.QUEEN);
    player.addToCity(CardName.LOOKOUT);
    player.addToCity(CardName.CLOCK_TOWER);

    player.placeWorkerOnCard(
      gameState,
      player.getFirstPlayedCard(CardName.UNIVERSITY)
    );
  });

  gameState.locationsMap[LocationName.FOREST_TWO_WILD] = [];
  gameState.locationsMap[LocationName.FOREST_ONE_PEBBLE_THREE_CARD] = [];
  gameState.locationsMap[
    LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
  ] = [];

  gameState.meadowCards.push(CardName.KING, CardName.FARM);

  const game = new GameModel({
    gameId: "testGameId",
    gameSecret: "testGameSecret",
    gameState,
  });

  return {
    props: {
      game: game.toJSON(true /* includePrivate */),
    },
  };
};

export default function TestGameInputPage(props: { game: GameJSON }) {
  const { game } = props;
  const { gameId, gameState } = game;
  const gameStateImpl = GameState.fromJSON(gameState);
  const gameState1 = gameStateImpl.clone();

  const gameState2 = gameStateImpl.clone();

  const gameStateDiscardCards = gameStateImpl.next({
    inputType: GameInputType.PLAY_CARD,
    clientOptions: {
      card: CardName.BARD,
      fromMeadow: false,
      paymentOptions: {
        resources: { [ResourceType.BERRY]: 3 },
      },
    },
  });

  const gameStateSelectWorkerPlacement = gameStateImpl.next({
    inputType: GameInputType.PLAY_CARD,
    clientOptions: {
      card: CardName.RANGER,
      fromMeadow: false,
      paymentOptions: {
        resources: { [ResourceType.BERRY]: 2 },
      },
    },
  });

  const gameStateSelectPlayer = gameStateImpl.next({
    inputType: GameInputType.PLAY_CARD,
    clientOptions: {
      card: CardName.FOOL,
      fromMeadow: false,
      paymentOptions: {
        resources: { [ResourceType.BERRY]: 3 },
      },
    },
  });

  const gameStateSelectLocation = gameStateImpl.next({
    inputType: GameInputType.VISIT_DESTINATION_CARD,
    clientOptions: {
      playedCard: gameStateImpl
        .getActivePlayer()
        .getFirstPlayedCard(CardName.LOOKOUT),
    },
  });

  const gameStateSelectResources = gameStateImpl.next({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.FOREST_TWO_WILD,
    },
  });

  const gameStateSelectCards = gameStateImpl.next({
    inputType: GameInputType.PLAY_CARD,
    clientOptions: {
      card: CardName.POSTAL_PIGEON,
      fromMeadow: false,
      paymentOptions: {
        resources: { [ResourceType.BERRY]: 2 },
      },
    },
  });

  let gameStatePaymentForCard = gameStateImpl.next({
    inputType: GameInputType.VISIT_DESTINATION_CARD,
    clientOptions: {
      playedCard: gameStateImpl
        .getActivePlayer()
        .getFirstPlayedCard(CardName.INN),
    },
  });
  gameStatePaymentForCard = gameStatePaymentForCard.next({
    inputType: GameInputType.SELECT_CARDS,
    prevInputType: GameInputType.VISIT_DESTINATION_CARD,
    cardContext: CardName.INN,
    cardOptions: gameStatePaymentForCard.meadowCards,
    maxToSelect: 1,
    minToSelect: 1,
    clientOptions: {
      selectedCards: [CardName.KING],
    },
  });

  return (
    <>
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState1.toJSON(true)}
        gameInputs={[]}
        viewingPlayer={gameState1.players[1]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState1.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.PREPARE_FOR_SEASON,
          },
        ]}
        viewingPlayer={gameState1.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState1.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.GAME_END,
          },
        ]}
        viewingPlayer={gameState1.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState2.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.PLAY_CARD,
            clientOptions: {
              card: null,
              fromMeadow: false,
              paymentOptions: { resources: {} },
            },
          },
        ]}
        viewingPlayer={gameState2.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState2.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.PLACE_WORKER,
            clientOptions: {
              location: null,
            },
          },
        ]}
        viewingPlayer={gameState2.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState2.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.CLAIM_EVENT,
            clientOptions: {
              event: null,
            },
          },
        ]}
        viewingPlayer={gameState2.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState2.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: null,
            },
          },
        ]}
        viewingPlayer={gameState2.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateDiscardCards.toJSON(true)}
        gameInputs={gameStateDiscardCards.pendingGameInputs}
        viewingPlayer={gameStateDiscardCards.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectWorkerPlacement.toJSON(true)}
        gameInputs={gameStateSelectWorkerPlacement.pendingGameInputs}
        viewingPlayer={gameStateSelectWorkerPlacement.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectPlayer.toJSON(true)}
        gameInputs={gameStateSelectPlayer.pendingGameInputs}
        viewingPlayer={gameStateSelectPlayer.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectLocation.toJSON(true)}
        gameInputs={gameStateSelectLocation.pendingGameInputs}
        viewingPlayer={gameStateSelectLocation.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectResources.toJSON(true)}
        gameInputs={gameStateSelectResources.pendingGameInputs}
        viewingPlayer={gameStateSelectResources.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectCards.toJSON(true)}
        gameInputs={gameStateSelectCards.pendingGameInputs}
        viewingPlayer={gameStateSelectCards.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStatePaymentForCard.toJSON(true)}
        gameInputs={gameStatePaymentForCard.pendingGameInputs}
        viewingPlayer={gameStatePaymentForCard.players[0]}
      />
    </>
  );
}
