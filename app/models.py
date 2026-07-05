from app import db
from datetime import datetime, timezone
from uuid import uuid4


# Permission constants
class Permissions:
    VIEW_DASHBOARD = "view_dashboard"
    MANAGE_ORDERS = "manage_orders"
    VIEW_REVENUE = "view_revenue"
    MANAGE_USERS = "manage_users"
    MANAGE_ROLES = "manage_roles"
    COMPANY_SETTINGS = "company_settings"


ROLE_PERMISSIONS = {
    "owner": [
        Permissions.VIEW_DASHBOARD,
        Permissions.MANAGE_ORDERS,
        Permissions.VIEW_REVENUE,
        Permissions.MANAGE_USERS,
        Permissions.MANAGE_ROLES,
        Permissions.COMPANY_SETTINGS,
    ],
    "admin": [
        Permissions.VIEW_DASHBOARD,
        Permissions.MANAGE_ORDERS,
        Permissions.VIEW_REVENUE,
        Permissions.MANAGE_USERS,
        Permissions.MANAGE_ROLES,
    ],
    "manager": [
        Permissions.VIEW_DASHBOARD,
        Permissions.MANAGE_ORDERS,
        Permissions.VIEW_REVENUE,
    ],
    "sales": [
        Permissions.VIEW_DASHBOARD,
        Permissions.MANAGE_ORDERS,
    ],
    "accountant": [
        Permissions.VIEW_DASHBOARD,
        Permissions.VIEW_REVENUE,
    ],
    "hr": [
        Permissions.MANAGE_USERS,
    ],
    "employee": [
        Permissions.VIEW_DASHBOARD,
    ],
    "member": [
        Permissions.VIEW_DASHBOARD,
    ],
}


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    slug = db.Column(db.String(100), nullable=False, unique=True)  # e.g. "acme-corp"
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    users = db.relationship("User", backref="company", lazy=True)
    revenues = db.relationship("Revenue", backref="company", lazy=True)
    orders = db.relationship("Order", backref="company", lazy=True)
    invites = db.relationship("Invite", backref="company", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "created_at": self.created_at.isoformat(),
        }


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)  # hashed
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), default="employee")  # default role for new users
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "permissions": self.get_permissions(),
            "created_at": self.created_at.isoformat(),
        }

    def get_permissions(self):
        """Returns the list of permissions for this user's role."""
        # ROLE_PERMISSIONS[index] this not good as if role not exist ,python raises exception.
        return ROLE_PERMISSIONS.get(self.role, [])

    def has_permission(self, permission):
        return permission in self.get_permissions()


class Invite(db.Model):
    __tablename__ = "invites"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    invited_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    email = db.Column(db.String(120), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    accepted_at = db.Column(db.DateTime, nullable=True)

    invited_by = db.relationship("User", foreign_keys=[invited_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
        }


class Revenue(db.Model):
    __tablename__ = "revenues"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    month = db.Column(db.String(7), nullable=False)  # format: "2024-01"
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "amount": self.amount,
            "month": self.month,
        }


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    customer = db.Column(db.String(100), nullable=False)
    product = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(
        db.String(20), default="pending"
    )  # pending / completed / cancelled
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "customer": self.customer,
            "product": self.product,
            "amount": self.amount,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }
