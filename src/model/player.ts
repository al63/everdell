import {
  CardCost,
  CardName,
  CardType,
  EventName,
  Season,
  ResourceType,
  GameInput,
  GameInputType,
  PlayedCardInfo,
  PlayedEventInfo,
  PlacedWorkerInfo,
  LocationName,
} from "./types";
import { PlayerJSON } from "./jsonTypes";
import cloneDeep from "lodash/cloneDeep";
import { GameState } from "./gameState";
import { Card } from "./card";
import { Event } from "./event";
import { generate as uuid } from "short-uuid";
import { sumResources } from "./gameStatePlayHelpers";
import pull from "lodash/pull";

const MAX_HAND_SIZE = 8;
const MAX_CITY_SIZE = 15;

export class Player {
  private playerSecret: string;

  public name: string;
  public playerId: string;
  public cardsInHand: CardName[];
  public currentSeason: Season;

  private resources: Record<ResourceType, number>;
  readonly playedCards: Partial<Record<CardName, PlayedCardInfo[]>>;
  readonly claimedEvents: Partial<Record<EventName, PlayedEventInfo>>;

  private numWorkers: number;
  private placedWorkers: PlacedWorkerInfo[];

  constructor({
    name,
    playerSecret = uuid(),
    playerId = uuid(),
    playedCards = {},
    cardsInHand = [],
    resources = {
      [ResourceType.VP]: 0,
      [ResourceType.TWIG]: 0,
      [ResourceType.BERRY]: 0,
      [ResourceType.PEBBLE]: 0,
      [ResourceType.RESIN]: 0,
    },
    currentSeason = Season.WINTER,
    numWorkers = 2,
    claimedEvents = {},
    placedWorkers = [],
  }: {
    name: string;
    playerSecret?: string;
    playerId?: string;
    playedCards?: Partial<Record<CardName, PlayedCardInfo[]>>;
    cardsInHand?: CardName[];
    resources?: {
      [ResourceType.VP]: number;
      [ResourceType.TWIG]: number;
      [ResourceType.BERRY]: number;
      [ResourceType.PEBBLE]: number;
      [ResourceType.RESIN]: number;
    };
    currentSeason?: Season;
    numWorkers?: number;
    claimedEvents?: Partial<Record<EventName, PlayedEventInfo>>;
    placedWorkers?: PlacedWorkerInfo[];
  }) {
    this.playerId = playerId;
    this.playerSecret = playerSecret;
    this.name = name;
    this.playedCards = playedCards;
    this.cardsInHand = cardsInHand;
    this.resources = resources;
    this.currentSeason = currentSeason;
    this.numWorkers = numWorkers;
    this.claimedEvents = claimedEvents;
    this.placedWorkers = placedWorkers;
  }

  get playerSecretUNSAFE(): string {
    return this.playerSecret;
  }

  drawCards(gameState: GameState, count: number): void {
    for (let i = 0; i < count; i++) {
      const drawnCard = gameState.drawCard();
      this.addCardToHand(gameState, drawnCard);
    }
  }

  drawMaxCards(gameState: GameState): void {
    this.drawCards(gameState, MAX_HAND_SIZE - this.cardsInHand.length);
  }

  addCardToHand(gameState: GameState, cardName: CardName): void {
    if (this.cardsInHand.length < MAX_HAND_SIZE) {
      this.cardsInHand.push(cardName);
    } else {
      gameState.discardPile.addToStack(cardName);
    }
  }

  removeCardFromHand(cardName: CardName): void {
    const idx = this.cardsInHand.indexOf(cardName);
    if (idx === -1) {
      throw new Error(`Unable to discard ${cardName}`);
    } else {
      this.cardsInHand.splice(idx, 1);
    }
  }

  addToCity(cardName: CardName): void {
    if (!this.canAddToCity(cardName)) {
      throw new Error(`Unable to add ${cardName} to city`);
    }
    const card = Card.fromName(cardName);
    this.playedCards[cardName] = this.playedCards[cardName] || [];
    this.playedCards[cardName]!.push(card.getPlayedCardInfo(this.playerId));
  }

  removeCardFromCity(
    gameState: GameState,
    cardName: CardName,
    addToDiscardPile = true
  ): CardName[] {
    if (this.playedCards[cardName]) {
      this.playedCards[cardName]!.pop();
    } else {
      throw new Error(`Unable to remove ${cardName}`);
    }
    // TODO: handle cards that contain other cards (eg. dungeon)
    const removedCards = [cardName];
    if (addToDiscardPile) {
      removedCards.forEach((card) => {
        gameState.discardPile.addToStack(card);
      });
    }
    return removedCards;
  }

