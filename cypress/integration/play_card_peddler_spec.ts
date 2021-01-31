import { GameJSON } from "../../src/model/jsonTypes";

describe("Play Peddler", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-peddler-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow player to play fool on another player card", () => {
    const player1 = gameJSON.gameState.players[0];
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Card");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("City is empty");
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Peddler");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLAY_CARD").click();
      cy.get("[data-cy='play-card-item:Peddler']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Michael played Peddler.");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Peddler");
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Peddler").should("not.exist");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Peddler: Pay up to 2");
      cy.get("[data-cy='resource-value-input:BERRY']").type("1");
      cy.get("[data-cy='resource-value-input:PEBBLE']").type("1");
      cy.contains("Submit").click();
    });

    cy.contains("Peddler: Michael paid ");

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Peddler: Gain 2");
      cy.get("[data-cy='resource-value-input:TWIG']").type("1");
      cy.get("[data-cy='resource-value-input:RESIN']").type("1");
      cy.contains("Submit").click();
    });

    cy.contains("Peddler: Michael gained ");
    cy.contains("Waiting for Elynn");
  });
});
