import { useEffect, useMemo, useState } from "react";
import "./ListWidget.css";
import { PROBLEMS_URL } from "./assetUrls";

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
    id: `${problem.code ?? "problem"}-${problem.year ?? "unknown"}-${index}`,
    code: String(problem.code ?? "").trim(),
    stage: Number(problem.stage ?? 0),
    year: Number(problem.year ?? 0),
    rating: Number(problem.rating ?? 0),
    name,
    url,
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

  const stages = useMemo(() => {
    const uniqueStages = new Set(problems.map((problem) => problem.stage));
    return Array.from(uniqueStages).filter(Boolean).sort((a, b) => a - b);
  }, [problems]);

  const years = useMemo(() => {
    const uniqueYears = new Set(problems.map((problem) => problem.year));
    return Array.from(uniqueYears).filter(Boolean).sort((a, b) => b - a);
  }, [problems]);

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
        if (!normalizedQuery) {
          return true;
        }
        const searchable = `${problem.code} ${problem.name}`.toLowerCase();
        return searchable.includes(normalizedQuery);
      })
      .sort((a, b) => sortProblems(a, b, sortBy));
  }, [problems, query, stageFilter, yearFilter, sortBy]);

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

      <p className="oi-list-meta">
        Wyświetlanie <strong>{visibleProblems.length}</strong> z{" "}
        <strong>{problems.length}</strong> zadań
      </p>

      {loading ? <p className="oi-list-state">Wczytywanie zadań...</p> : null}
      {error ? <p className="oi-list-state oi-list-error">{error}</p> : null}

      {!loading && !error ? (
        <div className="oi-list-results">
          {visibleProblems.map((problem) => {
            const { color, progress } = getRatingInfo(problem.rating);

            const content = (
              <>
                <div className="oi-list-item__header">
                  <span className="oi-list-item__name">{problem.name}</span>
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
                </span>
                {problem.url ? (
                  <svg
                    className="oi-list-item__external-link"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
                    <path d="M11 13l9 -9" />
                    <path d="M15 4h5v5" />
                  </svg>
                ) : null}
              </>
            );

            if (!problem.url) {
              return (
                <div key={problem.id} className="oi-list-item oi-list-item-static">
                  {content}
                </div>
              );
            }

            return (
              <a
                key={problem.id}
                className="oi-list-item"
                href={problem.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {content}
              </a>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export default ListWidget;