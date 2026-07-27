import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import "./Profile.css";
import { FIND_RESULTS_URL, CONFIRM_RESULT_URL, USER_URL, GET_RESULTS_URL } from "./assetUrls";
const RATING_COLORS = {
  800: "#919191",
  2500: "#5bcfa2",
  3500: "#6de2e8",
  4500: "#775cd1",
  5500: "#ffd56b",
  6000: "#fcae65",
  7500: "#ed9a93",
  16000: "#ffffff",
};
const RATING_BOUNDS = [
  { min: 0, max: 800, color: RATING_COLORS[800] },
  { min: 800, max: 2500, color: RATING_COLORS[2500] },
  { min: 2500, max: 3500, color: RATING_COLORS[3500] },
  { min: 3500, max: 4500, color: RATING_COLORS[4500] },
  { min: 4500, max: 5500, color: RATING_COLORS[5500] },
  { min: 5500, max: 6000, color: RATING_COLORS[6000] },
  { min: 6000, max: 7500, color: RATING_COLORS[7500] },
  { min: 7500, max: 16000, color: RATING_COLORS[16000] },
];
const Profile = () => {
  const [user, setUser] = useState(null);
  const [oiModal, setOiModal] = useState(false);
  const [ratings, setRatings] = useState([]);


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          USER_URL,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await response.json();

        setUser(data);

      } catch (err) {
        console.error(err);
      }
    };


    fetchProfile();

  }, []);
  

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const response = await fetch(
          GET_RESULTS_URL,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load ratings");
        }

        const data = await response.json();

        setRatings(data);

      } catch (err) {
        console.error(err);
      }
    };

    fetchRatings();
  }, []);
  if (!user) {
    return <div>Loading...</div>;
  } 
  return (
    <main className="app">
      <section className="profile-card">
        <div className="profile-header">
          <img
            src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png` || "https://cdn.discordapp.com/embed/avatars/0.png"}
            alt={user.username}
            className="profile-avatar"
          />
          <div>
            <h1>
              {user.username}
            </h1>
            <p className="real-name">
              {
                user.result
                  ? `${user.result.year} • etap ${user.result.stage} • miejsce ${user.result.place}`
                  : "Brak potwierdzonego wyniku"
              }
            </p>
          </div>
        </div>
        {
          <section className={`rating-card ${!user.result ? "locked-rating" : ""}`}>
          <div className={!user.result ? "chart-blur" : ""}>
            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <LineChart data={ratings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                {
                  RATING_BOUNDS.map((bound) => (
                    <ReferenceArea
                      key={bound.min}
                      y1={bound.min}
                      y2={bound.max}
                      fill={bound.color}
                      fillOpacity={0.08}
                    />
                  ))
                }
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="#1a1f2c"
                  strokeWidth={3}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {
            !user.result && (
              <div className="rating-overlay">
                <div className="lock-icon">
                  🔒
                </div>
                <h2>
                  Rating zablokowany
                </h2>
                <p>
                  Zweryfikuj swój wynik w Olimpiadzie,
                  aby poznać swój rating oraz historię zmian.
                </p>
                <button
                  className="name-button"
                  onClick={() => setOiModal(true)}
                >
                  Zweryfikuj wynik
                </button>
              </div>
            )
          }
          </section>
        }
      </section>
      {
        oiModal && (
          <OIResultModal
            close={() => setOiModal(false)}
          />
        )
      }
    </main>
  );
};
const OIResultModal = ({ close }) => {
  const [contest, setContest] = useState("OI");
  const [year, setYear] = useState("");
  const [stage, setStage] = useState("");
  const [place, setPlace] = useState("");
  const [result, setResult] = useState(null);
  const searchResult = async () => {
    try {
      const response = await fetch(
        FIND_RESULTS_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            year,
            stage: Number(stage),
            place: Number(place),
            contest,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Didn't find the results");
      }

      const data = await response.json();

      setResult({
        contest,
        year,
        stage,
        place,
        center: data.center,
        rows: data.rows,
      });
    } catch (err) {
      console.error(err);
      alert(
        "Nie udało się znaleźć wyników!"
      );
    }
  };
  const confirmResult = async () => {
    try {
      const response = await fetch(
        CONFIRM_RESULT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            year,
            stage: Number(stage),
            place: Number(place),
          }),
        }
      );


      const data = await response.json();


      if (!response.ok) {
        throw new Error(
          data.error || "Nie udało się potwierdzić wyniku"
        );
      }


      close();
      window.location.reload();

    } catch (err) {
      console.error(err);

      alert(
        err.message
      );
    }
  };
  return (
    <Modal>
      {!result ? (
        <>
          <h2>Potwierdź wynik Olimpiady</h2>
          <p>
            Wybierz konkurs, a następnie podaj rok,
            etap oraz miejsce, które zająłeś.
          </p>
          <p>
            Pokażemy fragment rankingu i poprosimy
            Cię o potwierdzenie, że jest to Twój wynik.
          </p>
          <div className="contest-selector">
            <button
              className={`contest-button ${
                contest === "OI" ? "active" : ""
              }`}
              onClick={() => setContest("OI")}
            >
              OI
            </button>
            <button
              className="contest-button"
              disabled
            >
              OIJ
            </button>
          </div>
          <input
            className="token-input"
            placeholder="Edycja (np. 33)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <input
            className="token-input"
            placeholder="Etap (np. 3)"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          />
          <input
            className="token-input"
            placeholder="Miejsce"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
          <ModalButtons
            close={close}
            primary="Znajdź wynik"
            action={searchResult}
          />
        </>
      ) : (
        <>
          <h2>Czy to Twój wynik?</h2>
          <p>
            Jeśli rozpoznajesz swój fragment rankingu,
            potwierdź poniżej. Edycja: {year}, etap: {stage}.
          </p>
          <div className="oi-ranking-preview">
            <table>
              <thead>
                <tr>
                  <th>M.</th>
                  <th>Zawodnik</th>
                  {result.rows[0].scores.map((_, i) => (
                    <th key={i}>Z{i + 1}</th>
                  ))}
                  <th>Suma</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, idx) => (
                  <tr
                    key={row.place}
                    className={
                      idx === result.center
                        ? "ranking-selected"
                        : "ranking-faded"
                    }
                  >
                    <td>{row.place}</td>
                    <td>{row.initials}</td>
                    {row.scores.map((score, i) => (
                      <td key={i}>{score}</td>
                    ))}
                    <td>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ModalButtons
            close={close}
            primary="To mój wynik"
            action={confirmResult}
          />
        </>
      )}
    </Modal>
  );
};
const Modal = ({ children }) => (
  <div className="modal-background">
    <div className="modal">
      {children}
    </div>
  </div>
);
const ModalButtons = ({
  close,
  primary,
  action,
}) => (
  <div className="modal-actions">
    <button onClick={close}>
      Anuluj
    </button>
    <button
      className="name-button"
      onClick={action}
    >
      {primary}
    </button>
  </div>
);
export default Profile;