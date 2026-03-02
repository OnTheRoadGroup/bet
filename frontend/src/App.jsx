import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

function PrizeSection() {
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/prizes`)
      .then((res) => res.json())
      .then((data) => {
        setPrizes(data.prizes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="card">
      <h2>Prémios</h2>
      {loading && <p>A carregar prémios...</p>}
      {!loading && (
        <ul className="prize-list">
          {prizes.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong>
              <span>{p.description}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BetForm({ onSubmitted }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");
  const [goals, setGoals] = useState([
    { team: "casa", player: "", minute: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleGoalChange = (index, field, value) => {
    setGoals((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  };

  const addGoalRow = () => {
    setGoals((prev) => [...prev, { team: "casa", player: "", minute: "" }]);
  };

  const removeGoalRow = (index) => {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const parsedHome = Number(scoreHome);
    const parsedAway = Number(scoreAway);

    if (!name.trim()) {
      setError("Indica o teu nome.");
      return;
    }
    if (Number.isNaN(parsedHome) || Number.isNaN(parsedAway)) {
      setError("Resultado inválido.");
      return;
    }

    const filteredGoals = goals
      .filter((g) => g.player.trim() && g.minute !== "")
      .map((g) => ({
        team: g.team,
        player: g.player.trim(),
        minute: Number(g.minute),
      }));

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/predictions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          score_home: parsedHome,
          score_away: parsedAway,
          goals: filteredGoals,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao enviar aposta.");
      }
      onSubmitted();
      setName("");
      setEmail("");
      setScoreHome("");
      setScoreAway("");
      setGoals([{ team: "casa", player: "", minute: "" }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card">
      <h2>Faz a tua aposta</h2>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label>Nome *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label>Email / contacto</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Opcional, para contacto se ganhares"
          />
        </div>
        <div className="form-row form-row-inline">
          <div>
            <label>Golos equipa da casa *</label>
            <input
              type="number"
              min="0"
              value={scoreHome}
              onChange={(e) => setScoreHome(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Golos equipa visitante *</label>
            <input
              type="number"
              min="0"
              value={scoreAway}
              onChange={(e) => setScoreAway(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <label>Marcadores e minutos dos golos</label>
          <p className="hint">
            Adiciona quem marca e em que minuto. Opcional, mas necessário para
            lutar pelo 1º prémio.
          </p>
          <div className="goals-table">
            {goals.map((g, index) => (
              <div key={index} className="goal-row">
                <select
                  value={g.team}
                  onChange={(e) =>
                    handleGoalChange(index, "team", e.target.value)
                  }
                >
                  <option value="casa">Equipa da casa</option>
                  <option value="fora">Equipa visitante</option>
                </select>
                <input
                  type="text"
                  placeholder="Nome do jogador"
                  value={g.player}
                  onChange={(e) =>
                    handleGoalChange(index, "player", e.target.value)
                  }
                />
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Minuto"
                  value={g.minute}
                  onChange={(e) =>
                    handleGoalChange(index, "minute", e.target.value)
                  }
                />
                {goals.length > 1 && (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => removeGoalRow(index)}
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={addGoalRow}
          >
            Adicionar golo
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "A enviar..." : "Submeter aposta"}
        </button>
      </form>
    </section>
  );
}

function Leaderboard() {
  const [data, setData] = useState({ leaderboard: [], hasResult: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/leaderboard`)
      .then((res) => res.json())
      .then((d) => {
        setData({
          leaderboard: d.leaderboard || [],
          hasResult: d.hasResult,
          result: d.result || null,
        });
      })
      .catch(() => setError("Não foi possível carregar o leaderboard."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="card">
      <h2>Leaderboard</h2>
      {loading && <p>A carregar leaderboard...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <>
          {!data.hasResult && (
            <p className="hint">
              O resultado real ainda não foi registado. Assim que o jogo
              terminar, a classificação será atualizada.
            </p>
          )}
          {data.hasResult && data.result && (
            <p className="result-info">
              Resultado oficial:{" "}
              <strong>
                {data.result.score_home} - {data.result.score_away}
              </strong>
            </p>
          )}
          <div className="table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>Resultado apostado</th>
                  <th>Marcadores (minutos)</th>
                  {data.hasResult && <th>Categoria</th>}
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.name}</td>
                    <td>
                      {item.score_home} - {item.score_away}
                    </td>
                    <td>
                      {Array.isArray(item.goals) && item.goals.length > 0 ? (
                        item.goals.map((g, i) => (
                          <span key={i} className="goal-chip">
                            {g.team === "casa" ? "Casa" : "Fora"} - {g.player} (
                            {g.minute}&apos;)
                          </span>
                        ))
                      ) : (
                        <span className="muted">Sem marcadores</span>
                      )}
                    </td>
                    {data.hasResult && (
                      <td>
                        {item.prizeTier === 1 && (
                          <span className="badge first">1º prémio</span>
                        )}
                        {item.prizeTier === 2 && (
                          <span className="badge second">2º prémio</span>
                        )}
                        {item.prizeTier === 3 && (
                          <span className="badge third">3º prémio</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {data.leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={data.hasResult ? 5 : 4}>
                      Ainda não há apostas registadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [justSubmitted, setJustSubmitted] = useState(false);

  const goTo = (target) => {
    setPage(target);
    if (target !== "bet") {
      setJustSubmitted(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="ball">⚽</span>
          <div>
            <h1>Aposta Jogo Único</h1>
            <p>Aposta no resultado exato, marcadores e minutos.</p>
          </div>
        </div>
        <nav className="nav">
          <button
            className={page === "home" ? "nav-button active" : "nav-button"}
            onClick={() => goTo("home")}
          >
            Início
          </button>
          <button
            className={page === "bet" ? "nav-button active" : "nav-button"}
            onClick={() => goTo("bet")}
          >
            Fazer aposta
          </button>
          <button
            className={
              page === "leaderboard" ? "nav-button active" : "nav-button"
            }
            onClick={() => goTo("leaderboard")}
          >
            Leaderboard
          </button>
        </nav>
      </header>

      <main className="main">
        {page === "home" && (
          <>
            <section className="card hero-card">
              <h2>Como funciona?</h2>
              <ol className="steps">
                <li>
                  <strong>1. Vê os prémios</strong> nesta página.
                </li>
                <li>
                  <strong>2. Faz a tua aposta</strong> com resultado exato,
                  marcadores e minutos.
                </li>
                <li>
                  <strong>3. Espera pelo fim do jogo</strong> para ver quem
                  ficou mais perto no leaderboard.
                </li>
              </ol>
              <button
                className="primary-button"
                onClick={() => goTo("bet")}
              >
                Começar aposta
              </button>
            </section>
            <PrizeSection />
          </>
        )}

        {page === "bet" && (
          <>
            {justSubmitted && (
              <div className="card success-card">
                <p>
                  <strong>Aposta registada com sucesso!</strong> Podes agora
                  ver a classificação em &quot;Leaderboard&quot; depois do
                  jogo.
                </p>
              </div>
            )}
            <BetForm
              onSubmitted={() => {
                setJustSubmitted(true);
              }}
            />
          </>
        )}

        {page === "leaderboard" && <Leaderboard />}
      </main>

      <footer className="footer">
        <span>Jogo único · Sistema de apostas amigável</span>
      </footer>
    </div>
  );
}

