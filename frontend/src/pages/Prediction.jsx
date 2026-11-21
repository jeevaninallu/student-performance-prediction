
import { useState } from "react";
import { GraduationCap, BookOpen, Users, HeartPulse } from "lucide-react";
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
  const [formData, setFormData] = useState(initialValues);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setMessage("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setMessage(
      "Your information has been collected. ML prediction will be connected later."
    );
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

        <div className="prediction-actions">
          <button
            type="button"
            className="clear-button"
            onClick={() => {
              setFormData(initialValues);
              setMessage("");
            }}
          >
            Clear Form
          </button>

          <button type="submit" className="predict-button">
            Predict Performance
          </button>
        </div>
      </form>
    </div>
  );
}

export default Prediction;
