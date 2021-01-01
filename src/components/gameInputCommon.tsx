import * as React from "react";
import { Formik, FormikProps } from "formik";

import { GameInput, GameInputType } from "../model/types";
import { Player } from "../model/player";
import { GameBlock } from "./common";

type TValues = {
  selectedInputType: GameInputType;
  gameInput: GameInput | null;
};

export const GameInputBoxContainer: React.FC<{
  title: string;
  gameId: string;
  viewingPlayer: Pick<Player, "playerId" | "playerSecretUNSAFE">;
  devDebug?: boolean;
  initialValues: TValues;
  children: (props: FormikProps<TValues>) => React.ReactNode;
}> = ({
  gameId,
  title,
  initialValues,
  viewingPlayer,
  children,
  devDebug = false,
}) => {
  return (
    <GameBlock title={title}>
      <p>Perform an action:</p>
      <Formik
        initialValues={initialValues}
        onSubmit={async (values) => {
          const response = await fetch("/api/game-action", {
            method: "POST",
            cache: "no-cache",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              gameId,
              playerId: viewingPlayer.playerId,
              playerSecret: viewingPlayer.playerSecretUNSAFE,
              gameInput: values.gameInput,
            }),
          });
          const json = await response.json();
          if (!json.success) {
            alert(json.error);
          } else if (devDebug) {
            window.location.reload();
          }
        }}
      >
        {children}
      </Formik>
    </GameBlock>
  );
};
