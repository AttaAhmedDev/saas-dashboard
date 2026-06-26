from flask_jwt_extended import get_jwt_identity
from app.models import User

def get_current_user():
    """Call this inside any @jwt_required() route to get the logged-in user."""
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))