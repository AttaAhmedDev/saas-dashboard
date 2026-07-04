from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.utils import get_current_user


def permission_required(permission):
    """
    Decorator that checks if the logged-in user has a specific permission.
    Use on any route you want to protect.

    Example:
        @dashboard_bp.route('/revenue')
        @permission_required('view_revenue')
        def revenue():
            ...
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # 1. verify JWT is present and valid
            verify_jwt_in_request()
            identity = get_jwt_identity()

            # 2. load the user from the database
            user = get_current_user()
            if not user:
                return jsonify({"error": "User not found"}), 404

            # 3. check permission
            if not user.has_permission(permission):
                return (
                    jsonify(
                        {
                            "error": "Access denied",
                            "reason": f"Your role '{user.role}' does not have '{permission}' permission",
                            "your_role": user.role,
                            "required": permission,
                        }
                    ),
                    403,
                )

            return fn(*args, **kwargs)

        return wrapper

    return decorator
