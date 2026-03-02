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

function BetForm({ onSubmitted, userInfo, players }) {
  const [name, setName] = useState(userInfo?.name || "");
  const [email, setEmail] = useState(userInfo?.email || "");
  const [phone, setPhone] = useState(userInfo?.phone || "");
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");
  const [homeGoals, setHomeGoals] = useState([]);
  const [awayGoals, setAwayGoals] = useState([]);
  const [homePlayer, setHomePlayer] = useState("");
  const [homeMinute, setHomeMinute] = useState("");
  const [awayPlayer, setAwayPlayer] = useState("");
  const [awayMinute, setAwayMinute] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addHomeGoal = () => {
    if (!homePlayer || !homeMinute) return;
    setHomeGoals((prev) => [
      ...prev,
      { player: homePlayer, minute: Number(homeMinute) },
    ]);
    setHomeMinute("");
    setHomePlayer("");
  };

  const addAwayGoal = () => {
    if (!awayPlayer || !awayMinute) return;
    setAwayGoals((prev) => [
      ...prev,
      { player: awayPlayer, minute: Number(awayMinute) },
    ]);
    setAwayMinute("");
    setAwayPlayer("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const parsedHome = Number(scoreHome);
    const parsedAway = Number(scoreAway);

    const finalName = (userInfo?.name || name || "").trim();
    const finalEmail = (userInfo?.email || email || "").trim();
    const finalPhone = (userInfo?.phone || phone || "").trim();

    if (!finalName) {
      setError("Indica o teu nome.");
      return;
    }

    if (Number.isNaN(parsedHome) || Number.isNaN(parsedAway)) {
      setError("Resultado inválido.");
      return;
    }

    const allGoals = [
      ...homeGoals.map((g) => ({
        team: "casa",
        player: g.player,
        minute: g.minute,
      })),
      ...awayGoals.map((g) => ({
        team: "fora",
        player: g.player,
        minute: g.minute,
      })),
    ];

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/predictions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: finalName,
          email: finalEmail || null,
          phone: finalPhone || null,
          score_home: parsedHome,
          score_away: parsedAway,
          goals: allGoals,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao enviar aposta.");
      }
      onSubmitted();
      setScoreHome("");
      setScoreAway("");
      setHomeGoals([]);
      setAwayGoals([]);
      setHomePlayer("");
      setHomeMinute("");
      setAwayPlayer("");
      setAwayMinute("");
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
        {!userInfo && (
          <>
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
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Opcional, para contacto se ganhares"
              />
            </div>
            <div className="form-row">
              <label>Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </>
        )}
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
            Seleciona o marcador de cada equipa e o minuto do golo.
          </p>

          <div className="goals-section">
            <div className="goals-column">
              <h3 className="goals-title">Marcador {players?.homeLabel || "equipa da casa"}</h3>
              <div className="goal-row">
                <select
                  value={homePlayer}
                  onChange={(e) => setHomePlayer(e.target.value)}
                >
                  <option value="">Escolhe o jogador</option>
                  {(players?.home || []).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Minuto"
                  value={homeMinute}
                  onChange={(e) => setHomeMinute(e.target.value)}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={addHomeGoal}
                >
                  Confirmar
                </button>
              </div>
              <div className="selected-goals">
                {homeGoals.map((g, idx) => (
                  <div key={idx} className="selected-goal-chip">
                    {g.player} {g.minute}&apos;
                  </div>
                ))}
              </div>
            </div>

            <div className="goals-column">
              <h3 className="goals-title">Marcador {players?.awayLabel || "equipa visitante"}</h3>
              <div className="goal-row">
                <select
                  value={awayPlayer}
                  onChange={(e) => setAwayPlayer(e.target.value)}
                >
                  <option value="">Escolhe o jogador</option>
                  {(players?.away || []).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Minuto"
                  value={awayMinute}
                  onChange={(e) => setAwayMinute(e.target.value)}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={addAwayGoal}
                >
                  Confirmar
                </button>
              </div>
              <div className="selected-goals">
                {awayGoals.map((g, idx) => (
                  <div key={idx} className="selected-goal-chip">
                    {g.player} {g.minute}&apos;
                  </div>
                ))}
              </div>
            </div>
          </div>
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

function EntryForm({ onEnter }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onEnter({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <section className="card hero-card">
      <h2>Bem-vindo</h2>
      <p className="hint">
        Preenche os teus dados para entrares no sistema de previsões deste jogo.
      </p>
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
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="form-row">
          <label>Telefone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <button type="submit" className="primary-button">
          ENTRAR
        </button>
      </form>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [matchInfo, setMatchInfo] = useState(null);
  const [players, setPlayers] = useState({ home: [], away: [] });
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/match`)
      .then((res) => res.json())
      .then((data) => {
        setMatchInfo(data.match || null);
      })
      .catch(() => {
        setMatchInfo(null);
      });
    fetch(`${API_BASE}/api/players`)
      .then((res) => res.json())
      .then((data) => {
        setPlayers({
          home: data.home || [],
          away: data.away || [],
          homeLabel: data.homeLabel,
          awayLabel: data.awayLabel,
        });
      })
      .catch(() => {
        setPlayers({ home: [], away: [] });
      });
  }, []);

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
          {matchInfo?.home_logo && (
            <img
              src={matchInfo.home_logo}
              alt={matchInfo.home_team}
              className="team-logo"
            />
          )}
          <span className="ball">⚽</span>
          {matchInfo?.away_logo && (
            <img
              src={matchInfo.away_logo}
              alt={matchInfo.away_team}
              className="team-logo"
            />
          )}
          <div>
            <h1>
              {matchInfo
                ? `${matchInfo.home_team} vs ${matchInfo.away_team}`
                : "Aposta Jogo Único"}
            </h1>
            <p>
              {matchInfo?.description ||
                "Aposta no resultado exato, marcadores e minutos."}
            </p>
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
            <EntryForm
              onEnter={(info) => {
                setUserInfo(info);
                goTo("bet");
              }}
            />
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
              userInfo={userInfo}
              players={players}
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

