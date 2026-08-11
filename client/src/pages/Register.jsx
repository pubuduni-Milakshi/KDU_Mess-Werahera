import React, { useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Phone,
  CreditCard,
  Eye,
  EyeOff,
  Building2,
  Users,
  Home,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import regBg from "../images/reg.jpg";
import logo from "../images/logo.png";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: "",
    roleId: "",
    firstName: "",
    lastName: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
    gender: "",
    intake: "",
    faculty: "",
    roomNo: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});

  // ========== VALIDATION HELPER FUNCTIONS ==========
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateRoleId = (roleId) => {
    const roleIdRegex = /^[a-zA-Z0-9\-/]+$/;
    return roleIdRegex.test(roleId);
  };

  const validateStrongPassword = (password) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  };

  const validateName = (name) => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    return nameRegex.test(name);
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: "", color: "" };
    if (password.length < 8) return { strength: "Too short", color: "text-red-500" };
    if (!validateStrongPassword(password)) return { strength: "Weak", color: "text-orange-500" };
    return { strength: "Strong", color: "text-green-500" };
  };

  // ========== HANDLE CHANGE WITH VALIDATION ==========
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (value.length > 255) {
      setErrors((prev) => ({
        ...prev,
        [name]: "Input cannot exceed 255 characters",
      }));
      return;
    }

    setFormData({ ...formData, [name]: value });

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      delete newErrors.general;
      return newErrors;
    });

    if (!touchedFields[name]) {
      return;
    }

    if (name === "email" && value) {
      if (!validateEmail(value)) {
        setErrors((prev) => ({ ...prev, email: "Invalid email format" }));
      }
    }

    if (name === "roleId" && value) {
      if (!validateRoleId(value)) {
        setErrors((prev) => ({
          ...prev,
          roleId: "Role ID can only contain letters, numbers, hyphens, and slashes",
        }));
      }
    }

    if (name === "firstName" || name === "lastName") {
      if (value && !validateName(value)) {
        setErrors((prev) => ({
          ...prev,
          [name]: "Name can only contain letters and spaces",
        }));
      }
    }

    if (name === "password" && value) {
      if (value.length < 8) {
        setErrors((prev) => ({
          ...prev,
          password: "Password must be at least 8 characters",
        }));
      } else if (!validateStrongPassword(value)) {
        setErrors((prev) => ({
          ...prev,
          password: "Password must contain uppercase, lowercase, number, and special character",
        }));
      }
    }

    if (name === "confirmPassword" && value) {
      if (value !== formData.password) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      }
    }
  };

  // ========== HANDLE BLUR ==========
  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    setTouchedFields((prev) => ({ ...prev, [name]: true }));

    if (name === "email" && value) {
      if (!validateEmail(value)) {
        setErrors((prev) => ({ ...prev, email: "Invalid email format" }));
      }
    }

    if (name === "roleId" && value) {
      if (!validateRoleId(value)) {
        setErrors((prev) => ({
          ...prev,
          roleId: "Role ID can only contain letters, numbers, hyphens, and slashes",
        }));
      }
    }

    if (name === "firstName" || name === "lastName") {
      if (value && !validateName(value)) {
        setErrors((prev) => ({
          ...prev,
          [name]: "Name can only contain letters and spaces",
        }));
      }
    }

    if (name === "password" && value) {
      if (value.length < 8) {
        setErrors((prev) => ({
          ...prev,
          password: "Password must be at least 8 characters",
        }));
      } else if (!validateStrongPassword(value)) {
        setErrors((prev) => ({
          ...prev,
          password: "Password must contain uppercase, lowercase, number, and special character",
        }));
      }
    }

    if (name === "confirmPassword" && value) {
      if (value !== formData.password) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      }
    }
  };

