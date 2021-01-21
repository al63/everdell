import * as React from "react";
import { useField } from "formik";
import isEqual from "lodash/isEqual";
import uniqBy from "lodash/uniqBy";

import styles from "../styles/gameBoard.module.css";

import { GameInputSelectWorkerPlacement as TGameInputSelectWorkerPlacement } from "../model/types";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";

import { ItemWrapper } from "./common";
import { EventInner as Event } from "./Event";
import { LocationInner as Location } from "./Location";
import { PlayedCard } from "./Card";

const GameInputSelectWorkerPlacement: React.FC<{
  gameInput: TGameInputSelectWorkerPlacement;
  name: string;
  gameState: GameState;
  viewingPlayer: Player;
}> = ({ gameInput, name, gameState, viewingPlayer }) => {
  const [_field, meta, helpers] = useField(name);

  const options = gameInput.options;
  const eventOptions = options.filter((x) => x.event);
  const locationOptions = options.filter((x) => x.location);
  const playedCardOptions = options.filter((x) => x.playedCard);
  return (
    <div className={styles.items}>
      {uniqBy(eventOptions, (x) => x.event)
        .concat(uniqBy(locationOptions, (x) => x.location))
        .concat(playedCardOptions)
        .map((workerOption: any, idx: number) => {
          const isSelected = isEqual(meta.value, workerOption);
          return (
            <div
              key={idx}
              className={styles.clickable}
              onClick={() => {
                if (!isSelected) {
                  helpers.setValue(workerOption);
                } else {
                  helpers.setValue(null);
                }
              }}
            >
              <ItemWrapper isHighlighted={isSelected}>
                {workerOption.event ? (
                  <Event name={workerOption.event} />
                ) : workerOption.location ? (
                  <Location name={workerOption.location} />
                ) : workerOption.playedCard ? (
                  <PlayedCard
                    playedCard={workerOption.playedCard}
                    cardOwner={gameState.getPlayer(
                      workerOption.playedCard.cardOwnerId
                    )}
                    viewerId={viewingPlayer.playerId}
                  />
                ) : null}
              </ItemWrapper>
            </div>
          );
        })}
    </div>
  );
};

export default GameInputSelectWorkerPlacement;
