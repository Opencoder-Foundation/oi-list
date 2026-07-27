import { useEffect, useState } from "react";
import "./UserWidget.css";
import { USER_URL, AUTH_URL } from "./assetUrls";

const UserWidget = () => {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(USER_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (!user) {
    return (
      <a href={AUTH_URL} className="login-button">
        Login
      </a>
    );
  }

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;

  return (
    <a href="/profile" className="user-widget">
      <img
        src={avatarUrl}
        alt={user.username}
        className="user-avatar"
      />
      <span className="username">{user.username}</span>
    </a>
  );
};

export default UserWidget;