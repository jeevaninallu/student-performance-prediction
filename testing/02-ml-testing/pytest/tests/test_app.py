
import os
import sys
from pathlib import Path
from unittest.mock import patch

# Locate the ml_service folder
PROJECT_ROOT = Path(__file__).resolve().parents[4]
ML_SERVICE_PATH = PROJECT_ROOT / "ml_service"

sys.path.insert(0, str(ML_SERVICE_PATH))

# Set a test-only API key before importing the Flask app
os.environ["ML_SERVICE_API_KEY"] = "pytest_test_key"


# Mock score prediction model
class FakeScoreModel:
    def predict(self, input_df):
        return [75.5]


# Mock classification model
class FakeClassificationModel:
    def predict(self, input_df):
        return ["Not Low-Level"]


# Mock joblib.load so actual model files are not required
with patch(
    "joblib.load",
    side_effect=[FakeScoreModel(), FakeClassificationModel()]
):
    import app as ml_app


# Flask test client
client = ml_app.app.test_client()


# Sample student input with all 19 features
valid_student_data = {
    "Hours_Studied": 5,
    "Attendance": 90,
    "Parental_Involvement": "High",
    "Access_to_Resources": "High",
    "Extracurricular_Activities": "Yes",
    "Sleep_Hours": 8,
    "Previous_Scores": 75,
    "Motivation_Level": "High",
    "Internet_Access": "Yes",
    "Tutoring_Sessions": 2,
    "Family_Income": "Medium",
    "Teacher_Quality": "High",
    "School_Type": "Private",
    "Peer_Influence": "Positive",
    "Physical_Activity": 3,
    "Learning_Disabilities": "No",
    "Parental_Education_Level": "College",
    "Distance_from_Home": "Near",
    "Gender": "Female"
}


# ML-01: Test health endpoint
def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json["status"] == "success"
    assert response.json["message"] == "ML service is running"


# ML-02: Test successful prediction
def test_valid_prediction():
    response = client.post(
        "/predict",
        json=valid_student_data,
        headers={"x-ml-service-key": "pytest_test_key"}
    )

    assert response.status_code == 200
    assert response.json["predicted_score"] == 75.5
    assert response.json["classification"] == "Not Low-Level"


# ML-03: Test missing API key
def test_missing_api_key():
    response = client.post(
        "/predict",
        json=valid_student_data
    )

    assert response.status_code == 401
    assert response.json["error"] == "Unauthorized service request"


# ML-04: Test incorrect API key
def test_invalid_api_key():
    response = client.post(
        "/predict",
        json=valid_student_data,
        headers={"x-ml-service-key": "wrong_test_key"}
    )

    assert response.status_code == 401
    assert response.json["error"] == "Unauthorized service request"


# ML-05: Test missing student features
def test_missing_features():
    incomplete_data = valid_student_data.copy()
    incomplete_data.pop("Attendance")

    response = client.post(
        "/predict",
        json=incomplete_data,
        headers={"x-ml-service-key": "pytest_test_key"}
    )

    assert response.status_code == 400
    assert response.json["error"] == "Missing required features"
    assert "Attendance" in response.json["missing_features"]


# ML-06: Test invalid JSON request
def test_invalid_json():
    response = client.post(
        "/predict",
        data="invalid json",
        content_type="application/json",
        headers={"x-ml-service-key": "pytest_test_key"}
    )

    assert response.status_code == 400
    assert response.json["error"] == "Invalid JSON request"


# ML-07: Verify the correct feature order
def test_prediction_feature_order():
    with patch.object(
        ml_app.score_model,
        "predict",
        return_value=[75.5]
    ) as mock_predict:

        response = client.post(
            "/predict",
            json=valid_student_data,
            headers={"x-ml-service-key": "pytest_test_key"}
        )

        assert response.status_code == 200

        input_df = mock_predict.call_args[0][0]

        assert list(input_df.columns) == ml_app.FEATURES


# ML-08: Verify one student record is passed to the model
def test_prediction_receives_one_student_record():
    with patch.object(
        ml_app.score_model,
        "predict",
        return_value=[75.5]
    ) as mock_predict:

        response = client.post(
            "/predict",
            json=valid_student_data,
            headers={"x-ml-service-key": "pytest_test_key"}
        )

        assert response.status_code == 200

        input_df = mock_predict.call_args[0][0]

        assert len(input_df) == 1


# ML-09: Handle unexpected model errors
def test_model_prediction_failure():
    with patch.object(
        ml_app.score_model,
        "predict",
        side_effect=RuntimeError("Simulated model failure")
    ):

        response = client.post(
            "/predict",
            json=valid_student_data,
            headers={"x-ml-service-key": "pytest_test_key"}
        )

        assert response.status_code == 500
        assert response.json["error"] == "Prediction service failed"


# ML-10: Check behavior when extra feature is provided
def test_extra_feature_is_currently_accepted():
    extra_data = valid_student_data.copy()
    extra_data["Unexpected_Feature"] = "Test"

    response = client.post(
        "/predict",
        json=extra_data,
        headers={"x-ml-service-key": "pytest_test_key"}
    )

    assert response.status_code == 200
