import { GameJSON } from "../../src/model/jsonTypes";

describe("Play Husband via Farm", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-husband-via-farm-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow players to play cards", () => {
    const player1 = gameJSON.gameState.players[0];
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Card");

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLAY_CARD").click();
      cy.get("[data-cy='play-card-item:Husband']").first().click();

      // Uncheck it.
      cy.contains("Use Farm to play Husband").click();

      // Check it.
      cy.contains("Use Farm to play Husband").click();

      cy.contains("Submit").click();
    });

    cy.contains("Michael played Husband by occupying Farm.");
    cy.contains("Waiting for Elynn");
  });
});
