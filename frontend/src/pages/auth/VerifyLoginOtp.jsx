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

  const [loading, setLoading] =
    useState(false);

  const navigate =
    useNavigate();

  const handleVerifyOtp =
    async () => {

      try {

        setLoading(true);

        const email =
          localStorage.getItem(
            "login_email"
          );

        const res =
          await api.post(
            "/auth/login/verify-otp",
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

        localStorage.removeItem(
          "login_email"
        );

        alert("Login Successful");

        navigate("/");

      } catch (error) {

        alert(
          error.response?.data?.message
        );

      } finally {

        setLoading(false);

      }

    };

  return (

    <div className="h-full">

      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">

        {/* Heading */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">

          <h2 className="mt-6 text-center text-3xl font-extrabold text-black">
            Verify OTP
          </h2>

          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the OTP sent to your email
          </p>

        </div>

        {/* Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

          <div className="bg-white py-8 px-4 sm:shadow sm:rounded-lg sm:px-10 sm:border sm:border-gray-200">

            <div className="space-y-6">

              <div>

                <label className="block text-sm font-medium text-gray-700">
                  OTP Code
                </label>

                <div className="mt-1">

                  <input
                    type="text"
                    placeholder="Enter OTP"
                    onChange={(e) =>
                      setOtp(e.target.value)
                    }
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />

                </div>

              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800"
              >

                {
                  loading
                    ? "Verifying..."
                    : "Verify OTP"
                }

              </button>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

export default VerifyOtp;