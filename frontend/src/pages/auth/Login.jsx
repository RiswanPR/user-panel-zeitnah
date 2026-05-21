import { useState, useContext } from "react";

import api from "../../services/api";

import { AuthContext } from "../../context/AuthContext";

import { useNavigate } from "react-router-dom";

function Login() {
  const { setUser } = useContext(AuthContext);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const handleLogin = async () => {
    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);

      setUser(res.data.user);
      navigate("/");
      alert("Login Success");
    } catch (error) {
      alert(error.response.data.message);
    }
  };

  return (
    <div>
      <h1>Login</h1>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;
