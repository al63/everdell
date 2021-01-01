import * as React from "react";
import { Player } from "../model/player";
import styles from "../styles/ViewerUI.module.css";

import { GameBlock } from "./common";
import { PlayerCity } from "./gameBoard";
import Card from "./Card";

const ViewerUI: React.FC<{
  player: Player;
}> = ({ player }) => {
  return (
    <>
      <GameBlock title={"Your hand"}>
        <div className={styles.cards}>
          {player.cardsInHand.map((cardName, idx) => (
            <Card key={idx} name={cardName} />
          ))}
        </div>
      </GameBlock>
      <GameBlock title={"Your City"}>
        <PlayerCity player={player} viewerId={player.playerId} />
      </GameBlock>
    </>
  );
};

export default ViewerUI;
