
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/health")
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Connection failed");
        }

        return data;
      })
      .then((data) => setConnection(data))
      .catch((error) => {
        setConnection({
          status: "error",
          message: error.message,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="connection-page">
      <section className="connection-card">
        <h1>Retail POS & Inventory System</h1>
        <p>System connection verification</p>

        {loading ? (
          <p>Checking backend and database...</p>
        ) : connection?.status === "success" ? (
          <>
            <h2>All connections successful</h2>
            <p>React frontend: Connected</p>
            <p>Node.js / Express: Connected</p>
            <p>MySQL: Connected</p>
            <p>
              Database: {connection.database.databaseName}
            </p>
            <p>
              Database user: {connection.database.databaseUser}
            </p>
            <p>
              MySQL version: {connection.database.mysqlVersion}
            </p>
          </>
        ) : (
          <>
            <h2>Connection failed</h2>
            <p>{connection?.message}</p>
            <p>Check the backend terminal and database settings.</p>
          </>
        )}
      </section>
    </main>
  );
}

export default App;
