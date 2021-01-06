import * as React from "react";
import { Event as EventModel } from "../model/event";
import { GameState } from "../model/gameState";
import styles from "../styles/event.module.css";
import {
  ResourceType,
  CardCost,
  CardType,
  CardName,
  PlayedCardInfo,
  EventName,
  EventType,
} from "../model/types";
import { Player } from "../model/player";
import { Description, CardTypeSymbol, ItemWrapper } from "./common";
import { sumResources } from "../model/gameStatePlayHelpers";

const EventInner: React.FC<{
  name: EventName;
}> = ({ name }) => {
  const event = EventModel.fromName(name as any);
  return (
    <>
      <div className={styles.event}>
        {event.type === EventType.BASIC ? (
          <div className={styles.event_basic}>
            <Description textParts={event.eventRequirementsDescription || []} />
          </div>
        ) : (
          <>
            <div className={styles.event_row}>
              <div className={styles.event_header}>
                {event.requiredCards ? (
                  <>
                    <Description
                      textParts={[
                        event.requiredCards[0],
                        ", ",
                        event.requiredCards[1],
                      ]}
                    />
                  </>
                ) : (
                  name
                )}
              </div>
            </div>
            {event.eventRequirementsDescription && (
              <div className={styles.event_row}>
                <Description textParts={event.eventRequirementsDescription} />
              </div>
            )}
            {event.eventDescription && (
              <div className={styles.event_row}>
                <Description textParts={event.eventDescription} />
              </div>
            )}
          </>
        )}
        {event.baseVP ? (
          <div className={styles.base_vp}>
            <Description textParts={[`${event.baseVP} `, "VP"]} />
          </div>
        ) : null}
      </div>
    </>
  );
};

export const Event = ({
  name,
  claimedBy = null,
}: {
  name: EventName;
  claimedBy?: string | null;
}) => {
  return (
    <ItemWrapper
      isDisabled={!!claimedBy}
      footerChildren={
        claimedBy && (
          <div className={styles.claimed_by}>
            <span className={styles.claimed_by_text}>
              {"✔ "}
              {claimedBy}
            </span>
          </div>
        )
      }
    >
      <EventInner name={name} />
    </ItemWrapper>
  );
};

export default Event;
