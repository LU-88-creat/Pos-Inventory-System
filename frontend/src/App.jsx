
import { useState } from "react";
import Dashboard from "./Dashboard";
import Login from "./Login";
import SignUp from "./SignUp";
import PlanSelection from "./PlanSelection";
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

  const [page, setPage] = useState("login");
  const [registrationData, setRegistrationData] = useState(null);

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
    setPage("login");
  }

  function handleRegistrationComplete(data) {
    setRegistrationData(data);
    setPage("plans");
  }

  function handlePlanSelected(data) {
    setRegistrationData(null);
    setPage("login");
  }

  if (auth?.token && auth?.user) {
    return (
      <Dashboard
        user={auth.user}
        token={auth.token}
        onLogout={handleLogout}
      />
    );
  }

  if (page === "signup") {
    return (
      <SignUp
        onRegistrationComplete={handleRegistrationComplete}
        onShowLogin={() => setPage("login")}
      />
    );
  }

  if (page === "plans" && registrationData?.registrationToken) {
    return (
      <PlanSelection
        registrationToken={registrationData.registrationToken}
        onPlanSelected={handlePlanSelected}
        onBack={() => setPage("signup")}
      />
    );
  }

  return (
    <Login
      onLogin={handleLogin}
      onShowSignUp={() => setPage("signup")}
    />
  );
}

export default App;
