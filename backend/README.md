# Aley Social Media Backend

This is the backend for the Aley Social Media platform providing authentication and user management.

## Features

- User registration with email verification
- User login with JWT authentication
- Password reset functionality
- Email verification system
- MongoDB integration
- Clean and organized code structure

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Configure environment variables:

Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

Update the following variables in the `.env` file:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD`: Your email service configuration
- `FRONTEND_URL`: Your frontend application URL

3. Start the server:

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login an existing user
- `POST /api/auth/verify-email` - Verify user email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/resend-verification` - Resend verification email
- `GET /api/auth/me` - Get current user profile (protected route)

## Integration with Frontend

To connect the Angular frontend with this backend:

1. Update your Angular environment file with the API URL
2. Use Angular's HTTP client to make requests to the backend API
3. Implement authentication service in Angular to manage user session

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middlewares/    # Custom middlewares
│   ├── models/         # Mongoose models
│   ├── routes/         # Express routes
│   ├── utils/          # Utility functions
│   └── server.js       # Server entry point
├── .env                # Environment variables
└── package.json        # Project dependencies
``` 