  canAddToCity(cardName: CardName): boolean {
    const card = Card.fromName(cardName);
    if (card.isUnique && this.hasCardInCity(card.name)) {
      return false;
    }

    // Can always play wanderer
    if (cardName === CardName.WANDERER) {
      return true;
    }

    // TODO: Innkeeper, husband/wife, ruins, dungeoning

    let numOccupiedSpacesInCity = 0;
    this.forEachPlayedCard(({ cardName }) => {
      if (cardName === CardName.WANDERER) {
        return;
      }
      numOccupiedSpacesInCity += 1;
    });

    // Only count each husband/wife pair once
    numOccupiedSpacesInCity -= this.getNumHusbandWifePairs();
    return numOccupiedSpacesInCity <= MAX_CITY_SIZE;
  }

  hasCardInCity(cardName: CardName): boolean {
    return this.getPlayedCardInfos(cardName).length !== 0;
  }

  useConstructionToPlayCritter(cardName: CardName): void {
    const card = Card.fromName(cardName);
    if (!card.isConstruction) {
      throw new Error("Can only occupy construction");
    }
    let didOccupy = false;
    this.getPlayedCardInfos(cardName).forEach((playedCardInfo) => {
      if (!didOccupy && !playedCardInfo.usedForCritter) {
        playedCardInfo.usedForCritter = true;
        didOccupy = true;
      }
    });
    if (!didOccupy) {
      throw new Error("No unoccupied construction found");
    }
  }

  getNumHusbandWifePairs(): number {
    const numHusbands = (this.playedCards[CardName.HUSBAND] || []).length;
    const numWifes = (this.playedCards[CardName.WIFE] || []).length;
    return Math.min(numHusbands, numWifes);
  }

  getNumResources(): number {
    return sumResources(this.resources);
  }

  getNumResourcesByType(resourceType: ResourceType): number {
    return this.resources[resourceType];
  }

  getPlayedCritters(): CardName[] {
    const crittersInCity: CardName[] = [];
    this.forEachPlayedCard(({ cardName }) => {
      const card = Card.fromName(cardName as CardName);
      if (card.isCritter) {
        crittersInCity.push(card.name);
      }
    });
    return crittersInCity;
  }

  getPlayedCardByType(cardType: CardType): CardName[] {
    const cards: CardName[] = [];
    this.forEachPlayedCard(({ cardName }) => {
      const card = Card.fromName(cardName);
      if (card.cardType == cardType) {
        cards.push(cardName);
      }
    });
    return cards;
  }

  forEachPlayedCard(callback: (playedCardInfo: PlayedCardInfo) => void): void {
    (Object.values(this.playedCards) as PlayedCardInfo[][]).forEach(
      (playedCards) => {
        playedCards.forEach(callback);
      }
    );
  }

  getNumCardsInCity(): number {
    let total = 0;
    this.forEachPlayedCard(() => {
      total += 1;
    });
    return total;
  }

  getNumCardType(cardType: CardType): number {
    let numCards = 0;
    this.forEachPlayedCard(({ cardName }) => {
      const card = Card.fromName(cardName as CardName);
      if (card.cardType === cardType) {
        numCards += 1;
      }
    });
    return numCards;
  }

  getAllDestinationCards(): CardName[] {
    const ret: CardName[] = [];
    this.forEachPlayedCard(({ cardName }) => {
      const card = Card.fromName(cardName as CardName);
      if (card.canTakeWorker()) {
        ret.push(cardName);
      }
    });
    return ret;
  }

  // returns all destination cards that a player has played that have
  // room for another worker
  getAllAvailableDestinationCards(): CardName[] {
    return this.getAllDestinationCards().filter((cardName) => {
      return this.hasSpaceOnDestinationCard(cardName);
    });
  }

  // returns all destination cards (including storehouse) that have a worker on them
  getDestinationCardsWithWorkers(): CardName[] {
    const destinationCardsWithWorkers: CardName[] = [];
    this.forEachPlayedCard(({ cardName, workers = [], maxWorkers = 1 }) => {
      const card = Card.fromName(cardName);
      if (!card.canTakeWorker()) {
        return;
      }
      if (workers.length > 0) {
        destinationCardsWithWorkers.push(cardName);
      }
    });
    return destinationCardsWithWorkers;
  }

