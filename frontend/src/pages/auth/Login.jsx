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

  const [loading, setLoading] =
    useState(false);

  const handleSendOtp =
    async () => {

      try {

        setLoading(true);

        await api.post(
          "/auth/login/send-otp",
          {
            email,
          }
        );

        localStorage.setItem(
          "login_email",
          email
        );

        alert("OTP Sent");

        navigate(
          "/verify-login-otp"
        );

      } catch (error) {

        alert(
          error.response?.data?.message
        );

      } finally {

        setLoading(false);

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
        disabled={loading}
      >

        {
          loading
            ? "Sending OTP..."
            : "Send OTP"
        }

      </button>

    </div>

  );

}

export default Login;