// ========== HANDLE SUBMIT (Backend sends OTP email) ==========
const handleSubmit = async (e) => {
  e.preventDefault();

  const newErrors = {};

  if (!formData.role || !formData.roleId || !formData.firstName || !formData.lastName || 
      !formData.email || !formData.password || !formData.confirmPassword || !formData.gender) {
    newErrors.general = "All fields are required";
    setErrors(newErrors);
    alert("All fields are required");
    return;
  }

  if (!formData.email || formData.email.trim() === "") {
    newErrors.email = "Email is required";
  }

  if (!formData.password || formData.password.trim() === "") {
    newErrors.password = "Password is required";
  }

  if (formData.email && !validateEmail(formData.email)) {
    newErrors.email = "Invalid email format";
  }

  if (formData.roleId && !validateRoleId(formData.roleId)) {
    newErrors.roleId = "Role ID can only contain letters, numbers, hyphens, and slashes";
  }

  if (formData.firstName && !validateName(formData.firstName)) {
    newErrors.firstName = "First name can only contain letters and spaces";
  }
  if (formData.lastName && !validateName(formData.lastName)) {
    newErrors.lastName = "Last name can only contain letters and spaces";
  }

  if (formData.password && formData.password.length < 8) {
    newErrors.password = "Password must be at least 8 characters";
  }

  if (formData.password && !validateStrongPassword(formData.password)) {
    newErrors.password = "Password must contain uppercase, lowercase, number, and special character";
  }

  if (formData.password !== formData.confirmPassword) {
    newErrors.confirmPassword = "Passwords do not match";
    alert("Passwords do not match!");
    setErrors(newErrors);
    return;
  }

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  setLoading(true);
  setErrors({});

  try {
    const payload = {
      role: formData.role,
      roleId: formData.roleId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      contact: formData.contact,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      gender: formData.gender,
    };

    if (formData.intake) payload.intake = formData.intake;
    if (formData.faculty) payload.faculty = formData.faculty;
    if (formData.roomNo) payload.roomNo = formData.roomNo;

    console.log('📤 Sending registration request...');
    const response = await axios.post("/auth/register", payload);

    console.log('✅ Registration request successful, response:', response.data);

    // Backend already sends OTP / verification code email
    const successMsg =
      response.data.msg ||
      "Registration initiated! Please check your email for the verification code.";

    alert(successMsg);
    // Redirect to verification page with email pre-filled
    navigate("/verify-email", { state: { email: formData.email } });
    
  } catch (err) {
    setLoading(false);
    console.error('❌ Registration error:', err);

    if (err.response && err.response.data) {
      const errorMsg = err.response.data.msg;
      const testCase = err.response.data.testCase;

      if (testCase === "REG-02" || errorMsg.includes("Email already exists")) {
        setErrors({ email: errorMsg });
        alert(errorMsg);
      }
      else if (testCase === "REG-14" || errorMsg.includes("Role ID already exists")) {
        setErrors({ roleId: errorMsg });
        alert(errorMsg);
      } else {
        alert(errorMsg || "Registration failed!");
      }
    } else {
      alert("Registration failed!");
    }
  } finally {
    setLoading(false);
  }
};
  const getRoleIdLabel = () => {
    switch (formData.role) {
      case "Day Scholar":
        return "Day Scholar ID";
      case "Officer Cadet":
        return "Cadet ID";
      case "Mess Staff":
        return "Mess Staff ID";
      default:
        return "Role ID";
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${regBg})`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-blue-900/75 to-blue-800/80"></div>

      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-4xl p-6 my-6">
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <img
              src={logo}
              alt="KDU Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-blue-950">Create Account</h1>
          <p className="text-lg text-gray-600 mt-2">Join KDU Mess</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row 1: Role and Role ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                <User className="inline w-5 h-5 mr-2 text-blue-700" />
                Select Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">Choose your role</option>
                <option value="Day Scholar">Day Scholar</option>
                <option value="Officer Cadet">Officer Cadet</option>
                <option value="Mess Staff">Mess Staff</option>
              </select>
            </div>

            {formData.role && (
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  <CreditCard className="inline w-5 h-5 mr-2 text-blue-700" />
                  {getRoleIdLabel()} *
                </label>
                <input
                  type="text"
                  name="roleId"
                  value={formData.roleId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength="255"
                  required
                  className={`w-full px-4 py-2.5 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                    errors.roleId ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.roleId && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.roleId}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Row 2: First Name and Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength="255"
                required
                className={`w-full px-4 py-2.5 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.firstName ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.firstName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength="255"
                required
                className={`w-full px-4 py-2.5 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.lastName ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Row 3: Gender Only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                <Users className="inline w-5 h-5 mr-2 text-blue-700" />
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Row 4: Email and Contact Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                <Mail className="inline w-5 h-5 mr-2 text-blue-700" />
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength="255"
                required
                className={`w-full px-4 py-2.5 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                <Phone className="inline w-5 h-5 mr-2 text-blue-700" />
                Contact Number *
              </label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength="10"
                required
                className={`w-full px-4 py-2.5 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.contact ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.contact && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.contact}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Enter 10-digit mobile number (numbers only)
              </p>
            </div>
          </div>

          {/* Row 5: Faculty and Intake */}
          {(formData.role === "Officer Cadet" ||
            formData.role === "Day Scholar") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  <Building2 className="inline w-5 h-5 mr-2 text-blue-700" />
                  Faculty *
                </label>
                <select
                  name="faculty"
                  value={formData.faculty}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="">Select Faculty</option>
                  <option value="Faculty of Defence & Strategic Studies">
                    Faculty of Defence & Strategic Studies
                  </option>
                  <option value="Faculty of Computing">
                    Faculty of Computing
                  </option>
                  <option value="Faculty of Engineering">
                    Faculty of Engineering
                  </option>
                  <option value="Faculty of Medicine">
                    Faculty of Medicine
                  </option>
                  <option value="Faculty of Allied Health Sciences">
                    Faculty of Allied Health Sciences
                  </option>
                  <option value="Faculty of Law">Faculty of Law</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  Intake *
                </label>
                <input
                  type="text"
                  name="intake"
                  value={formData.intake}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                />
              </div>
            </div>
          )}

          {/* Row 6: Room Number */}
          {(formData.role === "Officer Cadet" ||
            formData.role === "Day Scholar") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  <Home className="inline w-5 h-5 mr-2 text-blue-700" />
                  Room Number *
                </label>
                <input
                  type="text"
                  name="roomNo"
                  value={formData.roomNo}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                />
              </div>
            </div>
          )}

          {/* Row 7: Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                <Lock className="inline w-5 h-5 mr-2 text-blue-700" />
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength="255"
                  required
                  className={`w-full px-4 py-2.5 pr-12 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
              {formData.password && !errors.password && (
                <p className={`text-sm mt-1 font-semibold ${passwordStrength.color}`}>
                  Strength: {passwordStrength.strength}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                At least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                <Lock className="inline w-5 h-5 mr-2 text-blue-700" />
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength="255"
                  required
                  className={`w-full px-4 py-2.5 pr-12 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                    errors.confirmPassword ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.confirmPassword}
                </p>
              )}
              {formData.confirmPassword &&
                formData.password === formData.confirmPassword &&
                !errors.confirmPassword && (
                  <p className="text-green-500 text-sm mt-1 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Passwords match
                  </p>
                )}
            </div>
          </div>

          {/* Error Display */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-700 mb-2 text-base">
                    Please fix the following errors to continue:
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {Object.entries(errors).map(([field, message]) => (
                      <li key={field}>
                        <strong className="capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}:
                        </strong>{" "}
                        {message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-900 to-amber-500 text-white py-3 px-4 rounded-lg text-lg font-semibold hover:from-blue-950 hover:to-amber-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>

          {/* Login Link */}
          <div className="text-center mt-3">
            <p className="text-base text-gray-600">
              Already have an account?{" "}
              <span
                className="text-blue-700 hover:text-blue-800 font-semibold cursor-pointer"
                onClick={() => navigate("/login")}
              >
                Log In
              </span>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p className="font-medium text-blue-950">
            © 2025 KDU Mess Management System
          </p>
        </div>
      </div>
    </div>
  );
}