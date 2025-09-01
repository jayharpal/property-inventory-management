# PropSku User Management Documentation

## User Roles and Access Control

PropSku implements a robust role-based access control (RBAC) system with three distinct user roles, each with different permissions and access levels:

### 1. Standard User
- **Primary Function**: Day-to-day property management operations
- **Access Level**: Limited
- **Capabilities**:
  - View and manage inventory items
  - Create and update shopping lists
  - View property listings
  - View expenses
  - Access only to properties within assigned portfolios

### 2. Standard Admin
- **Primary Function**: Property management with analytics and reporting capabilities
- **Access Level**: Full access to portfolio-specific features
- **Capabilities**:
  - All Standard User capabilities
  - Access to Dashboard and analytics
  - Create and manage property owners
  - Generate expense reports
  - Send reports to property owners
  - Manage and invite other users to portfolios
  - Create new portfolios
  - Full access to the reporting system
  - View and analyze financial data including markups and margins

### 3. Administrator
- **Primary Function**: System-wide administration and oversight
- **Access Level**: Global, but focused on administration
- **Capabilities**:
  - Access only to the Admin Panel
  - View system-wide analytics and usage statistics
  - Monitor user activity across all portfolios
  - Access system logs and performance metrics
  - Cannot access regular property management features

## Portfolio-Based Data Filtering

PropSku uses a portfolio-based data filtering system to ensure users only see data from portfolios they're associated with:

- Each user is associated with one or more portfolios
- All data (listings, owners, expenses, inventory, etc.) belongs to a specific portfolio
- The system automatically filters data based on the user's portfolio associations
- This provides data separation and privacy between different property management teams

## User Invitation System

PropSku includes a complete user invitation system that allows Standard Admins and Administrators to invite new users:

### Sending Invitations

1. **Invitation Creation**: Standard Admins can invite users to their portfolios from the Settings page
2. **Role Selection**: When creating an invitation, the admin specifies the role for the new user
3. **Email Notification**: The system sends an email to the invitee with a unique invitation link
   - The email includes portfolio information and role details
   - Invitation links are valid for 7 days

### Accepting Invitations

1. **Account Creation**: When a user clicks an invitation link, they can create a new account
2. **Automatic Association**: The new account is automatically associated with the specified portfolio
3. **Role Assignment**: The user is assigned the role that was specified in the invitation
4. **Email Verification**: The email address from the invitation is pre-filled and cannot be changed

### Invitation Management

1. **Pending Invitations**: Admins can view all pending invitations in the Settings page
2. **Resending Invitations**: Invitations can be resent if needed
3. **Revoking Invitations**: Admins can delete invitations that haven't been accepted yet

## Email Configuration

The invitation system uses the following email configuration:

- **Email Provider**: SendGrid (requires SENDGRID_API_KEY environment variable)
- **Fallback**: When SendGrid is not configured, emails are logged to the console
- **From Address**: Configured via FROM_EMAIL environment variable
- **Application URL**: Configured via APP_URL environment variable

## User Authentication

PropSku uses a secure authentication system:

- **Username/Password**: Standard username and password authentication
- **Session Management**: Server-side sessions with secure cookies
- **Password Security**: Passwords are hashed and never stored in plain text
- **Logout**: Users can end their session from any page through the navigation menu

## Migration and Setup

To change the system administrator password or add initial users, use the following credentials:

- **Administrator**: username: `user1`, password: `password1`
- **Standard Admin**: username: `user5`, password: `password5`
- **Standard User**: username: `user4`, password: `password4`

For testing purposes:
- Test User: username: `user10`, password: `password10`
- Newest Test User: username: `user11`, password: `password11`

## Best Practices

1. **Creating New Standard Admins**: For each property management team, create at least one Standard Admin
2. **Role Assignment**: Assign Standard User role to team members who don't need reporting capabilities
3. **Regular Password Updates**: All users should update their passwords regularly
4. **Invitation Expiry**: Note that invitations expire after 7 days and need to be resent if not accepted