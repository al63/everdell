import * as React from "react";
import { useCallback, useEffect } from "react";
import { CardName, GameInput } from "../model/types";
import { GameJSON, PlayerJSON } from "../model/jsonTypes";

export const GameUpdaterContext = React.createContext<() => void>(() => {});

const GameUpdater: React.FC<{
  gameId: string;
  activePlayerId: string;
  playerId: string;
  playerSecret: string;
  gameStateId: number;
  onUpdate: (responseJSON: {
    game: GameJSON;
    viewingPlayer: PlayerJSON;
    gameInputs: GameInput[];
  }) => void;
}> = ({
  children,
  gameId,
  playerId,
  playerSecret,
  activePlayerId,
  gameStateId,
  onUpdate,
}) => {
  const updateGameState = useCallback(async () => {
    const queryParts = [
      `gameId=${gameId}`,
      `playerId=${playerId}`,
      `playerSecret=${playerSecret}`,
      `gameStateId=${gameStateId}`,
    ];
    const response = await fetch(`/api/game-updates?${queryParts.join("&")}`, {
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 200) {
      const json = await response.json();
      onUpdate(json);
    }
  }, [children, gameId, playerId, playerSecret, gameStateId, onUpdate]);
  useEffect(() => {
    let timer: any = null;
    if (activePlayerId !== playerId) {
      timer = setInterval(updateGameState, 2000);
    }
    return () => {
      clearInterval(timer);
    };
  }, [activePlayerId]);
  return (
    <GameUpdaterContext.Provider value={updateGameState}>
      {children}
    </GameUpdaterContext.Provider>
  );
};

export default GameUpdater;