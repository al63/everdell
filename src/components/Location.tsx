import * as React from "react";
import styles from "../styles/location.module.css";

import { Card as CardModel } from "../model/card";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { Location as LocationModel } from "../model/location";
import { sumResources } from "../model/gameStatePlayHelpers";
import {
  Season,
  ProductionResourceMap,
  ResourceType,
  LocationName,
  LocationType,
  LocationOccupancy,
} from "../model/types";
import { Description, ItemWrapper } from "./common";

const colorClassMap = {
  BASIC: styles.color_basic,
  FOREST: styles.color_forest,
  HAVEN: styles.color_haven,
  JOURNEY: styles.color_journey,
};

const resourceTypeList = [
  ResourceType.BERRY,
  ResourceType.TWIG,
  ResourceType.PEBBLE,
  ResourceType.RESIN,
  "CARD" as const,
];

const LocationDescription = ({ location }: { location: LocationModel }) => {
  if (location.description) {
    return <Description description={location.description} />;
  }

  if (sumResources(location.resourcesToGain) !== 0) {
    const description: string[] = [];
    const resourcesToGainKeys = Object.keys(location.resourcesToGain);
    for (let i = 0; i < resourcesToGainKeys.length; i++) {
      const resource = resourcesToGainKeys[i] as keyof ProductionResourceMap;
      const numResource = location.resourcesToGain[resource];
      if (numResource) {
        if (description.length !== 0) {
          if (i === resourcesToGainKeys.length - 1) {
            description.push(" & ");
          } else {
            description.push(", ");
          }
        }
        description.push(`${numResource} `, resource);
      }
    }
    return <Description description={description} />;
  }
  return <>{location.name}</>;
};

const LocationInner: React.FC<{ name: LocationName }> = ({ name }) => {
  const location = LocationModel.fromName(name as any);
  const colorClass = colorClassMap[location.type];
  return (
    <>
      <div className={[styles.location, colorClass].join(" ")}>
        <div className={styles.location_top}></div>
        <div className={styles.location_center}>
          <LocationDescription location={location} />
        </div>
        <div className={styles.location_bot}>
          <div className={styles.location_type}>{location.type}</div>
        </div>
      </div>
    </>
  );
};

const Location: React.FC<{
  name: LocationName;
  playerWorkers?: string[];
  viewingPlayer?: Player | null;
  gameState?: GameState | null;
}> = ({ name, playerWorkers = [], viewingPlayer = null, gameState = null }) => {
  const location = LocationModel.fromName(name);
  let acceptingWorkers = true;

  if (location.occupancy === LocationOccupancy.EXCLUSIVE) {
    acceptingWorkers = playerWorkers.length === 0;
  }
  if (viewingPlayer) {
    if (location.type === LocationType.JOURNEY) {
      acceptingWorkers = viewingPlayer.currentSeason === Season.AUTUMN;
    }
  }
  if (gameState) {
    if (location.occupancy === LocationOccupancy.EXCLUSIVE_FOUR) {
      acceptingWorkers =
        playerWorkers.length < (gameState.players.length < 4 ? 1 : 2);
    }
  }
  return (
    <ItemWrapper
      isDisabled={!acceptingWorkers}
      footerChildren={
        playerWorkers.length !== 0 && (
          <div className={styles.location_workers}>
            <span>Workers: </span>
            <span className={styles.location_worker}>
              {playerWorkers.join(", ")}
            </span>
          </div>
        )
      }
    >
      <LocationInner name={name} />
    </ItemWrapper>
  );
};

export default Location;
