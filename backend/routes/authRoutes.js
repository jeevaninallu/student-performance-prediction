
const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Session = require("../models/Session");
const authMiddleware = require("../middleware/authMiddleware");

const User = require("../models/User");

const router = express.Router();

// Signup validation
const signupSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, "Full name must contain at least 2 characters")
    .max(100, "Full name is too long"),

  email: z.string()
    .trim()
    .email("Enter a valid email address")
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z.string()
    .min(8, "Password must contain at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),

  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    // Validate request body
    const validation = signupSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please check your signup details",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { fullName, email, password } = validation.data;

    // Check whether the email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Hash password using bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await User.create({
      fullName,
      email,
      passwordHash,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please log in.",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
      },
    });

  } catch (error) {
    
    
    // Handle duplicate-key errors
    if (error.code === 11000) {
    if (error.keyPattern?.email) {
        return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
        });
    }

    if (error.keyPattern?.googleId) {
        return res.status(409).json({
        success: false,
        message: "This Google account is already registered",
        });
    }

    console.error("Duplicate key error:", error.message);

    return res.status(409).json({
        success: false,
        message: "A duplicate account detail was detected.",
    });
    }


    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create your account. Please try again.",
    });
  }
});


const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email and password",
      });
    }

    const email = validation.data.email.toLowerCase();
    const { password } = validation.data;

    // Find account and explicitly include passwordHash
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check JWT secret
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error("JWT_ACCESS_SECRET is not configured");
    }

    // Generate short-lived access token
    const accessToken = jwt.sign(
      { sub: user._id.toString() },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "5m" }
    );

    // Generate a random refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Store only its SHA-256 hash
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    // Create browser session
    await Session.create({
      userId: user._id,
      refreshTokenHash,
    });

    // Send refresh token as an HTTP-only browser-session cookie
    res.cookie("sp_refresh", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again.",
    });
  }
});


const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const oldToken = req.cookies?.sp_refresh;

    if (!oldToken) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    const oldHash = hashRefreshToken(oldToken);

    // Find and atomically rotate the existing session token
    const newRefreshToken = crypto.randomBytes(64).toString("hex");
    const newHash = hashRefreshToken(newRefreshToken);

    const session = await Session.findOneAndUpdate(
      {
        refreshTokenHash: oldHash,
        revokedAt: null,
      },
      {
        $set: { refreshTokenHash: newHash },
      },
      { new: true }
    );

    if (!session) {
      res.clearCookie("sp_refresh", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth",
      });

      return res.status(401).json({
        success: false,
        message: "Invalid or expired session. Please log in again.",
      });
    }

    const accessToken = jwt.sign(
      { sub: session.userId.toString() },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "5m" }
    );

    res.cookie("sp_refresh", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      accessToken,
    });

  } catch (error) {
    console.error("Refresh error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to refresh session",
    });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies?.sp_refresh;

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);

      await Session.findOneAndUpdate(
        {
          refreshTokenHash: tokenHash,
          revokedAt: null,
        },
        {
          $set: { revokedAt: new Date() },
        }
      );
    }

    res.clearCookie("sp_refresh", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log out",
    });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "fullName email createdAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user profile",
    });
  }
});
module.exports = router;