  // returns all non-Open destination or storehouse cards that were played by player and
  // are available for them to put a worker on
  getAvailableClosedDestinationCards(): CardName[] {
    return this.getAllAvailableDestinationCards().filter((cardName) => {
      const card = Card.fromName(cardName);
      return !card.isOpenDestination;
    });
  }

  // returns all destination cards played by this player that are "open"
  // and are available to take other workers
  getAvailableOpenDestinationCards(): CardName[] {
    return this.getAllAvailableDestinationCards().filter((cardName) => {
      const card = Card.fromName(cardName);
      return card.isOpenDestination;
    });
  }

  // returns all destination cards played by this player that are "open"
  getOpenDestinationCards(): CardName[] {
    return this.getAllDestinationCards().filter((cardName) => {
      const card = Card.fromName(cardName);
      return card.isOpenDestination;
    });
  }

  getPlayedCardInfos(cardName: CardName): PlayedCardInfo[] {
    const playedCardInfos = this.playedCards[cardName];
    return playedCardInfos || [];
  }

  hasUnusedByCritterConstruction(cardName: CardName): boolean {
    return !!(
      Card.fromName(cardName).isConstruction &&
      this.playedCards[cardName]?.some(
        (playedCard) => !playedCard.usedForCritter
      )
    );
  }

  canInvokeDungeon(): boolean {
    const playedDungeon = this.playedCards[CardName.DUNGEON]?.[0];
    if (!playedDungeon) {
      return false;
    }

    const numDungeoned = playedDungeon.pairedCards?.length || 0;
    const maxDungeoned = this.hasCardInCity(CardName.RANGER) ? 2 : 1;

    // Need to have a critter to dungeon
    const playedCritters = this.getPlayedCritters();
    if (
      playedCritters.length === 0 ||
      (playedCritters.length === 1 && playedCritters[0] === CardName.RANGER)
    ) {
      return false;
    }

    return numDungeoned < maxDungeoned;
  }

  get numAvailableWorkers(): number {
    return this.numWorkers - this.placedWorkers.length;
  }

  placeWorkerOnLocation(location: LocationName): void {
    this.placeWorkerCommon({
      location,
    });
  }

  placeWorkerOnEvent(eventName: EventName): void {
    this.placeWorkerCommon({ event: eventName });

    const event = Event.fromName(eventName);
    this.claimedEvents[eventName] = event.getPlayedEventInfo();
  }

  placeWorkerOnCard(cardName: CardName, cityOwner: Player | null = null): void {
    if (!this.canPlaceWorkerOnCard(cardName, cityOwner)) {
      throw new Error(`Cannot place worker on ${cardName}`);
    }
    cityOwner = cityOwner || this;
    this.placeWorkerCommon({
      cardDestination: {
        card: cardName,
        playerId: cityOwner.playerId,
      },
    });

    const playedCards = cityOwner.getPlayedCardInfos(cardName);
    if (playedCards.length === 0) {
      throw new Error("Can't find played cards");
    }

    // Put the given playerId's worker on the card
    for (let i = 0; i < playedCards.length; i++) {
      const cardInfo = playedCards[i];
      const workers = cardInfo.workers || [];
      const maxWorkers = cardInfo.maxWorkers || 1;
      if (workers.length < maxWorkers) {
        cardInfo.workers = cardInfo.workers || [];
        cardInfo.workers.push(this.playerId);
        break;
      }
    }
  }

  private placeWorkerCommon(placedWorkerInfo: PlacedWorkerInfo): void {
    if (this.numAvailableWorkers === 0) {
      throw new Error(`Cannot place worker`);
    }
    this.placedWorkers.push(placedWorkerInfo);
  }

  canPlaceWorkerOnCard(
    cardName: CardName,
    cityOwner: Player | null = null
  ): boolean {
    if (this.numAvailableWorkers <= 0) {
      return false;
    }
    const card = Card.fromName(cardName);
    cityOwner = cityOwner || this;
    if (!cityOwner.hasCardInCity(cardName)) {
      return false;
    }
    if (cityOwner.playerId !== this.playerId && !card.isOpenDestination) {
      return false;
    }
    return cityOwner.hasSpaceOnDestinationCard(cardName);
  }

  hasSpaceOnDestinationCard(cardName: CardName): boolean {
    if (!this.hasCardInCity(cardName)) {
      return false;
    }
    return !!this.getPlayedCardInfos(cardName).some((playedCard) => {
      const workers = playedCard.workers || [];
      const maxWorkers = playedCard.maxWorkers || 1;
      return workers.length < maxWorkers;
    });
  }

