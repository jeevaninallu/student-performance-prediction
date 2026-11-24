
/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Student registration, login, logout and profile management
 *   - name: Google Authentication
 *     description: Google Sign-In and OAuth 2.0 account linking
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new student
 *     description: Creates a student account after validating the registration details and hashing the password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, confirmPassword]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Jeevani
 *               email:
 *                 type: string
 *                 example: student@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Student@123
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: Student@123
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Invalid registration details
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Registration failed
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login using email and password
 *     description: Authenticates a student and creates an application session. Returns an access token and sets an HttpOnly refresh cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Student@123
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid login details
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Login failed
 */

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     tags: [Google Authentication]
 *     summary: Google Sign-In using ID token
 *     description: Verifies the Google ID token, creates or links a student account, and establishes an application session.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token received from the frontend.
 *               linkingPassword:
 *                 type: string
 *                 format: password
 *                 description: Existing account password when linking an email account.
 *     responses:
 *       200:
 *         description: Google login successful
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Invalid Google token or password
 *       409:
 *         description: Existing account requires password linking
 *       500:
 *         description: Google authentication failed
 */

/**
 * @swagger
 * /api/auth/google/oauth:
 *   post:
 *     tags: [Google Authentication]
 *     summary: Google OAuth 2.0 authorization code login
 *     description: Exchanges a Google authorization code for Google tokens, retrieves the Google profile, and creates an application session.
 *     parameters:
 *       - in: header
 *         name: X-Requested-With
 *         required: true
 *         schema:
 *           type: string
 *           example: XMLHttpRequest
 *       - in: header
 *         name: Origin
 *         required: true
 *         schema:
 *           type: string
 *           example: http://localhost:5173
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: Google authorization code received by the frontend.
 *     responses:
 *       200:
 *         description: Google OAuth login successful
 *       400:
 *         description: Authorization code missing
 *       401:
 *         description: Invalid or expired authorization code
 *       403:
 *         description: Invalid OAuth request origin
 *       409:
 *         description: Existing account requires password linking
 *       500:
 *         description: OAuth configuration or authentication error
 */

/**
 * @swagger
 * /api/auth/google/oauth/link:
 *   post:
 *     tags: [Google Authentication]
 *     summary: Link an existing account with Google
 *     description: Verifies the temporary account-linking token and existing account password before linking Google authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pendingGoogleLinkToken, linkingPassword]
 *             properties:
 *               pendingGoogleLinkToken:
 *                 type: string
 *                 description: Temporary token returned during Google OAuth account linking.
 *               linkingPassword:
 *                 type: string
 *                 format: password
 *                 example: Student@123
 *     responses:
 *       200:
 *         description: Google account linked successfully
 *       400:
 *         description: Required information missing
 *       401:
 *         description: Invalid token or incorrect password
 *       500:
 *         description: Account linking failed
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Uses the HttpOnly refresh cookie, rotates the refresh token and generates a new JWT access token.
 *     security:
 *       - RefreshCookie: []
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *       401:
 *         description: Missing, invalid or expired session
 *       500:
 *         description: Unable to refresh session
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout student
 *     description: Revokes the refresh-token session and clears the refresh cookie.
 *     security:
 *       - RefreshCookie: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       500:
 *         description: Unable to log out
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get logged-in student profile
 *     description: Retrieves the profile of the student identified by the verified JWT access token.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile retrieved successfully
 *       401:
 *         description: Authentication required or invalid access token
 *       404:
 *         description: User account not found
 *       500:
 *         description: Unable to retrieve profile
 */


/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Authentication]
 *     summary: Update student profile
 *     description: Updates the full name and email address of the authenticated student. Password and Google authentication details cannot be modified through this endpoint.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Jeevani
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jeevani.updated@gmail.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid profile details
 *       401:
 *         description: Authentication required or invalid access token
 *       404:
 *         description: User account not found
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Unable to update profile
 */

