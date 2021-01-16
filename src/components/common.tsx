import * as React from "react";
import Image from "next/image";

import styles from "../styles/common.module.css";
import { Event } from "../model/event";
import { Location } from "../model/location";
import { GameText, TextPart, ResourceType, CardType } from "../model/types";
import { assertUnreachable } from "../utils";

export const GameBlockTitle: React.FC = ({ children }) => {
  return <div className={styles.title}>{children}</div>;
};

export const GameBlock: React.FC<{ title: string }> = ({ title, children }) => {
  return (
    <div className={styles.block}>
      <GameBlockTitle>{title}</GameBlockTitle>
      {children}
    </div>
  );
};

export const CardTypeSymbol = ({ cardType }: { cardType: CardType }) => {
  return (
    <>
      {cardType === CardType.PRODUCTION ? (
        <Image src="/images/production.png" layout="fill" />
      ) : cardType === CardType.GOVERNANCE ? (
        <Image src="/images/governance.png" layout="fill" />
      ) : cardType === CardType.DESTINATION ? (
        <Image src="/images/destination.png" layout="fill" />
      ) : cardType === CardType.PROSPERITY ? (
        <Image src="/images/prosperity.png" layout="fill" />
      ) : cardType === CardType.TRAVELER ? (
        <Image src="/images/traveler.png" layout="fill" />
      ) : (
        <>{cardType}</>
      )}
    </>
  );
};

export const CardIcon = () => {
  return <Image src="/images/card.png" layout="fill" />;
};

export const WorkerSpotIcon = () => {
  return <Image src="/images/worker_spot.png" layout="fill" />;
};

export const EmptyCitySpotIcon = () => {
  return <Image src="/images/city_slot.png" layout="fill" />;
};

export const VPIcon = () => {
  return <Image src="/images/vp.png" layout="fill" />;
};

export const WildResourceIcon = () => {
  return <Image src="/images/wild_resource.png" layout="fill" />;
};

export const ResourceTypeIcon = ({
  resourceType,
}: {
  resourceType: ResourceType;
}) => {
  return (
    <>
      {resourceType === ResourceType.BERRY ? (
        <Image src="/images/berry.png" layout="fill" />
      ) : resourceType === ResourceType.TWIG ? (
        <Image src="/images/twig.png" layout="fill" />
      ) : resourceType === ResourceType.PEBBLE ? (
        <Image src="/images/pebble.png" layout="fill" />
      ) : resourceType === ResourceType.RESIN ? (
        <Image src="/images/resin.png" layout="fill" />
      ) : (
        <>{resourceType}</>
      )}
    </>
  );
};

export const GameIcon = ({
  type,
}: {
  type: CardType | ResourceType | "CARD" | "VP" | "ANY";
}) => {
  return (
    <div className={styles.resource}>
      <div className={styles.resource_inner}>
        {type === "CARD" ? (
          <CardIcon />
        ) : type === "VP" ? (
          <VPIcon />
        ) : type === "ANY" ? (
          <WildResourceIcon />
        ) : Object.values(ResourceType).includes(type as any) ? (
          <ResourceTypeIcon resourceType={type as ResourceType} />
        ) : Object.values(CardType).includes(type as any) ? (
          <CardTypeSymbol cardType={type as CardType} />
        ) : (
          type
        )}
      </div>
    </div>
  );
};

const ICON_TYPES: Record<any, any> = {
  ...ResourceType,
  ...CardType,
  CARD: "CARD",
  VP: "VP",
  ANY: "ANY",
};

const cardTypeList = [];

export const Description = ({ textParts }: { textParts: GameText }) => {
  return textParts ? (
    <span>
      {textParts.map((part: TextPart, idx: number) => {
        switch (part.type) {
          case "text":
            return part.text;
          case "em":
            return (
              <span key={idx} className={styles.em_part}>
                {part.text}
              </span>
            );
          case "BR":
            return <br key={idx} />;
          case "HR":
            return <hr key={idx} />;
          case "resource":
            return <GameIcon key={idx} type={part.resourceType} />;
          case "cardType":
            return <GameIcon key={idx} type={part.cardType} />;
          case "symbol":
            return <GameIcon key={idx} type={part.symbol} />;
          case "player":
            return (
              <span key={idx} className={styles.player_part}>
                {part.name}
              </span>
            );
          case "entity":
            if (part.entityType === "event") {
              return (
                <span key={idx} className={styles.entity_part}>
                  <Description
                    textParts={Event.fromName(part.event).getShortName()}
                  />
                </span>
              );
            }
            if (part.entityType === "location") {
              return (
                <span key={idx} className={styles.entity_part}>
                  <Description
                    textParts={Location.fromName(part.location).shortName}
                  />
                </span>
              );
            }
            if (part.entityType === "card") {
              return (
                <span key={idx} className={styles.entity_part}>
                  <Description
                    textParts={[{ type: "text", text: part.card }]}
                  />
                </span>
              );
            }
          default:
            assertUnreachable(part, `Unexpected part: ${JSON.stringify(part)}`);
        }
      })}
    </span>
  ) : null;
};

export const ItemWrapper: React.FC<{
  isHighlighted?: boolean;
  footerChildren?: any;
}> = ({ isHighlighted = false, footerChildren = null, children }) => {
  return (
    <div className={styles.item_wrapper}>
      <div className={isHighlighted ? styles.item_highlighted : undefined}>
        {children}
      </div>
      <div className={styles.item_footer}>{footerChildren}</div>
    </div>
  );
};