  canAffordCard(cardName: CardName, isMeadowCard: boolean): boolean {
    const card = Card.fromName(cardName);

    // Check if you have the associated construction if card is a critter
    if (card.isCritter) {
      if (this.hasUnusedByCritterConstruction(CardName.EVERTREE)) {
        return true;
      }
      if (
        card.associatedCard &&
        this.hasUnusedByCritterConstruction(card.associatedCard)
      ) {
        return true;
      }
    }

    // Queen (below 3 vp free)
    if (card.baseVP <= 3 && this.canPlaceWorkerOnCard(CardName.QUEEN)) {
      return true;
    }

    // Innkeeper (3 berries less)
    if (
      card.baseCost[ResourceType.BERRY] &&
      card.isCritter &&
      this.hasCardInCity(CardName.INNKEEPER) &&
      this.isPaidResourcesValid(
        this.resources,
        card.baseCost,
        ResourceType.BERRY,
        false
      )
    ) {
      return true;
    }
    const wildDiscount =
      // Dungeon
      this.canInvokeDungeon() ||
      // Inn
      (isMeadowCard && this.canPlaceWorkerOnCard(CardName.INN)) ||
      // Crane
      (card.isConstruction && this.hasCardInCity(CardName.CRANE));
    return this.isPaidResourcesValid(
      this.resources,
      card.baseCost,
      wildDiscount ? "ANY" : null,
      false
    );
  }

  isPaidResourcesValid(
    paidResources: CardCost,
    cardCost: CardCost,
    // Discounts are exclusive so we use a single argument to represent them
    discount: ResourceType.BERRY | "ANY" | null = null,
    errorIfOverpay = true
  ): boolean {
    const needToPay = {
      [ResourceType.TWIG]: cardCost[ResourceType.TWIG] || 0,
      [ResourceType.BERRY]: cardCost[ResourceType.BERRY] || 0,
      [ResourceType.PEBBLE]: cardCost[ResourceType.PEBBLE] || 0,
      [ResourceType.RESIN]: cardCost[ResourceType.RESIN] || 0,
    };
    const payingWith = {
      [ResourceType.TWIG]: paidResources[ResourceType.TWIG] || 0,
      [ResourceType.BERRY]: paidResources[ResourceType.BERRY] || 0,
      [ResourceType.PEBBLE]: paidResources[ResourceType.PEBBLE] || 0,
      [ResourceType.RESIN]: paidResources[ResourceType.RESIN] || 0,
    };
    const outstandingOwed = {
      [ResourceType.TWIG]: 0,
      [ResourceType.BERRY]: 0,
      [ResourceType.PEBBLE]: 0,
      [ResourceType.RESIN]: 0,
    };

    const needToPaySum = sumResources(needToPay);
    const payingWithSum = sumResources(payingWith);

    // Take discounts first
    if (discount === ResourceType.BERRY) {
      needToPay[ResourceType.BERRY] = Math.max(
        0,
        needToPay[ResourceType.BERRY] - 3
      );
    }

    (Object.entries(needToPay) as [keyof CardCost, number][]).forEach(
      ([resourceType, count]) => {
        if (count <= payingWith[resourceType]) {
          payingWith[resourceType] -= count;
        } else {
          count -= payingWith[resourceType];
          payingWith[resourceType] = 0;
          outstandingOwed[resourceType] += count;
        }
      }
    );

    const outstandingOwedSum = sumResources(outstandingOwed);
    const payingWithRemainerSum = sumResources(payingWith);

    // With wild discount, should have outstandingOwedSum left
    if (discount === "ANY" && outstandingOwedSum <= 3) {
      if (
        errorIfOverpay &&
        payingWithSum !== 0 &&
        payingWithSum + 3 > needToPaySum
      ) {
        throw new Error("Cannot overpay for cards");
      }
      return true;
    }

    // Can only use judge if no other discounts are in effect
    if (!discount && this.hasCardInCity(CardName.JUDGE)) {
      if (outstandingOwedSum === 1) {
        if (payingWithRemainerSum >= 1) {
          if (errorIfOverpay && payingWithRemainerSum !== 1) {
            throw new Error("Cannot overpay for cards");
          }
          return true;
        }
      }
    }
    if (
      outstandingOwedSum === 0 &&
      payingWithRemainerSum !== 0 &&
      errorIfOverpay
    ) {
      throw new Error("Cannot overpay for cards");
    }
    return outstandingOwedSum === 0;
  }

