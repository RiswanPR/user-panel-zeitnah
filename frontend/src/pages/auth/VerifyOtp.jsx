import {
  useState,
  useContext,
} from "react";

import api
from "../../services/api";

import {
  AuthContext,
} from "../../context/AuthContext";

import {
  useNavigate,
} from "react-router-dom";

function VerifyOtp() {

  const { setUser } =
    useContext(AuthContext);

  const [otp, setOtp] =
    useState("");

  const navigate =
    useNavigate();

  const handleVerifyOtp =
    async () => {

      try {

        const email =
          localStorage.getItem(
            "email"
          );

        const res =
          await api.post(
            "/auth/verify-otp",
            {
              email,
              otp,
            }
          );

        localStorage.setItem(
          "token",
          res.data.token
        );

        setUser(res.data.user);

        navigate("/");

      } catch (error) {

        alert(
          error.response.data.message
        );

      }

    };

  return (

    <div>

      <h1>Verify OTP</h1>

      <input
        type="text"
        placeholder="Enter OTP"
        onChange={(e) =>
          setOtp(e.target.value)
        }
      />

      <button
        onClick={handleVerifyOtp}
      >
        Verify OTP
      </button>

    </div>

  );

}

export default VerifyOtp;