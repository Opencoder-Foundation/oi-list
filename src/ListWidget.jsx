import { useEffect, useMemo, useState } from "react";
import "./ListWidget.css";
import { PROBLEMS_URL, PROBLEM_PROGRESS_URL } from "./assetUrls";

const SORT_OPTIONS = [
  { value: "rating-asc", label: "Rating (od najmniejszego)" },
  { value: "rating-desc", label: "Rating (od najwyższego)" },
  { value: "year-desc", label: "Edycja (od najnowszego)" },
  { value: "year-asc", label: "Edycja (od najstarszego)" },
  { value: "name-asc", label: "Nazwa (A-Z)" },
];

const RATING_COLORS = {
  800: "#919191",
  2500: "#5bcfa2",
  3500: "#6de2e8",
  4500: "#775cd1",
  5500: "#ffd56b",
  6000: "#fcae65",
  7500: "#ed9a93",
  15801: "#ffffff",
};

const getRatingInfo = (rating) => {
  const thresholds = Object.keys(RATING_COLORS)
    .map(Number)
    .sort((a, b) => a - b);

  let current = thresholds[0];
  let next = null;

  for (let i = 0; i < thresholds.length; i++) {
    if (rating >= thresholds[i]) {
      current = thresholds[i];
      next = thresholds[i + 1] ?? null;
    } else {
      break;
    }
  }

  const progress = next ? (rating - current) / (next - current) : 1;

  return {
    color: RATING_COLORS[current],
    progress: Math.max(0, Math.min(progress, 1)),
  };
};

const getText = (value) => {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    if (typeof value.name === "string") {
      return value.name;
    }
    if (typeof value.url === "string") {
      return value.url;
    }
  }
  return "";
};

const getUrl = (value) => {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && typeof value.url === "string") {
    return value.url;
  }
  return "";
};

const normalizeProblem = (problem, index) => {
  const name = getText(problem.name) || `Problem ${index + 1}`;
  const url = getUrl(problem.url) || getUrl(problem.name);
  return {
    id: `${problem.code ?? `problem-${index}`}-${problem.year ?? "0"}-${problem.stage ?? "0"}`,
    code: String(problem.code ?? "").trim(),
    stage: Number(problem.stage ?? 0),
    year: Number(problem.year ?? 0),
    rating: Number(problem.rating ?? 0),
    name,
    url,
    omowienie_url: problem.omowienie_url ?? null,
  };
};

const sortProblems = (a, b, sortBy) => {
  switch (sortBy) {
    case "rating-desc":
      return b.rating - a.rating;
    case "year-desc":
      return b.year - a.year;
    case "year-asc":
      return a.year - b.year;
    case "name-asc":
      return a.name.localeCompare(b.name, "pl");
    case "rating-asc":
    default:
      return a.rating - b.rating;
  }
};