  payForCard(
    gameState: GameState,
    gameInput: GameInput & { inputType: GameInputType.PLAY_CARD }
  ): void {
    if (!gameInput.paymentOptions || !gameInput.paymentOptions.resources) {
      throw new Error("Invalid input");
    }
    const paymentOptions = gameInput.paymentOptions;
    const paymentResources = paymentOptions.resources;

    this.spendResources(paymentResources);
    if (paymentOptions.cardToDungeon) {
      throw new Error("Not Implemented yet");
    } else if (paymentOptions.cardToUse) {
      switch (paymentOptions.cardToUse) {
        case CardName.CRANE:
          this.removeCardFromCity(gameState, paymentOptions.cardToUse);
          break;
        case CardName.INNKEEPER:
          this.removeCardFromCity(gameState, paymentOptions.cardToUse);
          break;
        case CardName.QUEEN:
          // TODO place worker
          break;
        case CardName.INN:
          // TODO place worker
          break;
        default:
          throw new Error(`Unexpected card: ${paymentOptions.cardToUse}`);
      }
    }
  }

  isPaymentOptionsValid(
    gameInput: GameInput & { inputType: GameInputType.PLAY_CARD }
  ): boolean {
    if (!gameInput.paymentOptions || !gameInput.paymentOptions.resources) {
      throw new Error("Invalid input");
    }
    const paymentOptions = gameInput.paymentOptions;
    const paymentResources = paymentOptions.resources;

    // Validate if player has resources specified by payment options
    (Object.entries(paymentResources) as [ResourceType, number][]).forEach(
      ([resourceType, count]) => {
        if (this.getNumResourcesByType(resourceType) < count) {
          throw new Error(`Can't spend ${count} ${resourceType}`);
        }
      }
    );

    // Validate if payment options are valid for the card
    const cardToPlay = Card.fromName(gameInput.card);
    if (paymentOptions.cardToDungeon) {
      if (!this.canInvokeDungeon()) {
        throw new Error("Invalid paymentOptions: cannot use dungeon");
      }
      if (!Card.fromName(paymentOptions.cardToDungeon).isCritter) {
        throw new Error("Invalid paymentOptions: can only dungeon critter");
      }
      return this.isPaidResourcesValid(
        paymentResources,
        cardToPlay.baseCost,
        "ANY"
      );
    }
    if (paymentOptions.cardToUse) {
      if (!this.hasCardInCity(paymentOptions.cardToUse)) {
        throw new Error(
          `Invalid paymentOptions: cannot use ${paymentOptions.cardToUse}`
        );
      }
      switch (paymentOptions.cardToUse) {
        case CardName.CRANE:
          if (!cardToPlay.isConstruction) {
            throw new Error(
              `Invalid paymentOptions: Cannot use Crane on ${cardToPlay.name}`
            );
          }
          return this.isPaidResourcesValid(
            paymentResources,
            cardToPlay.baseCost,
            "ANY"
          );
        case CardName.QUEEN:
          if (cardToPlay.baseVP > 3) {
            throw new Error(
              `Invalid paymentOptions: Cannot use Queen to play ${cardToPlay.name}`
            );
          }
          return true;
        case CardName.INN:
          // TODO check if we can place a worker here
          if (!gameInput.fromMeadow) {
            throw new Error(
              `Invalid paymentOptions: Cannot use Inn on non-meadow card`
            );
          }
          return this.isPaidResourcesValid(
            paymentResources,
            cardToPlay.baseCost,
            "ANY"
          );
        case CardName.INNKEEPER:
          if (!cardToPlay.isCritter) {
            throw new Error(
              `Invalid paymentOptions: Cannot use Innkeeper on ${cardToPlay.name}`
            );
          }
          return this.isPaidResourcesValid(
            paymentResources,
            cardToPlay.baseCost,
            ResourceType.BERRY
          );

        default:
          throw new Error(`Unexpected card: ${paymentOptions.cardToUse}`);
      }
    }
    return this.isPaidResourcesValid(paymentResources, cardToPlay.baseCost);
  }

