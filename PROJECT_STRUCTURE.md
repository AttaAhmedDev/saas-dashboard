# Project Structure Guide

This document explains the project layout and key files.

## Directory Overview

```
saas-dashboard/
├── app/                        # Main Flask application package
│   ├── __init__.py            # Flask app factory & route registration
│   ├── config.py              # Configuration classes (Dev, Test, Prod)
│   ├── models.py              # SQLAlchemy ORM models
│   ├── permissions.py         # Permission decorators & RBAC logic
│   ├── utils.py               # Utility functions (email, auth, etc.)
│   │
│   ├── routes/                # API blueprints
│   │   ├── auth.py            # Authentication endpoints
│   │   │   ├── POST /register    - Create company & first user
│   │   │   ├── POST /login       - JWT login
│   │   │   ├── GET  /invite/:token
│   │   │   └── POST /invite/:token - Accept invite
│   │   │
│   │   └── dashboard.py       # Core API endpoints
│   │       ├── GET  /summary       - Dashboard stats
│   │       ├── GET  /users         - List users (RBAC required)
│   │       ├── GET  /roles         - List available roles
│   │       ├── PATCH /users/:id/role - Update user role
│   │       ├── DELETE /users/:id     - Remove user
│   │       ├── POST /invite         - Send user invite
│   │       ├── GET  /orders        - List orders
│   │       ├── POST /orders        - Create order
│   │       ├── PATCH /orders/:id   - Update order
│   │       ├── DELETE /orders/:id  - Delete order
│   │       ├── GET  /revenue       - List revenue
│   │       ├── POST /revenue       - Add revenue
│   │       └── DELETE /revenue/:id - Delete revenue
│   │
│   ├── seeds/                 # Database seeding
│   │   └── seed.py           # Create sample companies, users, data
│   │
│   ├── static/               # Frontend assets (not served by Flask in prod)
│   │   ├── css/
│   │   │   ├── shared.css    - Global styles, components
│   │   │   ├── login.css     - Login page styles
│   │   │   └── dashboard.css - Dashboard styles
│   │   │
│   │   └── js/
│   │       ├── shared.js     - Global utilities, auth, API helpers
│   │       ├── login.js      - Login page logic
│   │       ├── dashboard.js  - Dashboard page logic
│   │       ├── team.js       - Team management & role editing
│   │       ├── orders.js     - Orders CRUD logic
│   │       ├── revenue.js    - Revenue chart logic
│   │       ├── settings.js   - Settings page
│   │       └── invite.js     - Invite acceptance logic
│   │
│   └── templates/            # Jinja2 HTML templates
│       ├── auth/
│       │   ├── login.html    - Login form
│       │   └── invite.html   - Invite acceptance page
│       │
│       └── dashboard/
│           ├── dashboard.html    - Main dashboard
│           ├── orders.html       - Orders table & CRUD
│           ├── revenue.html      - Revenue charts
│           ├── team.html         - Team members & role management
│           └── settings.html     - Company settings
│
├── migrations/               # Alembic database migrations
│   ├── alembic.ini
│   ├── env.py               - Migration environment setup
│   ├── script.py.mako       - Migration template
│   └── versions/            - Individual migration files
│       ├── 893b2559dd81_intial_models_rbac.py
│       └── b16d78370ea5_add_invite_model_for_database.py
│
├── .env                      # Environment variables (git ignored)
├── .env.example              # Template for .env
├── .gitignore               # Git ignore rules
├── requirements.txt          # Python dependencies
├── run.py                    # Application entry point
├── Procfile                  # Heroku/Railway deployment config
├── runtime.txt              # Python version for deployment
│
├── README                    # Project documentation
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # MIT License
└── PROJECT_STRUCTURE.md      # This file
```

## Key Files Explained

### `app/__init__.py`
Flask app factory. Creates the Flask app, initializes extensions (SQLAlchemy, JWT, etc.), and registers blueprints.

```python
def create_app():
    app = Flask(__name__)
    db.init_app(app)
    jwt.init_app(app)
    # ... register routes
    return app
```

### `app/models.py`
SQLAlchemy ORM models:
- **Company** - Represents a tenant/organization
- **User** - Team members with roles
- **Invite** - Pending invitations
- **Order** - Customer orders
- **Revenue** - Monthly revenue data

