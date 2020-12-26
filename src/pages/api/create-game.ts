import type { NextApiRequest, NextApiResponse } from "next";
import { createGame } from "../../model/game";

export default (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const { body, method } = req;

  // Validate came creation
  if (!(body.players && body.players.length > 1)) {
    res.status(400).json({
      success: false,
      error: "Require at least 2 players to play!",
    });
    return;
  }
  if (!body.players.every((p: any) => !!p.name)) {
    res.status(400).json({
      success: false,
      error: "All players need to have valid names",
    });
    return;
  }

  const game = createGame(body.players.map((p: any) => p.name));
  res.json({
    success: "ok",
    gameUrl: `/game/${game.gameId}?gameSecret=${game.gameSecretUNSAFE}`,
  });
};
