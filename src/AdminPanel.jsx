import { useEffect, useState } from "react";
import { USER_URL, USERS_URL } from "./assetUrls";
import "./AdminPanel.css";

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const userResponse = await fetch(USER_URL, {
          credentials: "include",
        });

        if (!userResponse.ok) {
          setError("Zaloguj się, aby uzyskać dostęp do panelu administratora.");
          return;
        }

        const currentUser = await userResponse.json();

        if (!currentUser.is_admin) {
          setError("Nie masz uprawnień administratora.");
          return;
        }

        const usersResponse = await fetch(USERS_URL, {
          credentials: "include",
        });

        const usersData = await usersResponse.json();

        if (!usersResponse.ok) {
          throw new Error(usersData.error || "Nie udało się pobrać listy użytkowników.");
        }

        setUsers(usersData);
      } catch (err) {
        console.error(err);
        setError(err.message || "Wystąpił nieznany błąd.");
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  return (
    <main className="app">
      <section className="admin-card">
        <div className="admin-header">
          <h1>Panel administratora</h1>
          <a href="/" className="admin-back-link">Powrót</a>
        </div>

        {loading ? (
          <p>Ładowanie...</p>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Discord ID</th>
                  <th>Nazwa użytkownika</th>
                  <th>Rola</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.discord_id}</td>
                    <td>{user.username}</td>
                    <td>{user.is_admin ? "Admin" : "Użytkownik"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default AdminPanel;
