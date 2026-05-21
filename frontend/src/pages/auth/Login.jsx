import {
  useState,
} from "react";

import api
from "../../services/api";

import {
  useNavigate,
} from "react-router-dom";

function Login() {

  const [email, setEmail] =
    useState("");

  const navigate =
    useNavigate();

  const handleSendOtp =
    async () => {

      try {

        await api.post(
          "/auth/send-otp",
          {
            email,
          }
        );

        localStorage.setItem(
          "email",
          email
        );

        alert("OTP Sent");

        navigate("/verify-otp");

      } catch (error) {

        alert(
          error.response.data.message
        );

      }

    };

  return (

    <div>

      <h1>Login</h1>

      <input
        type="email"
        placeholder="Enter Email"
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <button
        onClick={handleSendOtp}
      >
        Send OTP
      </button>

    </div>

  );

}

export default Login;