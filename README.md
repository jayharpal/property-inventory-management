# PropSku - Property Management Platform

A sophisticated property management platform that helps property managers track expenses, manage inventory, and generate reports for property owners.

## Features

- **User Management**: Three-tier role-based access control system
- **Portfolio Management**: Organize properties into portfolios with separate access control
- **Expense Tracking**: Record and categorize expenses for properties
- **Inventory Management**: Track inventory items and consumption
- **Shopping Lists**: Create and manage shopping lists for inventory restocking
- **Report Generation**: Generate PDF expense reports for property owners
- **Analytics**: View trends and insights on expenses and inventory usage
- **Admin Panel**: System-wide monitoring and administration

## Documentation

### User Guides

- [User Management](docs/user-management.md): Details about user roles, permissions, and access control
- [Invitation System Guide](docs/invitation-system-guide.md): How to invite and add new users to the system

### Technical Documentation

- [Technical Implementation](docs/technical-implementation.md): Technical details about the implementation of key features

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js with session-based authentication
- **Form Validation**: Zod and React Hook Form
- **State Management**: React Query for server state, Context API for application state
- **Email**: SendGrid / Nodemailer

## Getting Started

1. **Install Dependencies**:
   ```
   npm install
   ```

2. **Set Up Environment Variables**:
   Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SESSION_SECRET`: Secret for session encryption
   - `SENDGRID_API_KEY`: (Optional) API key for SendGrid integration
   - `FROM_EMAIL`: Email address to send notifications from
   - `APP_URL`: Application URL for email links

3. **Start Development Server**:
   ```
   npm run dev
   ```

4. **Access the Application**:
   Open [http://localhost:5000](http://localhost:5000) in your browser

## Test Accounts

For testing purposes, the following accounts are available:

- **Administrator**: Username: `user1`, Password: `password1`
- **Standard Admin**: Username: `user5`, Password: `password5` 
- **Standard User**: Username: `user4`, Password: `password4`

## License

This project is proprietary software. All rights reserved.

© 2023-2025 PropSku