  spendResources({
    VP = 0,
    TWIG = 0,
    BERRY = 0,
    PEBBLE = 0,
    RESIN = 0,
  }: {
    [ResourceType.VP]?: number;
    [ResourceType.TWIG]?: number;
    [ResourceType.BERRY]?: number;
    [ResourceType.PEBBLE]?: number;
    [ResourceType.RESIN]?: number;
  }): void {
    if (VP) {
      if (this.resources[ResourceType.VP] < VP) {
        throw new Error(`Insufficient ${ResourceType.VP}`);
      }
      this.resources[ResourceType.VP] -= VP;
    }
    if (TWIG) {
      if (this.resources[ResourceType.TWIG] < TWIG) {
        throw new Error(`Insufficient ${ResourceType.TWIG}`);
      }
      this.resources[ResourceType.TWIG] -= TWIG;
    }
    if (BERRY) {
      if (this.resources[ResourceType.BERRY] < BERRY) {
        throw new Error(`Insufficient ${ResourceType.BERRY}`);
      }
      this.resources[ResourceType.BERRY] -= BERRY;
    }
    if (PEBBLE) {
      if (this.resources[ResourceType.PEBBLE] < PEBBLE) {
        throw new Error(`Insufficient ${ResourceType.PEBBLE}`);
      }
      this.resources[ResourceType.PEBBLE] -= PEBBLE;
    }
    if (RESIN) {
      if (this.resources[ResourceType.RESIN] < RESIN) {
        throw new Error(`Insufficient ${ResourceType.RESIN}`);
      }
      this.resources[ResourceType.RESIN] -= RESIN;
    }
  }

  gainResources({
    VP = 0,
    TWIG = 0,
    BERRY = 0,
    PEBBLE = 0,
    RESIN = 0,
  }: {
    [ResourceType.VP]?: number;
    [ResourceType.TWIG]?: number;
    [ResourceType.BERRY]?: number;
    [ResourceType.PEBBLE]?: number;
    [ResourceType.RESIN]?: number;
  }): void {
    if (VP) {
      this.resources[ResourceType.VP] += VP;
    }
    if (TWIG) {
      this.resources[ResourceType.TWIG] += TWIG;
    }
    if (BERRY) {
      this.resources[ResourceType.BERRY] += BERRY;
    }
    if (PEBBLE) {
      this.resources[ResourceType.PEBBLE] += PEBBLE;
    }
    if (RESIN) {
      this.resources[ResourceType.RESIN] += RESIN;
    }
  }

  recallAllWorkers(gameState: GameState) {
    if (this.numAvailableWorkers !== 0) {
      throw new Error("Still have available workers");
    }

    this.placedWorkers = this.placedWorkers.filter(
      ({ location, cardDestination, event }) => {
        // Don't remove workers from these cards.
        if (
          cardDestination &&
          (cardDestination.card === CardName.CEMETARY ||
            cardDestination.card === CardName.MONASTERY)
        ) {
          return true;
        }

        // Update gameState/other objects
        if (location) {
          const workers = gameState.locationsMap[location];
          if (!workers) {
            throw new Error(`Couldn't find location ${location}`);
          }
          const idx = workers.indexOf(this.playerId);
          if (idx !== -1) {
            workers.splice(idx, 1);
          } else {
            throw new Error(`Couldn't find worker at location: ${location}`);
          }
        } else if (event) {
          // Don't need to do anything for event
        } else if (cardDestination) {
          const cityOwner = gameState.getPlayer(cardDestination.playerId);
          let removedWorker = false;
          cityOwner
            .getPlayedCardInfos(cardDestination.card)
            .forEach(({ workers = [] }) => {
              if (!removedWorker) {
                const idx = workers.indexOf(cardDestination.playerId);
                if (idx !== -1) {
                  workers.splice(idx, 1);
                  removedWorker = true;
                }
              }
            });
          if (!removedWorker) {
            throw new Error(
              `Couldn't find worker at cardDestination: ${JSON.stringify(
                cardDestination
              )}`
            );
          }
        } else {
        }

        return false;
      }
    );
  }

  toJSON(includePrivate: boolean): PlayerJSON {
    return cloneDeep({
      name: this.name,
      playerId: this.playerId,
      playedCards: this.playedCards,
      numCardsInHand: this.cardsInHand.length,
      resources: this.resources,
      numWorkers: this.numWorkers,
      currentSeason: this.currentSeason,
      claimedEvents: this.claimedEvents,
      cardsInHand: [],
      placedWorkers: this.placedWorkers,
      ...(includePrivate
        ? {
            playerSecret: this.playerSecret,
            cardsInHand: this.cardsInHand,
          }
        : {}),
    });
  }

  static fromJSON(playerJSON: PlayerJSON): Player {
    const player = new Player(playerJSON);
    return player;
  }
}

export const createPlayer = (name: string): Player => {
  const player = new Player({
    name,
  });
  return player;
};
