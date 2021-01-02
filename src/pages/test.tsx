import * as React from "react";
import { useState, useEffect } from "react";

import Head from "next/head";
import styles from "../styles/test.module.css";

import { GameBlock } from "../components/common";
import Card from "../components/Card";
import Location from "../components/Location";
import Event from "../components/Event";
import { CardName, LocationName, EventName } from "../model/types";

const ItemsList: React.FC<{ title: string; visible: boolean }> = ({
  title,
  children,
  visible = true,
}) => {
  return visible ? (
    <GameBlock title={title}>
      <div className={styles.items}>{children}</div>
    </GameBlock>
  ) : (
    <></>
  );
};

export default function TestPage() {
  const allCards: CardName[] = Object.keys(CardName) as CardName[];
  const allLocations: LocationName[] = Object.keys(
    LocationName
  ) as LocationName[];

  const [showCards, setShowCards] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const cardsOnly = params.get("cards");
    const locationsOnly = params.get("locations");
    const showOneType = cardsOnly || locationsOnly;
    setShowCards(!!(cardsOnly || !showOneType));
    setShowLocations(!!(locationsOnly || !showOneType));
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Everdell Test Page</title>
      </Head>
      <div className={styles.filter}>
        <input
          type="text"
          placeholder="Filter items..."
          onChange={(e) => {
            setFilter(e.target.value.toLowerCase());
          }}
        />
      </div>
      <ItemsList title={"Cards"} visible={showCards}>
        {allCards
          .filter((x) => {
            return !filter || x.toLowerCase().indexOf(filter) !== -1;
          })
          .map((card) => {
            return <Card key={card} name={card} />;
          })}
      </ItemsList>
      <ItemsList title={"Locations"} visible={showLocations}>
        {allLocations
          .filter((x) => {
            return !filter || x.toLowerCase().indexOf(filter) !== -1;
          })
          .map((loc) => {
            return <Location key={loc} name={loc} />;
          })}
      </ItemsList>
      <ItemsList title={"Events"} visible={showLocations}>
        <Event name={EventName.SPECIAL_THE_EVERDELL_GAMES} />
        <Event name={EventName.SPECIAL_PRISTINE_CHAPEL_CEILING} />
      </ItemsList>
    </div>
  );
}
