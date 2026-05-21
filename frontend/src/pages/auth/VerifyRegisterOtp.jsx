import { useContext, useState } from "react";

import api from "../../services/api";

import { AuthContext } from "../../context/AuthContext";

import { useNavigate } from "react-router-dom";

import { getDeviceId } from "../../utils/device";

import { isMobile } from "react-device-detect";

function VerifyRegisterOtp() {
  const navigate = useNavigate();

  const { setUser } = useContext(AuthContext);

  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const name = localStorage.getItem("register_name");

      const email = localStorage.getItem("register_email");

      // DEVICE ID
      const deviceId = await getDeviceId();

      // DEVICE TYPE
      const deviceType = isMobile ? "mobile" : "desktop";

      // FIRST ATTEMPT
      let res = await api.post("/auth/register/verify-otp", {
        name,
        email,
        otp,
        deviceId,
        deviceType,
      });

      // DEVICE REPLACEMENT
      if (res.data.replaceDevice) {
        const confirmReplace = window.confirm(res.data.message);

        // USER CANCELLED
        if (!confirmReplace) {
          setLoading(false);

          return;
        }

        // FORCE LOGIN
        res = await api.post("/auth/register/verify-otp", {
          name,
          email,
          otp,
          deviceId,
          deviceType,
          forceLogin: true,
        });
      }

      // SAVE TOKEN
      localStorage.setItem("token", res.data.token);

      setUser(res.data.user);

      localStorage.removeItem("register_name");

      localStorage.removeItem("register_email");

      alert("Registration Successful");

      navigate("/");
    } catch (error) {
      alert(error.response?.data?.message);
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
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  OTP Code
                </label>

                <div className="mt-1">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    placeholder="Enter OTP"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyRegisterOtp;
