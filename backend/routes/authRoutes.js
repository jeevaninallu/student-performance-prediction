
const express = require("express");
const bcrypt = require("bcrypt");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const Session = require("../models/Session");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// Google OAuth 2.0 Authorization Code client
const googleOAuthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.CLIENT_ORIGIN
);
// --------------------------------------------------
// COMMON HELPER FUNCTIONS
// --------------------------------------------------

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const generateAccessToken = (userId) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }

  return jwt.sign(
    { sub: userId.toString() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "5m" }
  );
};

const createUserSession = async (userId, res) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");

  const refreshTokenHash = hashRefreshToken(refreshToken);

  await Session.create({
    userId,
    refreshTokenHash,
  });

  res.cookie("sp_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
};

// --------------------------------------------------
// COMPLETE GOOGLE OAUTH LOGIN
// --------------------------------------------------

const completeGoogleOAuthLogin = async (
  { googleId, email, fullName, linkingPassword },
  res
) => {
  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({ email }).select("+passwordHash");

    if (user) {
      // Existing password account requires password verification
      if (user.passwordHash) {
        if (!linkingPassword) {
          return {
            requiresPasswordLink: true,
            user: null,
          };
        }

        const passwordMatches = await bcrypt.compare(
          linkingPassword,
          user.passwordHash
        );

        if (!passwordMatches) {
          return {
            invalidPassword: true,
            user: null,
          };
        }
      }

      user.googleId = googleId;
      await user.save();

    } else {
      user = await User.create({
        fullName,
        email,
        googleId,
        passwordHash: null,
      });
    }
  }

  const accessToken = generateAccessToken(user._id);

  await createUserSession(user._id, res);

  return {
    success: true,
    accessToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
    },
  };
};
// --------------------------------------------------
// SIGNUP VALIDATION
// --------------------------------------------------

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

// --------------------------------------------------
// POST /api/auth/register
// --------------------------------------------------

router.post("/register", async (req, res) => {
  try {
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

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

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
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create your account. Please try again.",
    });
  }
});

// --------------------------------------------------
// LOGIN VALIDATION
// --------------------------------------------------

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// --------------------------------------------------
// POST /api/auth/login
// --------------------------------------------------

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

    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

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

    const accessToken = generateAccessToken(user._id);

    await createUserSession(user._id, res);

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

// --------------------------------------------------
// POST /api/auth/google
// GOOGLE SIGN-IN WITH ACCOUNT LINKING
// --------------------------------------------------

router.post("/google", async (req, res) => {
  try {
    // Validate Google token and optional existing password
    const validation = z.object({
      idToken: z.string().min(1, "Google ID token is required"),
      linkingPassword: z.string().max(128).optional(),
    }).safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("GOOGLE_CLIENT_ID is not configured");

      return res.status(500).json({
        success: false,
        message: "Google authentication is not configured",
      });
    }

    // Verify the ID token with Google
    let payload;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: validation.data.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      payload = ticket.getPayload();

    } catch (verificationError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Google ID token",
      });
    }

    // Verify Google account details
    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      return res.status(401).json({
        success: false,
        message: "Google account could not be verified",
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();

    const fullName = (payload.name || email.split("@")[0])
      .trim()
      .slice(0, 100);

    // Find account already linked to this Google ID
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check whether the email already exists
      user = await User.findOne({ email }).select("+passwordHash");

      if (user) {
        // Existing password account requires password verification
        if (user.passwordHash) {
          const linkingPassword = validation.data.linkingPassword;

          // Ask frontend for the existing account password
          if (!linkingPassword) {
            return res.status(409).json({
              success: false,
              requiresPasswordLink: true,
              message:
                "An account already exists with this email. Enter your existing password to link Google login.",
            });
          }

          // Verify the existing password using bcrypt
          const passwordMatches = await bcrypt.compare(
            linkingPassword,
            user.passwordHash
          );

          if (!passwordMatches) {
            return res.status(401).json({
              success: false,
              message: "Incorrect password. Please try again.",
            });
          }
        }

        // Link Google account to the existing user
        user.googleId = googleId;
        await user.save();

      } else {
        // Create a new Google student account
        user = await User.create({
          fullName,
          email,
          googleId,
          passwordHash: null,
        });
      }
    }

    // Generate application access token
    const accessToken = generateAccessToken(user._id);

    // Create application refresh session
    await createUserSession(user._id, res);

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Google account or email is already registered",
      });
    }

    console.error("Google authentication error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to complete Google authentication",
    });
  }
});

// --------------------------------------------------
// POST /api/auth/google/oauth
// GOOGLE OAUTH 2.0 AUTHORIZATION CODE FLOW
// --------------------------------------------------

