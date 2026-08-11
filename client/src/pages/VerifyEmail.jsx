import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { Mail, KeyRound, AlertCircle, CheckCircle } from "lucide-react";
import loginBg from "../images/logbg.jpg";
import logo from "../images/logo.png";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const prefilledEmail =
    (location.state && location.state.email) || "";

  const [email, setEmail] = useState(prefilledEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !otp) {
      setError("Email and OTP are required.");
      return;
    }

    if (otp.length !== 6) {
      setError("OTP must be 6 digits.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/auth/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });

      setSuccess(
        response.data?.msg ||
          "Email verified successfully! You can now log in."
      );

      // Optionally store token & user, but keep it simple: go to login
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      const msg =
        err.response?.data?.msg || "OTP verification failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${loginBg})`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-blue-900/75 to-blue-800/80"></div>

      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src={logo}
              alt="KDU Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-blue-950">
            Verify Your Email
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Enter the 6-digit code sent to your email to complete registration.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline w-4 h-4 mr-2 text-blue-700" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <KeyRound className="inline w-4 h-4 mr-2 text-blue-700" />
              6-digit OTP Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
              }
              required
              maxLength={6}
              className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white tracking-[0.5em] text-center font-semibold"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-3 flex items-start gap-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-900 to-amber-500 text-white py-3 px-4 rounded-lg text-base font-semibold hover:from-blue-950 hover:to-amber-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>

          <p className="text-xs text-gray-500 text-center mt-2">
            Didn’t get the code? Please check your spam/junk folder or try
            registering again.
          </p>
        </form>
      </div>
    </div>
  );
}


