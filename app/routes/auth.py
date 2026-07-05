from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db, bcrypt
from app.models import User, Company, Invite
from werkzeug.security import check_password_hash, generate_password_hash
from app.utils import get_current_user, is_valid_email, make_slug
from datetime import datetime, timezone

auth_bp = Blueprint("auth", __name__)


# ── POST /api/auth/register ──────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    # 1. validate required fields
    required = ["company_name", "name", "email", "password"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    if not is_valid_email(data["email"]):
        return jsonify({"error": "Invalid email address"}), 400

    if len(data["password"]) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # 2. check email not already used
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    # 3. create company (or use existing one with same slug)
    slug = make_slug(data["company_name"])
    company = Company.query.filter_by(slug=slug).first()
    if not company:
        company = Company(name=data["company_name"], slug=slug)
        db.session.add(company)
        db.session.flush()  # get id for company before commit

    # 4. create user with hashed password
    hashed_pw = generate_password_hash(data["password"])
    # Check if this is the first user of the company
    user_count = User.query.filter_by(company_id=company.id).count()
    user_role = "owner" if user_count == 0 else "admin"
    user = User(
        company_id=company.id,
        email=data["email"],
        password=hashed_pw,
        name=data["name"],
        role=user_role,
    )
    db.session.add(user)
    db.session.commit()

    # 5. return token immediately (user is logged in after register)
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "company_id": company.id,
            "role": user.role,
        },
    )

    return (
        jsonify(
            {
                "message": "Account created successfully",
                "token": token,
                "user": user.to_dict(),
                "company": company.to_dict(),
            }
        ),
        201,
    )


# ── POST /api/auth/login ─────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    # 1. find user
    user = User.query.filter_by(email=data["email"]).first()
    if not user:
        return jsonify({"error": "Invalid email and password"}), 401

    # 2. check password
    if not check_password_hash(user.password, data["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    # 3. create token — stores user_id and company_id inside it , i use claims and make identity return string not dictionary unlike register
    token = create_access_token(
        identity=str(user.id),
        additional_claims={"company_id": user.company_id, "role": user.role},
    )

    return (
        jsonify(
            {
                "message": "Login successful",
                "token": token,
                "user": user.to_dict(),
                "company": user.company.to_dict(),
            }
        ),
        200,
    )


# ── GET /api/auth/invite/<token> — get invite details
@auth_bp.route("/invite/<token>", methods=["GET"])
def get_invite(token):
    invite = Invite.query.filter_by(token=token, status="pending").first()
    if not invite:
        return jsonify({"error": "Invite not found or expired"}), 404

    return jsonify({"invite": invite.to_dict()}), 200


# ── POST /api/auth/invite/<token> — accept invite
@auth_bp.route("/invite/<token>", methods=["POST"])
def accept_invite(token):
    data = request.get_json() or {}
    password = data.get("password")

    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    invite = Invite.query.filter_by(token=token, status="pending").first()
    if not invite:
        return jsonify({"error": "Invite not found or expired"}), 404

    if User.query.filter_by(email=invite.email).first():
        return jsonify({"error": "A user with this email already exists"}), 409

    hashed_pw = generate_password_hash(password)
    user = User(
        company_id=invite.company_id,
        email=invite.email,
        password=hashed_pw,
        name=invite.name,
        role=invite.role,
    )
    db.session.add(user)

    invite.status = "accepted"
    invite.accepted_at = datetime.now(timezone.utc)
    db.session.commit()

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"company_id": user.company_id, "role": user.role},
    )

    return (
        jsonify(
            {
                "message": "Invite accepted",
                "token": token,
                "user": user.to_dict(),
                "company": user.company.to_dict(),
            }
        ),
        201,
    )


# ── GET /api/auth/me ─────────────────────────────────────────────
# Protected route — requires a valid token


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": user.to_dict(), "company": user.company.to_dict()}), 200
