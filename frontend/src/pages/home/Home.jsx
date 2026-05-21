import { useContext } from "react";

import { AuthContext } from "../../context/AuthContext";

const logout = () => {
  localStorage.removeItem("token");

  window.location.href = "/login";
};
function Home() {
  const { user } = useContext(AuthContext);
  
  return (
    <div>
      <h1>Welcome {user?.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default Home;
