
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

import {
  TrendingUp,
  Target,
  Award,
  Activity,
  RefreshCw,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Analytics.css";

const COLORS = ["#b56b5d", "#789b78"];

function Analytics() {
  const { accessToken } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/predictions/analytics", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        setAnalytics(response.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to load analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchAnalytics();
    }
  }, [accessToken]);

  if (loading) {
    return (
      <div className="analytics-status">
        <RefreshCw className="analytics-spinner" size={25} />
        <p>Loading your analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-status analytics-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  const summary = analytics.summary;

  const classificationData = analytics.classificationStats.map(
    (item) => ({
      name: item._id,
      value: item.count,
    })
  );

  const trendData = analytics.recentPredictions.map((item) => ({
    date: new Date(item.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    }),
    score: Number(item.predictedScore.toFixed(2)),
  }));

  const monthlyData = analytics.monthlyStats.map((item) => ({
    month: new Date(
      item._id.year,
      item._id.month - 1
    ).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    }),
    averageScore: Number(item.averageScore.toFixed(2)),
  }));

  const hasPredictions = summary.totalPredictions > 0;

  return (
    <div className="analytics-page">

      {/* Page Heading */}
      <div className="analytics-heading">
        <h1>Performance Analytics</h1>
        <p>
          Understand your academic predictions through
          insights and visualizations.
        </p>
      </div>

      {!hasPredictions ? (
        <div className="analytics-empty">
          <Activity size={45} />
          <h2>No Analytics Available</h2>
          <p>
            Make your first prediction to generate
            your performance analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="analytics-summary-grid">

            <div className="analytics-summary-card">
              <div className="analytics-card-icon">
                <Activity size={23} />
              </div>
              <div>
                <p>Total Predictions</p>
                <h2>{summary.totalPredictions}</h2>
              </div>
            </div>

            <div className="analytics-summary-card">
              <div className="analytics-card-icon">
                <Target size={23} />
              </div>
              <div>
                <p>Average Predicted Score</p>
                <h2>
                  {Number(summary.averageScore).toFixed(2)}
                </h2>
              </div>
            </div>

            <div className="analytics-summary-card">
              <div className="analytics-card-icon">
                <Award size={23} />
              </div>
              <div>
                <p>Highest Predicted Score</p>
                <h2>
                  {Number(summary.highestScore).toFixed(2)}
                </h2>
              </div>
            </div>

            <div className="analytics-summary-card">
              <div className="analytics-card-icon">
                <TrendingUp size={23} />
              </div>
              <div>
                <p>Lowest Predicted Score</p>
                <h2>
                  {Number(summary.lowestScore).toFixed(2)}
                </h2>
              </div>
            </div>

          </div>

          {/* Charts */}
          <div className="analytics-charts-grid">

            {/* Prediction Trend */}
            <div className="analytics-chart-card">
              <h2>Predicted Score Trend</h2>
              <p className="chart-description">
                Your latest 30 prediction scores
              </p>

              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#805239"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Classification Distribution */}
            <div className="analytics-chart-card">
              <h2>Classification Distribution</h2>
              <p className="chart-description">
                Distribution of your predicted classifications
              </p>

              {classificationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={classificationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {classificationData.map((item, index) => (
                        <Cell
                          key={item.name}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="chart-empty">No classification data.</p>
              )}
            </div>

            {/* Score Distribution */}
            <div className="analytics-chart-card">
              <h2>Score Distribution</h2>
              <p className="chart-description">
                Number of predictions in each score range
              </p>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="#a77b5b"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Average */}
            <div className="analytics-chart-card">
              <h2>Monthly Average Score</h2>
              <p className="chart-description">
                Average predicted score month by month
              </p>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar
                    dataKey="averageScore"
                    fill="#805239"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

export default Analytics;
