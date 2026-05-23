import { useState } from "react";

import { useNavigate } from "react-router-dom";

import api from "../../services/api";

// Register renders the combined sign-in and account creation screen.
function Register() {
  // React Router navigation is used after the OTP request succeeds.
  const navigate = useNavigate();

  // Track which form is visible in the tabbed auth card.
  const [activeTab, setActiveTab] = useState("register");

  // Store the register form fields as controlled input values.
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
  });

  // Store the login form fields as controlled input values.
  const [loginData, setLoginData] = useState({
    email: "",
  });

  // Keep one loading state because only one auth form can be submitted at a time.
  const [loading, setLoading] = useState(false);

  // Read a useful API error message, with a fallback for network or unknown errors.
  const getErrorMessage = (error) =>
    error.response?.data?.message || "Something went wrong. Please try again.";

  // Update register form state when the user types in a register input.
  const handleRegisterChange = (e) => {
    const { name, value } = e.target;

    setRegisterData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  // Update login form state when the user types in the login email input.
  const handleLoginChange = (e) => {
    const { name, value } = e.target;

    setLoginData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  // Request a registration OTP, save the pending registration data, then open OTP verification.
  const handleRegister = async (e) => {
    e.preventDefault();

    const name = registerData.name.trim();
    const email = registerData.email.trim();

    if (!name || !email) {
      alert("Please enter your full name and email address.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register/send-otp", {
        name,
        email,
      });

      localStorage.setItem("register_name", name);
      localStorage.setItem("register_email", email);

      alert("OTP sent successfully.");

      navigate("/verify-register-otp");
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Request a login OTP, save the pending email, then open login OTP verification.
  const handleLogin = async (e) => {
    e.preventDefault();

    const email = loginData.email.trim();

    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/login/send-otp", {
        email,
      });

      localStorage.setItem("login_email", email);

      alert("OTP sent successfully.");

      navigate("/verify-otp");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full">
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Page heading shown above the auth card. */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-black">
            Welcome
          </h2>
        </div>

        {/* Auth card containing tabs and the selected form. */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 sm:shadow sm:rounded-lg sm:px-10 sm:border sm:border-gray-200">
            {/* Tabs switch between login and register without leaving the page. */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex-1 text-center ${
                  activeTab === "login"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("register")}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex-1 text-center ${
                  activeTab === "register"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Create account
              </button>
            </div>

            {/* Login form asks only for email because auth continues through OTP. */}
            {activeTab === "login" && (
              <div className="space-y-6 pt-6">
                <form className="space-y-6" onSubmit={handleLogin}>
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email address
                    </label>

                    <div className="mt-1">
                      <input
                        id="login-email"
                        type="email"
                        name="email"
                        value={loginData.email}
                        onChange={handleLoginChange}
                        required
                        autoComplete="email"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </form>
              </div>
            )}

            {/* Register form collects the data needed before sending the registration OTP. */}
            {activeTab === "register" && (
              <div className="space-y-6 pt-6">
                <form className="space-y-6" onSubmit={handleRegister}>
                  <div>
                    <label
                      htmlFor="register-name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Full Name
                    </label>

                    <div className="mt-1">
                      <input
                        id="register-name"
                        type="text"
                        name="name"
                        value={registerData.name}
                        onChange={handleRegisterChange}
                        required
                        autoComplete="name"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="register-email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email address
                    </label>

                    <div className="mt-1">
                      <input
                        id="register-email"
                        type="email"
                        name="email"
                        value={registerData.email}
                        onChange={handleRegisterChange}
                        required
                        autoComplete="email"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
                  >
                    {loading ? "Sending OTP..." : "Create account"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
