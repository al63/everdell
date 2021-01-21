import * as React from "react";
import { Form } from "formik";
import isEqual from "lodash/isEqual";
import omit from "lodash/omit";

import styles from "../styles/GameInputBox.module.css";
import { GameState } from "../model/gameState";
import { GameInputType, GameInput } from "../model/types";
import { GameStateJSON } from "../model/jsonTypes";
import { Player } from "../model/player";

import { GameBlock } from "./common";

import { GameInputBoxContainer, renderGameInputLabel } from "./gameInputCommon";
import GameInputDiscardCards from "./GameInputDiscardCards";
import GameInputSelectPlayer from "./GameInputSelectPlayer";
import GameInputSelectResources from "./GameInputSelectResources";
import GameInputSelectPlayedCards from "./GameInputSelectPlayedCards";
import GameInputSelectCards from "./GameInputSelectCards";
import GameInputPlaceWorkerSelector from "./GameInputPlaceWorkerSelector";
import GameInputClaimEventSelector from "./GameInputClaimEventSelector";
import GameInputSelectPaymentForCard from "./GameInputSelectPaymentForCard";
import GameInputSelectWorkerPlacement from "./GameInputSelectWorkerPlacement";
import GameInputVisitDestinationCard from "./GameInputVisitDestinationCard";
import GameInputSelectOptionGeneric from "./GameInputSelectOptionGeneric";
import GameInputPlayCard from "./GameInputPlayCard";

import { assertUnreachable } from "../utils";

const GameInputBoxText: React.FC<{
  title?: string;
  text: string;
}> = ({ title = "Game Input", text }) => {
  return (
    <GameBlock title={title}>
      <p>{text}</p>
    </GameBlock>
  );
};

const gameInputSortOrder: Partial<Record<GameInputType, number>> = {
  [GameInputType.CLAIM_EVENT]: 1,
  [GameInputType.PLAY_CARD]: 2,
  [GameInputType.PLACE_WORKER]: 3,
  [GameInputType.VISIT_DESTINATION_CARD]: 4,
  [GameInputType.PREPARE_FOR_SEASON]: 5,
  [GameInputType.GAME_END]: 6,
};