const ListWidget = ({ dataUrl = PROBLEMS_URL, embedded = false }) => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rating-asc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [progress, setProgress] = useState({});
  const [progressEnabled, setProgressEnabled] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [saving, setSaving] = useState(new Set());

  useEffect(() => {
    const abortController = new AbortController();

    const loadProblems = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(dataUrl, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`Could not load problems (${response.status})`);
        }
        const payload = await response.json();
        if (!Array.isArray(payload)) {
          throw new Error("results.json must contain an array");
        }
        setProblems(payload.map(normalizeProblem));
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError(loadError.message || "Could not load problems.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProblems();
    return () => {
      abortController.abort();
    };
  }, [dataUrl]);

  useEffect(() => {
    if (embedded) {
      return;
    }

    const loadProgress = async () => {
      const response = await fetch(PROBLEM_PROGRESS_URL, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status !== 401) {
          setProgressError("Nie udało się wczytać listy zadań.");
        }
        return;
      }

      const payload = await response.json();
      setProgress(Object.fromEntries(
        payload.map((item) => [item.problem_id, item.status]),
      ));
      setProgressEnabled(true);
    };

    loadProgress().catch(() => {
      setProgressError("Nie udało się wczytać listy zadań.");
    });
  }, [embedded]);

  const updateProgress = async (problemId, status) => {
    const previousStatus = progress[problemId] ?? null;
    const nextStatus = previousStatus === status ? null : status;

    setProgressError("");
    setProgress((current) => ({ ...current, [problemId]: nextStatus }));
    setSaving((current) => new Set(current).add(problemId));

    try {
      const response = await fetch(
        `${PROBLEM_PROGRESS_URL}/${encodeURIComponent(problemId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (!response.ok) {
        throw new Error("Could not update progress");
      }
    } catch {
      setProgress((current) => ({ ...current, [problemId]: previousStatus }));
      setProgressError("Nie udało się zapisać zmiany. Spróbuj ponownie.");
    } finally {
      setSaving((current) => {
        const next = new Set(current);
        next.delete(problemId);
        return next;
      });
    }
  };

  const stages = useMemo(() => {
    const uniqueStages = new Set(problems.map((problem) => problem.stage));
    return Array.from(uniqueStages).filter(Boolean).sort((a, b) => a - b);
  }, [problems]);

  const years = useMemo(() => {
    const uniqueYears = new Set(problems.map((problem) => problem.year));
    return Array.from(uniqueYears).filter(Boolean).sort((a, b) => b - a);
  }, [problems]);

  const progressCounts = useMemo(() => ({
    all: problems.length,
    todo: problems.filter((problem) => progress[problem.id] === "todo").length,
    done: problems.filter((problem) => progress[problem.id] === "done").length,
  }), [problems, progress]);

  const visibleProblems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return problems
      .filter((problem) => {
        if (stageFilter !== "all" && String(problem.stage) !== stageFilter) {
          return false;
        }
        if (yearFilter !== "all" && String(problem.year) !== yearFilter) {
          return false;
        }
        if (statusFilter !== "all" && progress[problem.id] !== statusFilter) {
          return false;
        }
        if (statusFilter === "notdone" && progress[problem.id] === "done") {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        const searchable = `${problem.code} ${problem.name}`.toLowerCase();
        return searchable.includes(normalizedQuery);
      })
      .sort((a, b) => sortProblems(a, b, sortBy));
  }, [problems, progress, query, stageFilter, statusFilter, yearFilter, sortBy]);

  return (
    <section className={`oi-list-widget${embedded ? " is-embedded" : ""}`}>
      <div className="oi-list-toolbar">
        <input
          className="oi-list-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Wyszukaj po kodzie lub nazwie"
        />
        <select
          className="oi-list-select"
          value={stageFilter}
          onChange={(event) => setStageFilter(event.target.value)}
        >
          <option value="all">Wszystkie etapy</option>
          {stages.map((stage) => (
            <option key={stage} value={String(stage)}>
              Etap {stage}
            </option>
          ))}
        </select>
        <select
          className="oi-list-select"
          value={yearFilter}
          onChange={(event) => setYearFilter(event.target.value)}
        >
          <option value="all">Wszystkie edycje</option>
          {years.map((year) => (
            <option key={year} value={String(year)}>
              Edycja {year}
            </option>
          ))}
        </select>
        <select
          className="oi-list-select"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {progressEnabled ? (
        <div className="oi-list-tabs" role="tablist" aria-label="Lista zadań">
          {[
            { value: "all", label: "Wszystkie" },
            { value: "notdone", label: "Nieukończone" },
            { value: "todo", label: "Do zrobienia" },
            { value: "done", label: "Ukończone" },
          ].map((tab) => (
            <button
              key={tab.value}
              className={statusFilter === tab.value ? "is-active" : ""}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
              <span>{progressCounts[tab.value]}</span>
            </button>
          ))}
        </div>
      ) : null}

      <p className="oi-list-meta">
        Wyświetlanie <strong>{visibleProblems.length}</strong> z{" "}
        <strong>{problems.length}</strong> zadań
      </p>

      {progressError ? (
        <p className="oi-list-progress-error" role="status">{progressError}</p>
      ) : null}

      {loading ? <p className="oi-list-state">Wczytywanie zadań...</p> : null}
      {error ? <p className="oi-list-state oi-list-error">{error}</p> : null}

      {!loading && !error ? (
        <div className="oi-list-results">
          {visibleProblems.map((problem) => {
            const { color, progress } = getRatingInfo(problem.rating);

            const content = (
              <>
                <div className="oi-list-item__header">
                  {problem.url ? (
                    <a
                      className="oi-list-item__name"
                      href={problem.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <span>{problem.name}</span>
                      <svg
                        className="oi-list-item__external-link"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
                        <path d="M11 13l9 -9" />
                        <path d="M15 4h5v5" />
                      </svg>
                    </a>
                  ) : (
                    <span className="oi-list-item__name">{problem.name}</span>
                  )}
                  <div className="oi-list-item__rating">
                    <span style={{ color: color }}>{problem.rating}</span>
                    <div
                      className="oi-list-rating-circle"
                      style={{
                        "--fill": `${progress * 100}%`,
                        "--color": color,
                      }}
                    >
                      <div className="oi-list-rating-circle__fill" />
                    </div>
                  </div>
                </div>
                <div className="oi-list-item__footer">
                  <span className="oi-list-item__tags">
                  <code>{problem.code || "N/A"}</code>
                  <span>etap {problem.stage || "?"}</span>
                  <span>edycja {problem.year || "?"}</span>
                  {problem.code?.endsWith("*") ? (
                    <span title="Zadanie z sesji próbnej. Zadania z sesji próbnej są opcjonalne i w większości konkursów nie wliczają się do głównego rankingu, przez co ich rating na tej stronie może być zawyżony.">
                      próbne
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="icon icon-tabler icon-tabler-info-circle"
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
                        <path d="M12 9h.01" />
                        <path d="M11 12h1v4h1" />
                      </svg>
                    </span>
                  ) : null}
                  {problem.omowienie_url ? (
                    <a
                      href={problem.omowienie_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      title="Omówienie jest dostępne, kliknij w przycisk aby w nie wejść."
                    >
                      Omówienie
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-news">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11" />
                        <path d="M8 8l4 0" />
                        <path d="M8 12l4 0" />
                        <path d="M8 16l4 0" />
                      </svg>
                    </a>
                  ) : null}
                  </span>
                  {progressEnabled ? (
                    <div className="oi-list-item__actions">
                      <button
                        className={progress[problem.id] === "todo" ? "is-active" : ""}
                        type="button"
                        aria-pressed={progress[problem.id] === "todo"}
                        disabled={saving.has(problem.id)}
                        onClick={() => updateProgress(problem.id, "todo")}
                      >
                        Do zrobienia
                      </button>
                      <button
                        className={progress[problem.id] === "done" ? "is-active is-done" : ""}
                        type="button"
                        aria-pressed={progress[problem.id] === "done"}
                        disabled={saving.has(problem.id)}
                        onClick={() => updateProgress(problem.id, "done")}
                      >
                        Gotowe
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            );
            return (
              <div
                key={problem.id}
                className={`oi-list-item${progress[problem.id] === "done" ? " is-complete" : ""}`}
              >
                {content}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export default ListWidget;
