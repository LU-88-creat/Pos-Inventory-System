
import { useState } from "react";
import Dashboard from "./Dashboard";
import Login from "./Login";
import "./App.css";

function App() {
  const [auth, setAuth] = useState(() => {
    const savedAuth = sessionStorage.getItem("retailflow_auth");

    try {
      return savedAuth ? JSON.parse(savedAuth) : null;
    } catch {
      sessionStorage.removeItem("retailflow_auth");
      return null;
    }
  });

  function handleLogin(data) {
    sessionStorage.setItem(
      "retailflow_auth",
      JSON.stringify(data)
    );

    setAuth(data);
  }

  function handleLogout() {
    sessionStorage.removeItem("retailflow_auth");
    setAuth(null);
  }

  if (!auth?.token || !auth?.user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      user={auth.user}
      token={auth.token}
      onLogout={handleLogout}
    />
  );
}

export default App;
