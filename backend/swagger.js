
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Student Performance Prediction System API",
      version: "1.0.0",
      description:
        "API documentation for Student Performance Prediction System, including authentication, Google OAuth, session management and student performance prediction.",
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development Server",
      },
    ],

    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token.",
        },

        RefreshCookie: {
          type: "apiKey",
          in: "cookie",
          name: "sp_refresh",
          description: "Refresh token stored in an HttpOnly cookie.",
        },
      },
    },
  },

  apis: [
    "./routes/*.js",
    "./controllers/*.js",
    "./docs/*.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
