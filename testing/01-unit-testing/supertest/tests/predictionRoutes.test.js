
const request = require("supertest");
const jwt = require("jsonwebtoken");
const axios = require("axios");

jest.mock("axios", () => ({
  post: jest.fn(),
}));

jest.mock("../../../../backend/models/Prediction", () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
}));

const Prediction = require("../../../../backend/models/Prediction");

process.env.JWT_ACCESS_SECRET = "test_secret_for_jest_only";
process.env.ML_SERVICE_URL = "http://localhost:5001";
process.env.ML_SERVICE_API_KEY = "test_ml_key";

const { app } = require("../../../../backend/server");

const validStudentData = {
  Hours_Studied: 5,
  Attendance: 90,
  Parental_Involvement: "High",
  Access_to_Resources: "High",
  Extracurricular_Activities: "Yes",
  Sleep_Hours: 8,
  Previous_Scores: 75,
  Motivation_Level: "High",
  Internet_Access: "Yes",
  Tutoring_Sessions: 2,
  Family_Income: "Medium",
  Teacher_Quality: "High",
  School_Type: "Private",
  Peer_Influence: "Positive",
  Physical_Activity: 3,
  Learning_Disabilities: "No",
  Parental_Education_Level: "College",
  Distance_from_Home: "Near",
  Gender: "Female",
};

function createAccessToken(userId = "691234567890123456789012") {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "5m" }
  );
}

describe("Prediction API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // API-01: Health check
  test("API-01: Health endpoint should return 200", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Student Performance Prediction API is running"
    );
  });

  // API-02: Reject unauthenticated prediction
  test("API-02: Should reject prediction without access token", async () => {
    const response = await request(app)
      .post("/api/predictions")
      .send(validStudentData);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Authentication required");
  });

  // API-03: Reject invalid prediction input
  test("API-03: Should reject invalid prediction input", async () => {
    const response = await request(app)
      .post("/api/predictions")
      .set("Authorization", `Bearer ${createAccessToken()}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid prediction input");
  });

  // API-04: Generate prediction successfully
  test("API-04: Should generate prediction for authenticated student", async () => {
    const userId = "691234567890123456789012";
    const createdAt = new Date();

    axios.post.mockResolvedValue({
      data: {
        predicted_score: 75.5,
        classification: "Not Low-Level",
      },
    });

    Prediction.create.mockResolvedValue({
      _id: "691234567890123456789099",
      predictedScore: 75.5,
      classification: "Not Low-Level",
      createdAt,
    });

    const response = await request(app)
      .post("/api/predictions")
      .set("Authorization", `Bearer ${createAccessToken(userId)}`)
      .send(validStudentData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.prediction.predictedScore).toBe(75.5);
    expect(response.body.prediction.classification).toBe("Not Low-Level");

    expect(Prediction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        predictedScore: 75.5,
        classification: "Not Low-Level",
      })
    );
  });

  // API-05: Protect prediction history
  test("API-05: Should reject prediction history without access token", async () => {
    const response = await request(app)
      .get("/api/predictions");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Authentication required");
  });

  // API-06: Protect analytics
  test("API-06: Should reject analytics without access token", async () => {
    const response = await request(app)
      .get("/api/predictions/analytics");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Authentication required");
  });
});
    
  // API-07: Verify prediction history is restricted to the logged-in student
  test("API-07: Should retrieve history using only the authenticated student's ID", async () => {
    const userId = "691234567890123456789012";

    const query = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };

    Prediction.find.mockReturnValue(query);
    Prediction.countDocuments.mockResolvedValue(0);

    const response = await request(app)
      .get("/api/predictions")
      .set("Authorization", `Bearer ${createAccessToken(userId)}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // The database query must use the verified JWT user ID.
    expect(Prediction.find).toHaveBeenCalledWith({ userId });
    expect(Prediction.countDocuments).toHaveBeenCalledWith({ userId });
  });

  // API-08: Verify analytics is restricted to the logged-in student
  test("API-08: Should retrieve analytics using only the authenticated student's ID", async () => {
    const userId = "691234567890123456789012";

    const query = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };

    Prediction.aggregate.mockResolvedValue([]);
    Prediction.find.mockReturnValue(query);

    const response = await request(app)
      .get("/api/predictions/analytics")
      .set("Authorization", `Bearer ${createAccessToken(userId)}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Every analytics aggregation must filter by the authenticated student.
    expect(Prediction.aggregate).toHaveBeenCalled();

    for (const aggregationCall of Prediction.aggregate.mock.calls) {
      const matchStage = aggregationCall[0].find(
        (stage) => stage.$match
      );

      expect(matchStage).toBeDefined();
      expect(matchStage.$match.userId.toString()).toBe(userId);
    }

    expect(Prediction.find).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.anything(),
      })
    );

    expect(Prediction.find.mock.calls[0][0].userId.toString()).toBe(userId);
  });

 
