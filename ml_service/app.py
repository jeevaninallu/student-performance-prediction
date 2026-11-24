
import os
import joblib
import pandas as pd

from flask import Flask, request, jsonify
from dotenv import load_dotenv
from functools import wraps

load_dotenv()

app = Flask(__name__)

# Load trained ML pipelines
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

score_model = joblib.load(
    os.path.join(MODEL_DIR, "linear_regression_model.pkl")
)

classification_model = joblib.load(
    os.path.join(MODEL_DIR, "logistic_regression_model.pkl")
)

# Expected input features
FEATURES = [
    "Hours_Studied",
    "Attendance",
    "Parental_Involvement",
    "Access_to_Resources",
    "Extracurricular_Activities",
    "Sleep_Hours",
    "Previous_Scores",
    "Motivation_Level",
    "Internet_Access",
    "Tutoring_Sessions",
    "Family_Income",
    "Teacher_Quality",
    "School_Type",
    "Peer_Influence",
    "Physical_Activity",
    "Learning_Disabilities",
    "Parental_Education_Level",
    "Distance_from_Home",
    "Gender"
]

def require_service_key():
    expected_key = os.getenv("ML_SERVICE_API_KEY")

    def decorator(view_function):
        @wraps(view_function)
        def wrapped(*args, **kwargs):
            provided_key = request.headers.get("x-ml-service-key")

            if not expected_key or provided_key != expected_key:
                return jsonify({"error": "Unauthorized service request"}), 401

            return view_function(*args, **kwargs)

        return wrapped

    return decorator


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "success",
        "message": "ML service is running"
    }), 200


@app.route("/predict", methods=["POST"])
@require_service_key()
def predict():

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({"error": "Invalid JSON request"}), 400

        missing = [feature for feature in FEATURES if feature not in data]

        if missing:
            return jsonify({
                "error": "Missing required features",
                "missing_features": missing
            }), 400

        # Build input DataFrame in the correct feature order
        input_df = pd.DataFrame(
            [{feature: data[feature] for feature in FEATURES}],
            columns=FEATURES
        )

        # Predict exam score
        predicted_score = float(score_model.predict(input_df)[0])

        # Predict performance classification
        predicted_class = str(
            classification_model.predict(input_df)[0]
        )

        return jsonify({
            "predicted_score": round(predicted_score, 2),
            "classification": predicted_class
        }), 200

    except (TypeError, ValueError) as error:
        return jsonify({
            "error": "Invalid prediction input",
            "details": str(error)
        }), 400

    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify({
            "error": "Prediction service failed"
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
