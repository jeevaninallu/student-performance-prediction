
import { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Users,
  HeartPulse,
  LoaderCircle,
  TrendingUp,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Prediction.css";

const initialValues = {
  Hours_Studied: "",
  Attendance: "",
  Previous_Scores: "",
  Tutoring_Sessions: "",
  Sleep_Hours: "",
  Extracurricular_Activities: "",
  Physical_Activity: "",
  Gender: "",
  Learning_Disabilities: "",
  Parental_Involvement: "",
  Access_to_Resources: "",
  Motivation_Level: "",
  Internet_Access: "",
  Family_Income: "",
  Teacher_Quality: "",
  School_Type: "",
  Peer_Influence: "",
  Parental_Education_Level: "",
  Distance_from_Home: "",
};

const numericFields = [
  "Hours_Studied",
  "Attendance",
  "Previous_Scores",
  "Tutoring_Sessions",
  "Sleep_Hours",
  "Physical_Activity",
];

const sections = [
  {
    title: "Academic Information",
    description: "Information about your academic activities and performance.",
    icon: BookOpen,
    fields: [
      { name: "Hours_Studied", label: "Hours Studied", type: "number", min: 1, max: 44 },
      { name: "Attendance", label: "Attendance (%)", type: "number", min: 60, max: 100 },
      { name: "Previous_Scores", label: "Previous Scores", type: "number", min: 50, max: 100 },
      { name: "Tutoring_Sessions", label: "Tutoring Sessions", type: "number", min: 0, max: 8 },
    ],
  },
  {
    title: "Personal & Lifestyle Information",
    description: "Your lifestyle and personal learning information.",
    icon: HeartPulse,
    fields: [
      { name: "Sleep_Hours", label: "Sleep Hours", type: "number", min: 4, max: 10 },
      {
        name: "Extracurricular_Activities",
        label: "Extracurricular Activities",
        options: ["Yes", "No"],
      },
      { name: "Physical_Activity", label: "Physical Activity (hours)", type: "number", min: 0, max: 6 },
      { name: "Gender", label: "Gender", options: ["Male", "Female"] },
      {
        name: "Learning_Disabilities",
        label: "Learning Disabilities",
        options: ["Yes", "No"],
      },
    ],
  },
  {
    title: "Family & School Environment",
    description: "Information about your family and educational environment.",
    icon: Users,
    fields: [
      {
        name: "Parental_Involvement",
        label: "Parental Involvement",
        options: ["Low", "Medium", "High"],
      },
      {
        name: "Access_to_Resources",
        label: "Access to Resources",
        options: ["Low", "Medium", "High"],
      },
      {
        name: "Motivation_Level",
        label: "Motivation Level",
        options: ["Low", "Medium", "High"],
      },
      {
        name: "Internet_Access",
        label: "Internet Access",
        options: ["Yes", "No"],
      },
      {
        name: "Family_Income",
        label: "Family Income",
        options: ["Low", "Medium", "High"],
      },
      {
        name: "Teacher_Quality",
        label: "Teacher Quality",
        options: ["Low", "Medium", "High"],
      },
      {
        name: "School_Type",
        label: "School Type",
        options: ["Public", "Private"],
      },
      {
        name: "Peer_Influence",
        label: "Peer Influence",
        options: ["Positive", "Neutral", "Negative"],
      },
      {
        name: "Parental_Education_Level",
        label: "Parental Education Level",
        options: ["High School", "College", "Postgraduate"],
      },
      {
        name: "Distance_from_Home",
        label: "Distance from Home",
        options: ["Near", "Moderate", "Far"],
      },
    ],
  },
];

function Prediction() {
  const { accessToken } = useAuth();

  const [formData, setFormData] = useState(initialValues);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));

    setMessage("");
    setPrediction(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setPrediction(null);

    if (!accessToken) {
      setMessage("Your session has expired. Please log in again.");
      return;
    }

    // Convert numeric form values from strings to numbers.
    const payload = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        numericFields.includes(key) ? Number(value) : value,
      ])
    );

    try {
      setLoading(true);

      const response = await api.post("/predictions", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setPrediction(response.data.prediction);
      setMessage("Your prediction has been generated successfully!");
    } catch (error) {
      const responseMessage = error.response?.data?.message;

      if (error.response?.status === 401) {
        setMessage("Your session has expired. Please log in again.");
      } else if (error.response?.status === 400) {
        setMessage(responseMessage || "Please check your input values.");
      } else {
        setMessage(
          responseMessage ||
            "Unable to generate prediction. Please try again."
        );
      }

      console.error(
        "Prediction request failed:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData(initialValues);
    setMessage("");
    setPrediction(null);
  };

  return (
    <div className="prediction-container">
      <div className="prediction-heading">
        <div>
          <span className="prediction-label">ACADEMIC ANALYSIS</span>
          <h1>Student Performance Prediction</h1>
          <p>
            Enter your academic, personal, and environmental information
            to analyze your predicted academic performance.
          </p>
        </div>

        <div className="prediction-icon">
          <GraduationCap size={42} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {sections.map((section) => {
          const SectionIcon = section.icon;

          return (
            <section className="prediction-section" key={section.title}>
              <div className="section-heading">
                <div className="section-icon">
                  <SectionIcon size={23} />
                </div>

                <div>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
              </div>

              <div className="prediction-grid">
                {section.fields.map((field) => (
                  <div className="prediction-field" key={field.name}>
                    <label htmlFor={field.name}>{field.label}</label>

                    {field.options ? (
                      <select
                        id={field.name}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      >
                        <option value="">Select {field.label}</option>

                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        min={field.min}
                        max={field.max}
                        step="any"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={formData[field.name]}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {message && (
          <div className="prediction-message" role="status">
            {message}
          </div>
        )}

        {prediction && (
          <div className="prediction-result">
            <div className="result-heading">
              <TrendingUp size={25} />
              <h2>Prediction Result</h2>
            </div>

            <div className="result-cards">
              <div className="result-card">
                <span>Predicted Exam Score</span>
                <strong>{prediction.predictedScore.toFixed(2)}</strong>
                <small>Out of 100</small>
              </div>

              <div className="result-card">
                <span>Performance Classification</span>
                <strong className="classification-value">
                  {prediction.classification}
                </strong>
                <small>Based on the classification model</small>
              </div>
            </div>
          </div>
        )}

        <div className="prediction-actions">
          <button
            type="button"
            className="clear-button"
            onClick={handleClear}
            disabled={loading}
          >
            Clear Form
          </button>

          <button
            type="submit"
            className="predict-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle size={18} className="loading-spinner" />
                Generating Prediction...
              </>
            ) : (
              "Predict Performance"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Prediction;
