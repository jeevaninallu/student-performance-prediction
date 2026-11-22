
const jwt = require("jsonwebtoken");
const authMiddleware = require("../../../../backend/middleware/authMiddleware");

process.env.JWT_ACCESS_SECRET = "test_secret_for_jest_only";

describe("Authentication Middleware Tests", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  test("AUTH-01: Reject request when Authorization header is missing", () => {
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("AUTH-02: Reject request with invalid JWT", () => {
    req.headers.authorization = "Bearer invalid_token";

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired access token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("AUTH-03: Allow request with valid JWT", () => {
    const userId = "691234567890123456789012";

    const token = jwt.sign(
      { sub: userId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "5m" }
    );

    req.headers.authorization = `Bearer ${token}`;

    authMiddleware(req, res, next);

    expect(req.userId).toBe(userId);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("AUTH-04: Reject expired JWT", () => {
    const token = jwt.sign(
      { sub: "691234567890123456789012" },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "-1s" }
    );

    req.headers.authorization = `Bearer ${token}`;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired access token",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