### `app/permissions.py`
RBAC implementation:
- **Permissions** class - Defines permission constants
- **ROLE_PERMISSIONS** dict - Maps roles to permissions
- **@permission_required()** decorator - Protects routes

Example:
```python
@app.route("/api/endpoint")
@permission_required(Permissions.MANAGE_USERS)
def protected_endpoint():
    # Only users with MANAGE_USERS permission can access
    pass
```

### `app/routes/auth.py`
Authentication flow:
1. Register - Create company & first user (as owner)
2. Login - JWT token generation
3. Invite flow - Create invite → Send email/share link → Accept → Create user

### `app/routes/dashboard.py`
Main API endpoints for all CRUD operations. All protected with `@permission_required()`.

### `app/static/js/shared.js`
Global utilities loaded by all pages:
- `getToken()` - Retrieve JWT from localStorage
- `authHeaders()` - Add Authorization header to requests
- `getUser()` / `getCompany()` - Get current user/company info
- `permission_required()` - Check if current user has permission
- UI helpers (toast, modal, etc.)

### `app/static/js/team.js`
Team management:
- `loadUsers()` - Fetch all company users
- `renderUsers()` - Display users in table with edit buttons
- `openEditRoleModal()` - Show role change dialog
- `submitEditRole()` - Send role update to API

### `app/seeds/seed.py`
Creates sample data for development:
- 2 Companies: Acme Corp, Beta Studios
- 6 Users with different roles
- Revenue data (6 months)
- Orders (completed, pending, cancelled)

Run with: `python -m app.seeds.seed`

## Data Flow Examples

### User Registration
```
Frontend: POST /api/auth/register
  ↓
Backend: Create Company (if not exists) + User (as owner)
  ↓
Return JWT token + user data
  ↓
Frontend: Store token in localStorage
  ↓
Redirect to /dashboard
```

### Role Update
```
Frontend: PATCH /api/dashboard/users/5/role {"role": "manager"}
  ↓
Backend: Check current user permission (MANAGE_ROLES)
  ↓
Check if trying to assign owner role (only owners can)
  ↓
Update user role in database
  ↓
Return updated user object
  ↓
Frontend: Show success toast + reload user list
```

## Database Schema

### companies
```sql
id (PK)
name
slug
created_at
```

### users
```sql
id (PK)
company_id (FK → companies)
email (unique)
password (hashed)
name
role
created_at
```

### invites
```sql
id (PK)
company_id (FK → companies)
invited_by_id (FK → users)
email
name
role
token (unique)
status (pending/accepted)
created_at
accepted_at
```

### orders
```sql
id (PK)
company_id (FK → companies)
customer
product
amount
status (pending/completed/cancelled)
created_at
```

### revenues
```sql
id (PK)
company_id (FK → companies)
amount
month (YYYY-MM format)
created_at
```

## Environment Variables

See `.env.example` for all available variables. Critical ones:

```env
DATABASE_URL          # PostgreSQL connection string
JWT_SECRET_KEY        # Secret for signing JWTs
FLASK_ENV            # development/production
MAIL_SERVER          # SMTP server for email invites (optional)
```

## Deployment Files

- **Procfile** - Specifies commands for Railway/Heroku (e.g., `web: gunicorn app:app`)
- **runtime.txt** - Python version (e.g., `python-3.14.0`)

## Testing

```bash
# Run tests (if implemented)
pytest

# Test specific module
pytest tests/test_auth.py

# With coverage
pytest --cov=app
```

## Common Tasks

### Add a new permission
1. Add constant to `Permissions` class in `models.py`
2. Add to `ROLE_PERMISSIONS` dict
3. Use in routes: `@permission_required(Permissions.NEW_PERMISSION)`

### Add a new API endpoint
1. Create route in `routes/dashboard.py` or `routes/auth.py`
2. Add `@permission_required()` decorator
3. Document in README
4. Add frontend logic in appropriate `js/` file

### Add a new role
1. Add to `ROLE_PERMISSIONS` dict
2. Update invite form in `templates/dashboard/team.html`
3. Update role dropdown in `team.js` and other relevant forms

### Add a new database model
1. Define model in `models.py`
2. Run `flask db migrate -m "Add new model"`
3. Review generated migration in `migrations/versions/`
4. Run `flask db upgrade`

---

For questions or clarifications, open a GitHub issue or discussion!
