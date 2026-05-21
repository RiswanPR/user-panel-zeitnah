import {
  useState,
  useEffect,
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

import {
  getDeviceId,
} from "../../utils/device";

import {
  isMobile,
} from "react-device-detect";

function VerifyOtp() {

  const { setUser } =
    useContext(AuthContext);

  const [otp, setOtp] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [resendLoading,
    setResendLoading] =
    useState(false);

  const [timer, setTimer] =
    useState(30);

  const navigate =
    useNavigate();

  // Countdown Timer
  useEffect(() => {

    if (timer <= 0) return;

    const interval =
      setInterval(() => {

        setTimer((prev) =>
          prev - 1
        );

      }, 1000);

    return () =>
      clearInterval(interval);

  }, [timer]);

  // VERIFY OTP
  const handleVerifyOtp =
    async () => {

      try {

        setLoading(true);

        const email =
          localStorage.getItem(
            "login_email"
          );

        // DEVICE ID
        const deviceId =
          await getDeviceId();

        // DEVICE TYPE
        const deviceType =
          isMobile
            ? "mobile"
            : "desktop";

        const res =
          await api.post(
            "/auth/login/verify-otp",
            {
              email,
              otp,
              deviceId,
              deviceType,
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

  // RESEND OTP
  const handleResendOtp =
    async () => {

      try {

        setResendLoading(true);

        const email =
          localStorage.getItem(
            "login_email"
          );

        await api.post(
          "/auth/login/send-otp",
          {
            email,
          }
        );

        alert("OTP Resent");

        setTimer(30);

      } catch (error) {

        alert(
          error.response?.data?.message
        );

      } finally {

        setResendLoading(false);

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

              {/* OTP Input */}
              <div>

                <label className="block text-sm font-medium text-gray-700">
                  OTP Code
                </label>

                <div className="mt-1">

                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value)
                    }
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />

                </div>

              </div>

              {/* Verify Button */}
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

              {/* Resend */}
              <div className="text-center">

                {
                  timer > 0 ? (

                    <p className="text-sm text-gray-500">
                      Resend OTP in {timer}s
                    </p>

                  ) : (

                    <button
                      onClick={handleResendOtp}
                      disabled={resendLoading}
                      className="text-sm font-medium text-black hover:underline"
                    >

                      {
                        resendLoading
                          ? "Sending..."
                          : "Resend OTP"
                      }

                    </button>

                  )
                }

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

export default VerifyOtp;