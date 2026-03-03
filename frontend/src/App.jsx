import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

function PrizeSection() {
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/prizes`)
      .then((res) => res.json())
      .then((data) => setPrizes(data.prizes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="card">
      <h2>Prémios</h2>
      {loading && <p className="hint">A carregar...</p>}
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

function ScorerAccordion({ label, players, goals, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [minute, setMinute] = useState("");

  const handleConfirm = () => {
    if (!selected || !minute) return;
    onAdd({ player: selected, minute: Number(minute) });
    setSelected("");
    setMinute("");
  };

  const handleSelectPlayer = (p) => {
    if (selected === p) {
      setSelected("");
      setMinute("");
    } else {
      setSelected(p);
      setMinute("");
    }
  };

  return (
    <div className="scorer-accordion">
      <button
        type="button"
        className={`scorer-header${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        <span className="scorer-arrow">{open ? "▲" : "▼"}</span>
      </button>

      {goals.length > 0 && !open && (
        <div className="scorer-summary">
          {goals.map((g, i) => (
            <div key={i} className="scorer-chip">
              <span>
                {g.player} &nbsp;{g.minute}&apos;
              </span>
              <button type="button" className="chip-remove" onClick={() => onRemove(i)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="scorer-body">
          {goals.length > 0 && (
            <div className="scorer-summary">
              {goals.map((g, i) => (
                <div key={i} className="scorer-chip">
                  <span>
                    {g.player} &nbsp;{g.minute}&apos;
                  </span>
                  <button type="button" className="chip-remove" onClick={() => onRemove(i)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {!selected && (
            <ul className="player-list">
              {players.map((p) => (
                <li key={p} className="player-item" onClick={() => handleSelectPlayer(p)}>
                  <span>{p}</span>
                  <span className="player-check">□</span>
                </li>
              ))}
              {players.length === 0 && (
                <li className="player-item muted-item">Sem jogadores disponíveis</li>
              )}
            </ul>
          )}

          {selected && (
            <div className="minute-section">
              <div className="minute-player-name">
                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    setSelected("");
                    setMinute("");
                  }}
                >
                  ←
                </button>
                {selected}
              </div>
              <div className="minute-input-row">
                <span className="minute-label">Minuto</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  placeholder="Ex: 23"
                  className="minute-input"
                  autoFocus
                />
              </div>
              <button
                type="button"
                className="confirm-btn"
                onClick={handleConfirm}
                disabled={!minute}
              >
                CONFIRMAR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      ...homeGoals.map((g) => ({ team: "casa", player: g.player, minute: g.minute })),
      ...awayGoals.map((g) => ({ team: "fora", player: g.player, minute: g.minute })),
    ];

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card">
      <form onSubmit={handleSubmit} className="form">
        {!userInfo && (
          <>
            <div className="flat-field">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome *"
                required
                className="flat-input"
              />
            </div>
            <div className="flat-field">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="flat-input"
              />
            </div>
            <div className="flat-field">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefone"
                className="flat-input"
              />
            </div>
          </>
        )}

        <div className="score-row">
          <div className="score-col">
            <label className="score-team-label">{players?.homeLabel || "Casa"}</label>
            <input
              type="number"
              min="0"
              value={scoreHome}
              onChange={(e) => setScoreHome(e.target.value)}
              required
              className="score-input"
              placeholder="0"
            />
          </div>
          <div className="score-separator">—</div>
          <div className="score-col">
            <label className="score-team-label">{players?.awayLabel || "Fora"}</label>
            <input
              type="number"
              min="0"
              value={scoreAway}
              onChange={(e) => setScoreAway(e.target.value)}
              required
              className="score-input"
              placeholder="0"
            />
          </div>
        </div>

        <ScorerAccordion
          label={`Marcador ${players?.homeLabel || "Equipa da casa"}`}
          players={players?.home || []}
          goals={homeGoals}
          onAdd={(g) => setHomeGoals((prev) => [...prev, g])}
          onRemove={(i) => setHomeGoals((prev) => prev.filter((_, idx) => idx !== i))}
        />

        <ScorerAccordion
          label={`Marcador ${players?.awayLabel || "Equipa visitante"}`}
          players={players?.away || []}
          goals={awayGoals}
          onAdd={(g) => setAwayGoals((prev) => [...prev, g])}
          onRemove={(i) => setAwayGoals((prev) => prev.filter((_, idx) => idx !== i))}
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "A enviar..." : "AS MINHAS PREVISÕES"}
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

  const getPoints = (item) => {
    if (item.distance === null || item.distance === undefined) return null;
    if (item.isExact) return 1000;
    return Math.max(0, 1000 - item.distance);
  };

  return (
    <section className="card">
      <h2>Leaderboard</h2>
      {loading && <p className="hint">A carregar...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <>
          {!data.hasResult && (
            <p className="hint">
              Resultado ainda não registado. A classificação será atualizada após o jogo.
            </p>
          )}
          {data.hasResult && data.result && (
            <div className="result-chip">
              <span className="result-chip-label">Resultado oficial</span>
              <span className="result-chip-score">
                {data.result.score_home} – {data.result.score_away}
              </span>
            </div>
          )}
          <div className="lb-list">
            {data.leaderboard.map((item, idx) => {
              const points = getPoints(item);
              const isPrize = item.prizeTier != null;
              const thirdItem = data.leaderboard[2];
              const gapToThird =
                data.hasResult && !isPrize && thirdItem
                  ? item.distance - thirdItem.distance
                  : null;

              return (
                <div
                  key={item.id}
                  className={`lb-row${isPrize ? ` lb-prize-${item.prizeTier}` : ""}`}
                >
                  <div className="lb-rank">
                    {item.prizeTier === 1 && <span className="badge first">1º</span>}
                    {item.prizeTier === 2 && <span className="badge second">2º</span>}
                    {item.prizeTier === 3 && <span className="badge third">3º</span>}
                    {!isPrize && <span className="lb-pos-num">{idx + 1}º</span>}
                  </div>
                  <div className="lb-main">
                    <div className="lb-name">{item.name}</div>
                    <div className="lb-pred">
                      Apostou <strong>{item.score_home}–{item.score_away}</strong>
                    </div>
                  </div>
                  {data.hasResult && points !== null && (
                    <div className="lb-kpi">
                      <div className="lb-pts">
                        {points}<span className="lb-pts-label"> pts</span>
                      </div>
                      {item.isExact && (
                        <div className="lb-status exact">✓ Exato</div>
                      )}
                      {!item.isExact && isPrize && (
                        <div className="lb-status prize">Prémio 🏆</div>
                      )}
                      {!isPrize && gapToThird !== null && (
                        <div className="lb-status gap">−{gapToThird} pts p/ 3º</div>
                      )}
                      {!isPrize && gapToThird === null && (
                        <div className="lb-status prize">Prémio 🏆</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {data.leaderboard.length === 0 && (
              <p className="hint" style={{ marginTop: "0.5rem" }}>
                Ainda não há apostas registadas.
              </p>
            )}
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
    onEnter({ name: name.trim(), email: email.trim(), phone: phone.trim() });
  };

  return (
    <section className="card">
      <form onSubmit={handleSubmit} className="form">
        <div className="flat-field">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome *"
            required
            className="flat-input"
          />
        </div>
        <div className="flat-field">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="flat-input"
          />
        </div>
        <div className="flat-field">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefone"
            className="flat-input"
          />
        </div>
        <button type="submit" className="submit-btn">
          ENTRAR
        </button>
      </form>
    </section>
  );
}

function MatchBar({ match }) {
  if (!match) return null;
  return (
    <div className="match-bar">
      <div className="match-bar-team">
        {match.home_logo && (
          <img src={match.home_logo} alt={match.home_team} className="match-bar-logo" />
        )}
        <span className="match-bar-name">{match.home_team}</span>
      </div>
      <span className="match-bar-vs">VS</span>
      <div className="match-bar-team match-bar-team-away">
        <span className="match-bar-name">{match.away_team}</span>
        {match.away_logo && (
          <img src={match.away_logo} alt={match.away_team} className="match-bar-logo" />
        )}
      </div>
    </div>
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
      .then((data) => setMatchInfo(data.match || null))
      .catch(() => setMatchInfo(null));
    fetch(`${API_BASE}/api/players`)
      .then((res) => res.json())
      .then((data) =>
        setPlayers({
          home: data.home || [],
          away: data.away || [],
          homeLabel: data.homeLabel,
          awayLabel: data.awayLabel,
        })
      )
      .catch(() => setPlayers({ home: [], away: [] }));
  }, []);

  const goTo = (target) => {
    setPage(target);
    if (target !== "bet") setJustSubmitted(false);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="ball">⚽</span>
          <h1>On The Road Game Lounge</h1>
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
            Aposta
          </button>
          <button
            className={page === "leaderboard" ? "nav-button active" : "nav-button"}
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
                  <strong>Aposta registada com sucesso!</strong> Acompanha a classificação após o
                  jogo no Leaderboard.
                </p>
              </div>
            )}
            <BetForm
              userInfo={userInfo}
              players={players}
              onSubmitted={() => setJustSubmitted(true)}
            />
          </>
        )}

        {page === "leaderboard" && <Leaderboard />}
      </main>

      <MatchBar match={matchInfo} />
    </div>
  );
}
