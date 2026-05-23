import {
  useContext,
} from "react";

import {
  Link,
} from "react-router-dom";

import api
from "../../services/api";

import {
  AuthContext,
} from "../../context/AuthContext";

function Home() {

  const {
    user,
    setUser,
  } = useContext(
    AuthContext
  );

  // LOGOUT
  const handleLogout =
    async () => {

      try {

        await api.post(
          "/auth/logout"
        );

      } catch (error) {

        console.log(error);

      } finally {

        localStorage.removeItem(
          "token"
        );

        setUser(null);

        window.location.href =
          "/login";

      }

    };

  return (

    <div>

      <h1>
        Welcome {user?.name}
      </h1>

      <button
        onClick={handleLogout}
      >
        Logout
      </button>

      <p>
        <Link to="/active-sessions">
          Active Sessions
        </Link>
      </p>

      <p>
        <Link to="/audit-logs">
          Audit Logs
        </Link>
      </p>

    </div>

  );

}

export default Home;
