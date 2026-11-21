
const express = require("express");
const axios = require("axios");
const { z } = require("zod");
const mongoose = require("mongoose");


const authMiddleware = require("../middleware/authMiddleware");
const Prediction = require("../models/Prediction");

const router = express.Router();

// Validate the 19 features expected by the ML models
const predictionSchema = z.object({
  Hours_Studied: z.number().finite().min(0),
  Attendance: z.number().finite().min(0).max(100),
  Parental_Involvement: z.enum(["Low", "Medium", "High"]),
  Access_to_Resources: z.enum(["Low", "Medium", "High"]),
  Extracurricular_Activities: z.enum(["Yes", "No"]),
  Sleep_Hours: z.number().finite().min(0),
  Previous_Scores: z.number().finite().min(0).max(100),
  Motivation_Level: z.enum(["Low", "Medium", "High"]),
  Internet_Access: z.enum(["Yes", "No"]),
  Tutoring_Sessions: z.number().finite().min(0),
  Family_Income: z.enum(["Low", "Medium", "High"]),
  Teacher_Quality: z.enum(["Low", "Medium", "High"]),
  School_Type: z.enum(["Public", "Private"]),
  Peer_Influence: z.enum(["Positive", "Neutral", "Negative"]),
  Physical_Activity: z.number().finite().min(0),
  Learning_Disabilities: z.enum(["Yes", "No"]),
  Parental_Education_Level: z.enum([
    "High School",
    "College",
    "Postgraduate",
  ]),
  Distance_from_Home: z.enum(["Near", "Moderate", "Far"]),
  Gender: z.enum(["Male", "Female"]),
}).strict();


// GET /api/predictions/analytics
// Get analytics for the logged-in student only

router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const [
      summary,
      classificationStats,
      scoreDistribution,
      monthlyStats,
      recentPredictions
    ] = await Promise.all([

      // 1. Total predictions and average predicted score
      Prediction.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalPredictions: { $sum: 1 },
            averageScore: { $avg: "$predictedScore" },
            highestScore: { $max: "$predictedScore" },
            lowestScore: { $min: "$predictedScore" }
          }
        }
      ]),

      // 2. Classification distribution
      Prediction.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$classification",
            count: { $sum: 1 }
          }
        }
      ]),

      // 3. Predicted score distribution
      Prediction.aggregate([
        { $match: { userId } },
        {
          $bucket: {
            groupBy: "$predictedScore",
            boundaries: [0, 50, 60, 70, 80, 90, 101],
            default: "Other",
            output: {
              count: { $sum: 1 }
            }
          }
        }
      ]),

      // 4. Monthly average predicted score
      Prediction.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            averageScore: { $avg: "$predictedScore" },
            totalPredictions: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),

      // 5. Latest 30 predictions for score trend
      Prediction.find({ userId })
        .select("predictedScore classification createdAt")
        .sort({ createdAt: -1 })
        .limit(30)
        .lean()
    ]);

    const distributionLabels = {
      0: "0–49",
      50: "50–59",
      60: "60–69",
      70: "70–79",
      80: "80–89",
      90: "90–100"
    };

    const scoreRanges = [0, 50, 60, 70, 80, 90];

    const formattedDistribution = scoreRanges.map((range) => ({
      range: distributionLabels[range],
      count: scoreDistribution.find(
        (item) => item._id === range
      )?.count || 0
    }));

    return res.status(200).json({
      success: true,

      summary: summary[0] || {
        totalPredictions: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0
      },

      classificationStats,

      scoreDistribution: formattedDistribution,

      monthlyStats,

      recentPredictions: recentPredictions.reverse()
    });

  } catch (error) {
    console.error("Analytics error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve analytics."
    });
  }
});



// GET /api/predictions
// Retrieve only the logged-in student's prediction history
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [predictions, totalRecords] = await Promise.all([
      Prediction.find({ userId: req.userId })
        .select("predictedScore classification createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Prediction.countDocuments({ userId: req.userId }),
    ]);

    return res.status(200).json({
      success: true,
      predictions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        limit,
      },
    });
  } catch (error) {
    console.error("Prediction history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve prediction history.",
    });
  }
});


// GET /api/predictions/analytics
// Analytics for the currently logged-in student

router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const [
      totalPredictions,
      averageResult,
      classificationStats,
      scoreDistribution,
      monthlyStats,
    ] = await Promise.all([
      // Total predictions
      Prediction.countDocuments({ userId }),

      // Average predicted score
      Prediction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            averageScore: { $avg: "$predictedScore" },
          },
        },
      ]),

      // Classification distribution
      Prediction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: "$classification",
            count: { $sum: 1 },
          },
        },
      ]),

      // Score distribution
      Prediction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $bucket: {
            groupBy: "$predictedScore",
            boundaries: [0, 40, 50, 60, 70, 80, 90, 101],
            default: "Other",
            output: {
              count: { $sum: 1 },
            },
          },
        },
      ]),

      // Monthly average predicted score
      Prediction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: {
              year: { $year: { date: "$createdAt", timezone: "Asia/Kolkata" } },
              month: { $month: { date: "$createdAt", timezone: "Asia/Kolkata" } },
            },
            averageScore: { $avg: "$predictedScore" },
            totalPredictions: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      analytics: {
        totalPredictions,
        averagePredictedScore: averageResult[0]?.averageScore || 0,
        classificationStats,
        scoreDistribution,
        monthlyStats,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve analytics.",
    });
  }
});



// POST /api/predictions
router.post("/", authMiddleware, async (req, res) => {
  try {
    // 1. Validate the incoming student data
    const validation = predictionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid prediction input",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    // 2. Send validated data to the Flask ML service
    const mlResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/predict`,
      validation.data,
      {
        headers: {
          "x-ml-service-key": process.env.ML_SERVICE_API_KEY,
        },
        timeout: 15000,
      }
    );

    const { predicted_score, classification } = mlResponse.data;

    // 3. Validate the ML service response
    if (
      typeof predicted_score !== "number" ||
      !Number.isFinite(predicted_score) ||
      !["Low-Level", "Not Low-Level"].includes(classification)
    ) {
      return res.status(502).json({
        success: false,
        message: "Invalid response from prediction service",
      });
    }

    // 4. Save only the prediction result
    // User ID comes from the verified JWT, never from the request body.
    const prediction = await Prediction.create({
      userId: req.userId,
      predictedScore: predicted_score,
      classification,
    });

    // 5. Return the prediction result
    return res.status(201).json({
      success: true,
      message: "Prediction generated successfully",
      prediction: {
        id: prediction._id,
        predictedScore: prediction.predictedScore,
        classification: prediction.classification,
        createdAt: prediction.createdAt,
      },
    });
  } catch (error) {
    if (error.response) {
      console.error("ML service returned an error:", error.response.status);
    } else if (error.code === "ECONNABORTED") {
      console.error("ML service request timed out");
    } else {
      console.error("Prediction error:", error.message);
    }

    return res.status(502).json({
      success: false,
      message: "Unable to generate prediction. Please try again.",
    });
  }
});

module.exports = router;