const GameInputBoxInner = ({
  gameInput,
  gameState,
  viewingPlayer,
}: {
  gameInput: GameInput;
  gameState: GameState;
  viewingPlayer: Player;
}) => {
  return (
    <div>
      {gameInput.inputType === GameInputType.PLACE_WORKER ? (
        <GameInputPlaceWorkerSelector
          name={"gameInput.clientOptions.location"}
          viewingPlayer={viewingPlayer}
          locations={gameState.getPlayableLocations()}
        />
      ) : gameInput.inputType === GameInputType.PLAY_CARD ? (
        <GameInputPlayCard
          viewingPlayer={viewingPlayer}
          options={gameState.getPlayableCards()}
        />
      ) : gameInput.inputType === GameInputType.CLAIM_EVENT ? (
        <GameInputClaimEventSelector
          name={"gameInput.clientOptions.event"}
          viewingPlayer={viewingPlayer}
          events={gameState.getClaimableEvents()}
        />
      ) : gameInput.inputType === GameInputType.PREPARE_FOR_SEASON ? (
        <></>
      ) : gameInput.inputType === GameInputType.GAME_END ? (
        <></>
      ) : gameInput.inputType === GameInputType.DISCARD_CARDS ? (
        <GameInputDiscardCards
          name={"gameInput.clientOptions.cardsToDiscard"}
          gameInput={gameInput}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_RESOURCES ? (
        <GameInputSelectResources
          name={"gameInput.clientOptions.resources"}
          gameInput={gameInput}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_PLAYER ? (
        <GameInputSelectPlayer
          name={"gameInput.clientOptions.selectedPlayer"}
          gameInput={gameInput}
          gameState={gameState}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS ? (
        <GameInputSelectPlayedCards
          name={"gameInput.clientOptions.selectedCards"}
          gameInput={gameInput}
          gameState={gameState}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_CARDS ? (
        <GameInputSelectCards
          name={"gameInput.clientOptions.selectedCards"}
          gameInput={gameInput}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_PAYMENT_FOR_CARD ? (
        <GameInputSelectPaymentForCard
          name={"gameInput.clientOptions.paymentOptions.resources"}
          gameInput={gameInput}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_WORKER_PLACEMENT ? (
        <GameInputSelectWorkerPlacement
          name={"gameInput.clientOptions.selectedOption"}
          gameInput={gameInput}
          gameState={gameState}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC ? (
        <GameInputSelectOptionGeneric
          name={"gameInput.clientOptions.selectedOption"}
          gameInput={gameInput}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD ? (
        <GameInputVisitDestinationCard
          name={"gameInput.clientOptions.playedCard"}
          gameState={gameState}
          destinations={gameState.getVisitableDestinationCards()}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_LOCATION ? (
        <GameInputPlaceWorkerSelector
          name={"gameInput.clientOptions.selectedLocation"}
          viewingPlayer={viewingPlayer}
          locations={gameInput.locationOptions}
        />
      ) : (
        <>
          {assertUnreachable(
            gameInput,
            `Unexpected game input: ${JSON.stringify(gameInput, null, 2)}`
          )}
        </>
      )}
    </div>
  );
};

const getInitialSelectedGameInput = (
  gameInput: GameInput,
  gameState: GameState
): GameInput => {
  if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
    const claimableEvents = gameState.getClaimableEvents();
    if (claimableEvents.length === 1) {
      return {
        ...gameInput,
        clientOptions: {
          event: claimableEvents[0],
        },
      };
    }
  }
  return gameInput;
};

const GameInputBox: React.FC<{
  gameId: string;
  title?: string;
  devDebug?: boolean;
  gameState: GameStateJSON;
  gameInputs: GameInput[];
  viewingPlayer: Player;
}> = ({
  title = "Game Input",
  devDebug = false,
  gameId,
  gameState,
  gameInputs,
  viewingPlayer,
}) => {
  const gameStateImpl = GameState.fromJSON(gameState);
  const activePlayerImpl = gameStateImpl.getActivePlayer();
  if (gameStateImpl.getRemainingPlayers().length === 0) {
    return <GameInputBoxText title={title} text={`Game Over!`} />;
  }
  if (gameState.activePlayerId !== viewingPlayer.playerId) {
    return (
      <GameInputBoxText
        title={title}
        text={`Waiting for ${activePlayerImpl.name}`}
      />
    );
  }

  gameInputs.sort((a, b) =>
    (gameInputSortOrder[a.inputType] || 10) <
    (gameInputSortOrder[b.inputType] || 10)
      ? -1
      : 1
  );

  return (
    <GameInputBoxContainer
      title={title}
      gameId={gameId}
      devDebug={devDebug}
      viewingPlayer={viewingPlayer}
      initialValues={{
        gameInput: getInitialSelectedGameInput(gameInputs[0], gameStateImpl),
      }}
    >
      {({ values, setFieldValue, isSubmitting }) => {
        const selectedGameInput = values.gameInput;

        // For inputs that require selecting multiple things, update the button
        // text to say how many have been selected.
        let submitLabel = "Submit";
        if (selectedGameInput) {
          if (
            selectedGameInput.inputType === GameInputType.SELECT_CARDS ||
            selectedGameInput.inputType === GameInputType.SELECT_PLAYED_CARDS
          ) {
            const numSelected =
              selectedGameInput.clientOptions.selectedCards.length;
            submitLabel = `${numSelected} Selected`;
          } else if (
            selectedGameInput.inputType === GameInputType.DISCARD_CARDS
          ) {
            const numSelected =
              selectedGameInput.clientOptions.cardsToDiscard.length;
            submitLabel = `${numSelected} Selected`;
          }
        }

        return (
          <Form>
            {false && <pre>{JSON.stringify(values, null, 2)}</pre>}
            <div role="group">
              {gameInputs.map((gameInput, idx) => {
                const isSelected = isEqual(
                  omit(values.gameInput, ["clientOptions"]),
                  omit(gameInput, ["clientOptions"])
                );
                return (
                  <div key={idx} className={styles.input_type_radio}>
                    <label>
                      <input
                        type="radio"
                        name="selectedInputType"
                        value={idx}
                        checked={isSelected}
                        onChange={() => {
                          setFieldValue(
                            "gameInput",
                            getInitialSelectedGameInput(
                              gameInput,
                              gameStateImpl
                            )
                          );
                        }}
                      />
                      <span className={styles.input_type_radio_span}>
                        {renderGameInputLabel(gameInput)}
                      </span>
                    </label>
                    {isSelected && (
                      <div className={styles.input_type_form_nested}>
                        <GameInputBoxInner
                          gameInput={gameInput}
                          gameState={gameStateImpl}
                          viewingPlayer={viewingPlayer}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              className={styles.button}
              disabled={isSubmitting}
              type="submit"
            >
              {submitLabel}
            </button>
          </Form>
        );
      }}
    </GameInputBoxContainer>
  );
};

export default GameInputBox;