router.post("/google/oauth", async (req, res) => {
  try {
    // Validate the popup request to help prevent CSRF
    if (
      req.get("X-Requested-With") !== "XMLHttpRequest" ||
      req.get("Origin") !== process.env.CLIENT_ORIGIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid OAuth request origin",
      });
    }

    const validation = z.object({
      code: z.string().min(1, "Authorization code is required"),
    }).safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
      });
    }

    if (
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET ||
      !process.env.CLIENT_ORIGIN
    ) {
      return res.status(500).json({
        success: false,
        message: "Google OAuth is not configured",
      });
    }

    // Exchange authorization code for Google tokens
    let tokens;

    try {
      const tokenResponse = await googleOAuthClient.getToken({
        code: validation.data.code,
        redirect_uri: process.env.CLIENT_ORIGIN,
      });

      tokens = tokenResponse.tokens;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Google authorization code",
      });
    }

    if (!tokens.access_token) {
      return res.status(401).json({
        success: false,
        message: "Google did not return an access token",
      });
    }

    // Retrieve the authorized Google user's profile
    const profileResponse = await axios.get(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const profile = profileResponse.data;

    if (
      !profile.sub ||
      !profile.email ||
      profile.email_verified !== true
    ) {
      return res.status(401).json({
        success: false,
        message: "Google account could not be verified",
      });
    }

    const googleId = profile.sub;
    const email = profile.email.toLowerCase();

    const fullName = (profile.name || email.split("@")[0])
      .trim()
      .slice(0, 100);

    // Create/login/link the application account
    const result = await completeGoogleOAuthLogin(
      {
        googleId,
        email,
        fullName,
      },
      res
    );

    // Existing password account requires verification
    if (result.requiresPasswordLink) {
      const pendingGoogleLinkToken = jwt.sign(
        {
          googleId,
          email,
          fullName,
          purpose: "google-account-link",
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "5m" }
      );

      return res.status(409).json({
        success: false,
        requiresPasswordLink: true,
        pendingGoogleLinkToken,
        message: "Enter your existing password to link Google login",
      });
    }

    // Return the app session and development-only Google token
    return res.status(200).json({
      ...result,

      // Only for local Postman demonstration.
      // Never expose Google access tokens in production.
      ...(process.env.NODE_ENV !== "production"
        ? { googleAccessTokenForDemo: tokens.access_token }
        : {}),
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Google account or email is already registered",
      });
    }

    console.error("Google OAuth error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to complete Google OAuth login",
    });
  }
});


// --------------------------------------------------
// POST /api/auth/google/oauth/link
// VERIFY PASSWORD AND LINK EXISTING ACCOUNT
// --------------------------------------------------

router.post("/google/oauth/link", async (req, res) => {
  try {
    const validation = z.object({
      pendingGoogleLinkToken: z.string().min(1),
      linkingPassword: z.string().min(1).max(128),
    }).safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Pending token and password are required",
      });
    }

    const decoded = jwt.verify(
      validation.data.pendingGoogleLinkToken,
      process.env.JWT_ACCESS_SECRET
    );

    if (decoded.purpose !== "google-account-link") {
      return res.status(401).json({
        success: false,
        message: "Invalid account-linking token",
      });
    }

    const result = await completeGoogleOAuthLogin(
      {
        googleId: decoded.googleId,
        email: decoded.email,
        fullName: decoded.fullName,
        linkingPassword: validation.data.linkingPassword,
      },
      res
    );

    if (result.invalidPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again.",
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Account-linking session expired. Please try Google login again.",
      });
    }

    console.error("Google account linking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to link Google account",
    });
  }
});

// --------------------------------------------------
// POST /api/auth/refresh
// --------------------------------------------------

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

    const accessToken = generateAccessToken(session.userId);

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

// --------------------------------------------------
// POST /api/auth/logout
// --------------------------------------------------

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

// --------------------------------------------------
// GET /api/auth/me
// --------------------------------------------------

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


// --------------------------------------------------
// PUT /api/auth/profile
// UPDATE LOGGED-IN STUDENT PROFILE
// --------------------------------------------------

const updateProfileSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, "Full name must contain at least 2 characters")
    .max(100, "Full name is too long"),

  email: z.string()
    .trim()
    .email("Enter a valid email address")
    .max(254)
    .transform((value) => value.toLowerCase()),
}).strict();

router.put("/profile", authMiddleware, async (req, res) => {
  try {
    // 1. Validate incoming profile details
    const validation = updateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid profile details",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { fullName, email } = validation.data;

    // 2. Find the authenticated student
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    // 3. Check whether another account uses this email
    const existingUser = await User.findOne({
      email,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    // 4. Update permitted profile fields only
    user.fullName = fullName;
    user.email = email;

    await user.save();

    // 5. Return updated profile
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    console.error("Profile update error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile",
    });
  }
});


module.exports = router;
