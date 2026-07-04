from flask_jwt_extended import get_jwt_identity, get_jwt
from app.models import User
import re


# helper function for get user id
def get_current_user():
    """Call this inside any @jwt_required() route to get the logged-in user."""
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


# helper function for get company id
def get_company_id():
    claims = get_jwt()
    return claims["company_id"]


# helper function for valid email
def is_valid_email(email):
    return re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email)


# helper function for slug of company
def make_slug(name):
    """'Acme Corp' → 'acme-corp'"""
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
