
import { useEffect, useState } from "react";
import { CalendarDays, TrendingUp, BookOpen, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./History.css";

function History() {
  const { accessToken } = useAuth();

  const [predictions, setPredictions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/predictions?page=${currentPage}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        setPredictions(response.data.predictions);
        setTotalPages(response.data.pagination.totalPages);
        setTotalRecords(response.data.pagination.totalRecords);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to load prediction history."
        );
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchHistory();
    }
  }, [accessToken, currentPage]);

  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="history-page">
      <div className="history-heading">
        <div>
          <h1>Prediction History</h1>
          <p>Track and review your previous academic predictions.</p>
        </div>

        <div className="history-total">
          <BookOpen size={20} />
          <span>{totalRecords} Predictions</span>
        </div>
      </div>

      <div className="history-summary">
        <div className="history-summary-icon">
          <TrendingUp size={23} />
        </div>
        <div>
          <p>Total Predictions</p>
          <h2>{totalRecords}</h2>
        </div>
      </div>

      <div className="history-content">
        <h2>Your Previous Predictions</h2>

        {loading && (
          <div className="history-message">
            <RefreshCw className="history-spinner" size={22} />
            <p>Loading your prediction history...</p>
          </div>
        )}

        {!loading && error && (
          <div className="history-message history-error">
            <p>{error}</p>
            <button onClick={() => setCurrentPage(1)}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && predictions.length === 0 && (
          <div className="history-empty">
            <BookOpen size={42} />
            <h3>No Predictions Yet</h3>
            <p>Your previous predictions will appear here after you make one.</p>
          </div>
        )}

        {!loading && !error && predictions.length > 0 && (
          <>
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Date & Time</th>
                    <th>Predicted Score</th>
                    <th>Classification</th>
                  </tr>
                </thead>

                <tbody>
                  {predictions.map((item, index) => (
                    <tr key={item._id}>
                      <td>{(currentPage - 1) * 10 + index + 1}</td>

                      <td>
                        <div className="history-date">
                          <CalendarDays size={17} />
                          {formatDate(item.createdAt)}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {Number(item.predictedScore).toFixed(2)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`classification-badge ${
                            item.classification === "Low-Level"
                              ? "low-level"
                              : "not-low-level"
                          }`}
                        >
                          {item.classification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="history-pagination">
              <span>
                Page {currentPage} of {Math.max(totalPages, 1)}
              </span>

              <div>
                <button
                  onClick={() => setCurrentPage((page) => page - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                <button
                  onClick={() => setCurrentPage((page) => page + 1)}
                  disabled={currentPage >= totalPages || loading}
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default History;
