const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = process.env.DB_FILE || path.join(__dirname, "database.sqlite");
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    score_home INTEGER NOT NULL,
    score_away INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS prediction_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id INTEGER NOT NULL,
    team TEXT NOT NULL,
    player TEXT NOT NULL,
    minute INTEGER NOT NULL,
    FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS match_result (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    score_home INTEGER NOT NULL,
    score_away INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_result_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team TEXT NOT NULL,
    player TEXT NOT NULL,
    minute INTEGER NOT NULL
  );
`);

function getResultFromDb() {
  const resultRow = db.prepare("SELECT * FROM match_result WHERE id = 1").get();
  if (!resultRow) return null;
  const goals = db
    .prepare("SELECT team, player, minute FROM match_result_goals ORDER BY minute ASC, player ASC")
    .all();
  return {
    score_home: resultRow.score_home,
    score_away: resultRow.score_away,
    goals,
  };
}

function getPredictionFromDb(predRow) {
  const goals = db
    .prepare(
      "SELECT team, player, minute FROM prediction_goals WHERE prediction_id = ? ORDER BY minute ASC, player ASC"
    )
    .all(predRow.id);
  return {
    id: predRow.id,
    name: predRow.name,
    email: predRow.email,
    score_home: predRow.score_home,
    score_away: predRow.score_away,
    created_at: predRow.created_at,
    goals,
  };
}

function computeScore(prediction, result) {
  if (!result) {
    return {
      distance: null,
      isExact: false,
    };
  }

  const scoreError =
    Math.abs(prediction.score_home - result.score_home) +
    Math.abs(prediction.score_away - result.score_away);

  const normalizeGoals = (goals) =>
    goals
      .map((g) => ({
        team: g.team,
        player: (g.player || "").trim().toLowerCase(),
        minute: Number(g.minute),
      }))
      .sort((a, b) => {
        if (a.minute !== b.minute) return a.minute - b.minute;
        if (a.player < b.player) return -1;
        if (a.player > b.player) return 1;
        return 0;
      });

  const predGoalsNorm = normalizeGoals(prediction.goals || []);
  const resGoalsNorm = normalizeGoals(result.goals || []);

  let goalsPenalty = 0;
  const remainingResGoals = [...resGoalsNorm];

  for (const pg of predGoalsNorm) {
    let bestIndex = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < remainingResGoals.length; i++) {
      const rg = remainingResGoals[i];
      if (rg.player === pg.player) {
        const diff = Math.abs(rg.minute - pg.minute);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = i;
        }
      }
    }
    if (bestIndex >= 0) {
      goalsPenalty += bestDiff;
      remainingResGoals.splice(bestIndex, 1);
    } else {
      goalsPenalty += 20;
    }
  }

  const isExact =
    scoreError === 0 &&
    predGoalsNorm.length === resGoalsNorm.length &&
    predGoalsNorm.every(
      (pg, idx) =>
        pg.player === resGoalsNorm[idx].player &&
        pg.minute === resGoalsNorm[idx].minute &&
        pg.team === resGoalsNorm[idx].team
    );

  const distance = scoreError * 100 + goalsPenalty;

  return { distance, isExact };
}

app.get("/api/prizes", (req, res) => {
  res.json({
    prizes: [
      {
        id: 1,
        name: "1º Prémio",
        description:
          "Para quem acertar exatamente o resultado, os marcadores e os minutos dos golos.",
      },
      {
        id: 2,
        name: "2º Prémio",
        description:
          "Para o segundo palpite mais próximo do resultado real.",
      },
      {
        id: 3,
        name: "3º Prémio",
        description:
          "Para o terceiro palpite mais próximo do resultado real.",
      },
    ],
  });
});

app.post("/api/predictions", (req, res) => {
  try {
    const { name, email, score_home, score_away, goals } = req.body || {};

    if (!name || typeof score_home !== "number" || typeof score_away !== "number") {
      return res.status(400).json({ error: "Dados obrigatórios em falta." });
    }

    const insertPred = db.prepare(
      "INSERT INTO predictions (name, email, score_home, score_away) VALUES (?, ?, ?, ?)"
    );
    const result = insertPred.run(name.trim(), email || null, score_home, score_away);
    const predictionId = result.lastInsertRowid;

    if (Array.isArray(goals)) {
      const insertGoal = db.prepare(
        "INSERT INTO prediction_goals (prediction_id, team, player, minute) VALUES (?, ?, ?, ?)"
      );
      const insertMany = db.transaction((items) => {
        for (const g of items) {
          if (!g.player || typeof g.minute !== "number" || !g.team) continue;
          insertGoal.run(
            predictionId,
            String(g.team).trim(),
            String(g.player).trim(),
            Number(g.minute)
          );
        }
      });
      insertMany(goals);
    }

    return res.status(201).json({ success: true, id: predictionId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao registar aposta." });
  }
});

app.post("/api/result", (req, res) => {
  const adminSecretHeader = req.headers["x-admin-secret"];
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || adminSecretHeader !== expectedSecret) {
    return res.status(403).json({ error: "Não autorizado." });
  }

  try {
    const { score_home, score_away, goals } = req.body || {};

    if (typeof score_home !== "number" || typeof score_away !== "number") {
      return res.status(400).json({ error: "Resultado inválido." });
    }

    const upsertResult = db.transaction(() => {
      db.prepare("DELETE FROM match_result WHERE id = 1").run();
      db.prepare("DELETE FROM match_result_goals").run();

      db.prepare(
        "INSERT INTO match_result (id, score_home, score_away) VALUES (1, ?, ?)"
      ).run(score_home, score_away);

      if (Array.isArray(goals)) {
        const insertGoal = db.prepare(
          "INSERT INTO match_result_goals (team, player, minute) VALUES (?, ?, ?)"
        );
        for (const g of goals) {
          if (!g.player || typeof g.minute !== "number" || !g.team) continue;
          insertGoal.run(
            String(g.team).trim(),
            String(g.player).trim(),
            Number(g.minute)
          );
        }
      }
    });

    upsertResult();

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao gravar resultado." });
  }
});

app.get("/api/leaderboard", (req, res) => {
  try {
    const result = getResultFromDb();
    const predictionRows = db
      .prepare("SELECT * FROM predictions ORDER BY created_at ASC")
      .all();

    const predictions = predictionRows.map((row) => getPredictionFromDb(row));
    let leaderboard = predictions.map((p) => {
      const { distance, isExact } = computeScore(p, result);
      return {
        ...p,
        distance,
        isExact,
      };
    });

    const hasResult = !!result;

    if (hasResult) {
      leaderboard = leaderboard.filter((p) => p.distance !== null);
      leaderboard.sort((a, b) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        return a.created_at.localeCompare(b.created_at);
      });

      const exactIndex = leaderboard.findIndex((p) => p.isExact);
      if (exactIndex > 0) {
        const [exact] = leaderboard.splice(exactIndex, 1);
        leaderboard.unshift(exact);
      }

      leaderboard = leaderboard.map((p, index) => {
        let prizeTier = null;
        if (index === 0) prizeTier = 1;
        else if (index === 1) prizeTier = 2;
        else if (index === 2) prizeTier = 3;
        return { ...p, prizeTier };
      });
    }

    res.json({
      hasResult,
      leaderboard,
      result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao carregar leaderboard." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

