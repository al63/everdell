import { GameJSON } from "../../src/model/jsonTypes";

describe("Load Game", () => {
  const gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await cy.task("db:createTestGame1");
  });

  it("should be able to load player page", () => {
    const player1 = gameJSON.gameState.players[0];
    const player2 = gameJSON.gameState.players[1];

    // Not player 2's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player2.playerSecret}`);
    cy.contains("Waiting for Michael");

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Visit Location");
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-place-worker-item-1").click();
    });
    cy.contains("Submit").click();
    cy.contains("Waiting for Elynn");

    // Take player 2's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player2.playerSecret}`);
    cy.contains("Michael placed a worker");
    cy.contains("Visit Location");
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-place-worker-item-2").click();
    });
    cy.contains("Submit").click();
    cy.contains("Elynn placed a worker");
    cy.contains("Waiting for Michael");
  });
});
