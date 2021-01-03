import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { unstable_batchedUpdates } from "react-dom";

import { Meadow, Locations, Events } from "./gameBoard";
import Players from "./Players";
import ViewerUI from "./ViewerUI";
import GameInputBox from "./GameInputBox";
import GameLog from "./GameLog";
import GameUpdater from "./GameUpdater";
import { Player } from "../model/player";
import { CardName, GameInput } from "../model/types";
import { GameJSON, PlayerJSON } from "../model/jsonTypes";

import styles from "../styles/Game.module.css";

const Game: React.FC<{
  game: GameJSON;
  gameInputs: GameInput[];
  viewingPlayer: PlayerJSON;
}> = (props) => {
  const [game, setGame] = useState(props.game);
  const [gameInputs, setGameInputs] = useState(props.gameInputs);
  const [viewingPlayer, setViewingPlayer] = useState(props.viewingPlayer);
  const updateGameAndViewingPlayer = useCallback(
    ({ game, viewingPlayer, gameInputs }) => {
      unstable_batchedUpdates(() => {
        setGame(game);
        setViewingPlayer(viewingPlayer);
        setGameInputs(gameInputs);
      });
    },
    [game, viewingPlayer, gameInputs]
  );

  const { gameId, gameState } = game;
  const { playerId, playerSecret } = viewingPlayer;

  const viewingPlayerImpl = Player.fromJSON(viewingPlayer);
  return (
    <div className={styles.container}>
      <GameUpdater
        gameId={gameId}
        playerId={playerId}
        activePlayerId={gameState.activePlayerId}
        playerSecret={playerSecret as string}
        gameStateId={gameState.gameStateId}
        onUpdate={updateGameAndViewingPlayer}
      >
        <Meadow meadowCards={gameState.meadowCards} />
        <GameLog logs={game.gameLogBuffer} />
        <GameInputBox
          gameId={gameId}
          gameState={gameState}
          gameInputs={gameInputs}
          viewingPlayer={viewingPlayerImpl}
        />
        <Players viewingPlayer={viewingPlayerImpl} gameState={gameState} />
        <ViewerUI player={viewingPlayerImpl} />
        <Locations locationsMap={gameState.locationsMap} />
        <Events eventsMap={gameState.eventsMap} />
      </GameUpdater>
    </div>
  );
};

export default Game;
