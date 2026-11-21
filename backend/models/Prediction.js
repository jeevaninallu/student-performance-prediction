
const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    predictedScore: {
      type: Number,
      required: true,
    },
    classification: {
      type: String,
      required: true,
      enum: ["Low-Level", "Not Low-Level"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prediction", predictionSchema);
