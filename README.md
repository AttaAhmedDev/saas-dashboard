# FlowDesk — Multi-tenant SaaS Dashboard

A full-stack, multi-tenant SaaS dashboard for business analytics. Companies sign up, manage their team with role-based access control (RBAC), and securely view only their own data — revenue charts, orders, and team members.

**Live demo:** https://flowdesk-saas.up.railway.app

### sign in

![sign in](Screenshot_2.png)

## ✨ Features

### Core
- 🏢 **Multi-tenant architecture** — Companies operate in isolated environments
- 🔐 **JWT authentication** — Secure register/login system
- 👥 **Team management** — Invite users, assign roles, manage permissions
- 📊 **Real-time dashboard** — Revenue charts, order tracking, analytics
- 🔑 **Role-Based Access Control (RBAC)** — 8 predefined roles with granular permissions
- 📱 **REST API** — Full programmatic access to all features

### Dashboard

![Dashboard](Screenshot_3.png)


### Roles & Permissions
- **Owner** — Full company access (company settings, user management, role assignment)
- **Admin** — Administrative access (cannot assign owner role, cannot edit company settings)
- **Manager** — Dashboard, orders, revenue view
- **Sales** — Manage orders
- **Accountant** — View revenue data
- **HR** — Manage users
- **Employee** — Dashboard access only
- **Member** — Dashboard access only

### revenue

![revenue](Screenshot_1.png)


## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.14 + Flask 3.1 |
| **Database** | PostgreSQL (SQLAlchemy ORM) |
| **Authentication** | JWT (Flask-JWT-Extended) |
| **Frontend** | Vanilla JavaScript + Jinja2 templates |
| **Styling** | Custom CSS (DM Sans font) |
| **Utilities** | Alembic (migrations), Flask-Migrate |

## 📦 Project Structure

```
saas-dashboard/
├── app/
│   ├── __init__.py           # Flask app factory
│   ├── config.py             # Configuration
│   ├── models.py             # SQLAlchemy models (Company, User, Order, Revenue, Invite)
│   ├── permissions.py        # Permission decorators & RBAC logic
│   ├── utils.py              # Helper utilities
│   ├── routes/
│   │   ├── auth.py           # /api/auth/* endpoints (register, login, invite)
│   │   └── dashboard.py      # /api/dashboard/* endpoints (CRUD operations)
│   ├── seeds/
│   │   └── seed.py           # Database seeding script
│   ├── static/
│   │   ├── css/              # Stylesheets
│   │   └── js/               # Frontend scripts
│   └── templates/
│       ├── auth/             # Login, invite pages
│       └── dashboard/        # Dashboard, orders, revenue, team pages
├── migrations/               # Alembic database migrations
├── requirements.txt          # Python dependencies
├── run.py                    # Application entry point
├── Procfile                  # Heroku/Railway deployment config
└── README                    # This file
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- PostgreSQL (or SQLite for development)
- pip / virtualenv

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/saas-dashboard
   cd saas-dashboard
   ```

2. **Create & activate virtual environment**
   ```bash
   python -m venv saas_env
   # On Windows:
   .\saas_env\Scripts\activate
   # On macOS/Linux:
   source saas_env/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and JWT secret
   ```

5. **Initialize database**
   ```bash
   flask db upgrade
   ```

6. **Seed sample data** (development only)
   ```bash
   python -m app.seeds.seed
   ```

7. **Run development server**
   ```bash
   python run.py
   ```
   
   Open **http://localhost:5000** and log in with seeded credentials:
   - Email: `owner@acme.com`
   - Password: `password123`

## 📝 Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/flowdesk_db

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# Flask
FLASK_ENV=development
FLASK_DEBUG=True

# Optional: SMTP for email invites
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=noreply@flowdesk.com
```

**If SMTP is not configured:**
- Invites are still created with a shareable link
- The link is returned in the API response
- Frontend copies the link to clipboard automatically

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` — Create company & first user (owner)
- `POST /api/auth/login` — Login with email & password
- `GET /api/auth/invite/<token>` — Fetch invite details
- `POST /api/auth/invite/<token>` — Accept invite & create user

### Dashboard
- `GET /api/dashboard/summary` — Revenue, orders, users stats
- `GET /api/dashboard/users` — List all company users (requires MANAGE_USERS)
- `GET /api/dashboard/roles` — List all available roles (requires MANAGE_ROLES)
- `PATCH /api/dashboard/users/<id>/role` — Change user role (requires MANAGE_ROLES)
- `DELETE /api/dashboard/users/<id>` — Remove user (requires MANAGE_USERS)
- `POST /api/dashboard/invite` — Send user invite (requires MANAGE_USERS)

