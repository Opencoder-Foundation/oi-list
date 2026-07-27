import { useEffect, useState } from "react";
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
import { USER_URL } from "./assetUrls";

const RATING_COLORS = {
  800: "#919191",
  2500: "#5bcfa2",
  3500: "#6de2e8",
  4500: "#775cd1",
  5500: "#ffd56b",
  6000: "#fcae65",
  7500: "#ed9a93",
  14101: "#ffffff",
};

const BOUNDS = [
  { min: 0, max: 800, color: RATING_COLORS[800] },
  { min: 800, max: 2500, color: RATING_COLORS[2500] },
  { min: 2500, max: 3500, color: RATING_COLORS[3500] },
  { min: 3500, max: 4500, color: RATING_COLORS[4500] },
  { min: 4500, max: 5500, color: RATING_COLORS[5500] },
  { min: 5500, max: 6000, color: RATING_COLORS[6000] },
  { min: 6000, max: 7500, color: RATING_COLORS[7500] },
  { min: 7500, max: 10000, color: RATING_COLORS[14101] },
];

const Profile = () => {
  const [user, setUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [needsName, setNeedsName] = useState(false);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    fetch(USER_URL)
      .then((r) => r.json())
      .then(setUser);

    fetch("/api/rating")
      .then(async (r) => {
        if (!r.ok) {
          setNeedsName(true);
          return null;
        }

        return r.json();
      })
      .then((data) => {
        if (!data) return;

        setRatings(
          Object.entries(data).map(([year, rating]) => ({
            year,
            rating,
          }))
        );
      });
  }, []);


  if (!user) {
    return null;
  }

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";


  return (
    <main className="app">
      <section className="profile-card">

        <div className="profile-header">
          <img
            src={avatarUrl}
            alt={user.username}
            className="profile-avatar"
          />

          <div>
            <h1>{user.username}</h1>

            {user.real_name ? (
              <p className="real-name">
                {user.real_name}
              </p>
            ) : null}
          </div>
        </div>


        {needsName ? (
          <button
            className="name-button"
            onClick={() => setModal(true)}
          >
            Dodaj swoje imię
          </button>
        ) : null}


        {ratings.length > 0 ? (
          <section className="rating-card">

            <h2>Rating</h2>

            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={ratings}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="year" />

                <YAxis />

                <Tooltip />


                {BOUNDS.map((b) => (
                  <ReferenceArea
                    key={b.min}
                    y1={b.min}
                    y2={b.max}
                    fill={b.color}
                    fillOpacity={0.08}
                  />
                ))}


                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="#1a1f2c"
                  strokeWidth={3}
                  dot
                />

              </LineChart>
            </ResponsiveContainer>

          </section>
        ) : null}

      </section>


      {modal ? (
        <NameModal
          close={() => setModal(false)}
        />
      ) : null}

    </main>
  );
};



const NameModal = ({ close }) => {

  const [name, setName] = useState("");

  const submit = async () => {

    await fetch("/api/name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
      }),
    });

    close();
    window.location.reload();
  };


  return (
    <div className="modal-background">

      <div className="modal">

        <h2>
          Podaj swoje imię i nazwisko
        </h2>

        <p>
          Wpisz swoje prawdziwe imię i nazwisko.
          Nie będzie można go później zmienić.
          Wpisz je dokładnie tak, jak zostało zapisane
          w wynikach OI.
        </p>

        <p>
          Podając swoje dane zgadzasz się na ich
          przetwarzanie przez zadania.oki.org.pl.
        </p>


        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Imię Nazwisko"
        />


        <div className="modal-actions">

          <button onClick={close}>
            Anuluj
          </button>

          <button
            className="name-button"
            disabled={!name.trim()}
            onClick={submit}
          >
            Zapisz
          </button>

        </div>

      </div>

    </div>
  );
};


export default Profile;