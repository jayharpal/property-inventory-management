# User Management

The Property Management Platform implements three user roles to control access to different parts of the application.

## User Roles

### Standard User

A Standard User can:
- View and manage inventory items
- Create and manage shopping lists
- View properties assigned to them
- Log expenses for properties they manage
- View reports for properties they manage

Standard Users cannot:
- Add or modify property owners
- Create or modify property listings
- Access analytics dashboard
- Create or send reports

### Admin User

An Admin User has all the permissions of a Standard User, plus:
- Manage property owners
- Create and modify property listings
- Access basic analytics
- Create and send reports for specific owners

Admin Users cannot:
- Manage other user accounts
- Access system-wide analytics

### Super Admin

A Super Admin has full access to all system features, including:
- All permissions of Admin Users
- User account management
- System-wide analytics
- System configuration
- Access to all properties, owners, and reports

## Authentication

The application uses session-based authentication with Passport.js for secure user login.

## User Settings

Users can manage their profile settings, including:
- Personal information (name, email)
- Password changes
- Notification preferences
- Display preferences (dark/light mode)

## User Activity Logs

The system maintains logs of user activity for audit purposes, including:
- Login/logout times
- Creation and modification of resources
- Report generation and distribution