### Orders
- `GET /api/dashboard/orders` — Fetch orders (paginated)
- `POST /api/dashboard/orders` — Create order (requires MANAGE_ORDERS)
- `PATCH /api/dashboard/orders/<id>` — Update order (requires MANAGE_ORDERS)
- `DELETE /api/dashboard/orders/<id>` — Delete order (requires MANAGE_ORDERS)

### Revenue
- `GET /api/dashboard/revenue` — Fetch revenue data (requires VIEW_REVENUE)
- `POST /api/dashboard/revenue` — Add revenue record (requires VIEW_REVENUE)
- `DELETE /api/dashboard/revenue/<id>` — Delete revenue (requires MANAGE_ROLES)

## 🔐 Authentication & Authorization

### JWT Token Structure
```json
{
  "identity": "user_id",
  "additional_claims": {
    "company_id": 1,
    "role": "owner"
  }
}
```

### Permission Checking
All protected endpoints use the `@permission_required(Permission.NAME)` decorator:

```python
from app.permissions import permission_required
from app.models import Permissions

@app.route("/api/endpoint")
@permission_required(Permissions.VIEW_DASHBOARD)
def my_endpoint():
    # Only users with this permission can access
    pass
```

### Seeded Test Users
Run `python -m app.seeds.seed` to create:

**Acme Corp** (company_id=1)
- `owner@acme.com` (Owner)
- `sales@acme.com` (Sales)
- `accountant@acme.com` (Accountant)
- `hr@acme.com` (HR)

**Beta Studios** (company_id=2)
- `owner@beta.com` (Owner)
- `sales@beta.com` (Sales)

All use password: `password123`

## 🧪 Development

### Running Tests
```bash
pytest
```

### Migrations
```bash
# Create a new migration after model changes
flask db migrate -m "Description of change"

# Apply migrations
flask db upgrade

# Rollback last migration
flask db downgrade
```

### Database Reset (Development)
```bash
python -m app.seeds.seed
```

## 🚢 Deployment

### Railway (Recommended)
```bash
git push origin main
# Railway auto-deploys from GitHub
```

### Heroku
```bash
git push heroku main
```

### Docker
```bash
docker build -t flowdesk .
docker run -p 5000:5000 flowdesk
```

## 📋 Checklist for GitHub

- ✅ Multi-tenant SaaS dashboard
- ✅ JWT authentication
- ✅ Role-based access control (8 roles)
- ✅ Team management (invite, role assignment, deletion)
- ✅ Revenue & order tracking
- ✅ Database migrations
- ✅ Sample seed data
- ✅ REST API
- ✅ Error handling
- ✅ Security checks (owner protection, permission validation)

## 📄 License

MIT License — feel free to use this project for learning or production.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues or questions, please open a GitHub issue or contact the maintainers.

---

**Built with ❤️ for SaaS teams**

## Invite flow (UI + API)

- From the Team page you can send an invite (Team → Invite). If SMTP is
	configured the system emails the link. If not, the invite link is copied
	to your clipboard and shown in the UI for manual sharing.

- API: `POST /api/dashboard/invite` (requires `manage_users` permission)
	Request JSON: `{ "name": "Jane Doe", "email": "jane@company.com", "role": "employee" }`
	Response: `{ "invite_url": "https://.../invite/<token>", "email_sent": true|false }`

Accepting an invite: open `/invite/<token>` and set a password.

## Orders (CRUD)

The Orders module supports full CRUD via API and has a simple frontend UI:

- List (frontend): `GET /orders` (page) — uses `GET /api/dashboard/orders`
- Create (frontend + API): `POST /api/dashboard/orders` (requires `manage_orders`)
- Read single: `GET /api/dashboard/orders/<id>`
- Update: `PATCH /api/dashboard/orders/<id>`
- Delete: `DELETE /api/dashboard/orders/<id>`

Example curl commands (replace token and host):

```bash
# create
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
	-d '{"customer":"Alice","product":"Pro","amount":299}' \
	http://localhost:5000/api/dashboard/orders

# update
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
	-d '{"status":"completed"}' http://localhost:5000/api/dashboard/orders/1

# delete
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/dashboard/orders/1
```

## Testing & development notes
- Seeded users are created by `app/seeds/seed.py`. Owners/admins can invite and
	manage users.
- Frontend helpers live in `app/static/js/shared.js` (auth helpers, clipboard,
	toast) and `app/static/js/*` pages interact with the API.

If you want, I can add a small section showing how to configure a Gmail SMTP
account or add automated tests for the Orders API.
