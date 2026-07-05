from flask import Blueprint, jsonify, request, url_for, current_app
from flask_jwt_extended import jwt_required
from app.models import User, Revenue, Order, Invite, Permissions, ROLE_PERMISSIONS
from app.utils import get_company_id, get_current_user, is_valid_email, send_email
from app.permissions import permission_required
from app import db
from sqlalchemy import func
from datetime import datetime, timezone
from uuid import uuid4

dashboard_bp = Blueprint("dashboard", __name__)


# ── GET /api/dashboard/summary ─────────────────────────────────────
# Returns: total revenue, total orders, total users, revenue this month
@dashboard_bp.route("/summary", methods=["GET"])
@permission_required(Permissions.VIEW_DASHBOARD)
def summary():
    company_id = get_company_id()

    # Total revenue across all time
    total_revenue = (
        db.session.query(func.sum(Revenue.amount))
        .filter_by(company_id=company_id)
        .scalar()
        or 0
    )

    # Total orders
    total_orders = Order.query.filter_by(company_id=company_id).count()

    # Completed orders only
    completed_orders = Order.query.filter_by(
        company_id=company_id, status="completed"
    ).count()

    # Total users in the company
    total_users = User.query.filter_by(company_id=company_id).count()

    # Revenue this month
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    month_revenue = (
        db.session.query(func.sum(Revenue.amount))
        .filter_by(company_id=company_id, month=current_month)
        .scalar()
        or 0
    )

    return (
        jsonify(
            {
                "total_revenue": round(total_revenue, 2),
                "total_orders": total_orders,
                "completed_orders": completed_orders,
                "total_users": total_users,
                "month_revenue": round(month_revenue, 2),
            }
        ),
        200,
    )


# ── GET /api/dashboard/revenue ─────────────────────────────────────
# Returns: monthly revenue list for the chart
@dashboard_bp.route("/revenue", methods=["GET"])
@permission_required(
    Permissions.VIEW_REVENUE
)  # ← only accountant, manager, admin, owner
def revenue():
    user = (
        get_current_user()
    )  # i run query for two times here and in permission_required decorator , performance issue
    company_id = get_company_id()

    records = (
        Revenue.query.filter_by(company_id=company_id)
        .order_by(Revenue.month.asc())
        .all()
    )
    return jsonify({"revenue": [r.to_dict() for r in records]}), 200


# ── GET /api/dashboard/orders ─────────────────────────────────────
# Returns: recent orders list for the table
@dashboard_bp.route("/orders", methods=["GET"])
@permission_required(Permissions.VIEW_DASHBOARD)
def orders():
    company_id = get_company_id()

    # Optional status filter: /api/dashboard/orders?status=completed
    status = request.args.get("status")
    limit = request.args.get("limit", type=int) or 20
    if limit > 1000:
        limit = 1000

    query = Order.query.filter_by(company_id=company_id)
    if status and status != "all":
        query = query.filter_by(status=status)

    records = query.order_by(Order.created_at.desc()).limit(limit).all()

    return jsonify({"orders": [o.to_dict() for o in records]}), 200


# ── GET /api/dashboard/users ─────────────────────────────────────
# Returns: all users in this company
@dashboard_bp.route("/users", methods=["GET"])
@permission_required(Permissions.MANAGE_USERS)  # ← only hr, admin, owner
def users():
    company_id = get_company_id()
    record = (
        User.query.filter_by(company_id=company_id)
        .order_by(User.created_at.desc())
        .all()
    )

    return jsonify({"users": [u.to_dict() for u in record]}), 200


# ── GET /api/dashboard/roles ────────────────────────────────────────
# Returns: all available roles and their permissions
@dashboard_bp.route("/roles", methods=["GET"])
@permission_required(Permissions.MANAGE_ROLES)  # ← only admin, owner
def get_roles():
    roles_list = []
    for role_name, permissions in ROLE_PERMISSIONS.items():
        roles_list.append({
            "role": role_name,
            "permissions": permissions,
            "permission_count": len(permissions)
        })
    return jsonify({"roles": roles_list}), 200


# ── DELETE /api/dashboard/users/<user_id> ──────────────────────────
# Remove a user from the team
@dashboard_bp.route("/users/<int:user_id>", methods=["DELETE"])
@permission_required(Permissions.MANAGE_USERS)  # ← only hr, admin, owner
def delete_user(user_id):
    current = get_current_user()
    company_id = get_company_id()
    target = User.query.filter_by(id=user_id, company_id=company_id).first()

    if not target:
        return jsonify({"error": "User not found"}), 404

    # Prevent users from deleting themselves
    if target.id == current.id:
        return jsonify({"error": "You cannot delete your own account"}), 400

    # Prevent admins from deleting owners
    if target.role == "owner" and current.role == "admin":
        return jsonify({"error": "Only an owner can delete another owner"}), 403

    # Prevent removing the last owner
    if target.role == "owner":
        owner_count = User.query.filter_by(company_id=company_id, role="owner").count()
        if owner_count <= 1:
            return jsonify({"error": "Cannot delete the last owner"}), 400

    db.session.delete(target)
    db.session.commit()
    return jsonify({"message": "User deleted successfully"}), 200


@dashboard_bp.route("/invite", methods=["POST"])
@permission_required(Permissions.MANAGE_USERS)
def invite_user():
    current = get_current_user()
    company_id = get_company_id()
    data = request.get_json() or {}

    required = ["email", "name", "role"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    email = data["email"].strip().lower()
    name = data["name"].strip()
    role = data["role"].strip()

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email address"}), 400

    valid_roles = list(ROLE_PERMISSIONS.keys())
    if role not in valid_roles:
        return (
            jsonify(
                {"error": f'Invalid role. Must be one of: {", ".join(valid_roles)}'}
            ),
            400,
        )

    if role == "owner" and current.role == "admin":
        return jsonify({"error": "Only an owner can invite another owner"}), 403

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "A user with this email already exists"}), 409

    if Invite.query.filter_by(
        company_id=company_id, email=email, status="pending"
    ).first():
        return jsonify({"error": "An invite for this email is already pending"}), 409

    token = uuid4().hex
    invite = Invite(
        company_id=company_id,
        invited_by_id=current.id,
        email=email,
        name=name,
        role=role,
        token=token,
    )
    db.session.add(invite)
    db.session.commit()

    invite_url = url_for("invite_page", token=token, _external=True)

    email_sent = False
    email_error = None
    if current_app.config.get("MAIL_SERVER"):
        subject = f"You're invited to join {current.company.name} on FlowDesk"
        body = (
            f"Hello {name},\n\n"
            f"{current.name} invited you to join {current.company.name} on FlowDesk as {role}.\n\n"
            f"Accept your invite by opening this link:\n{invite_url}\n\n"
            "If the link does not work, copy and paste it into your browser.\n\n"
            "Thanks,\nFlowDesk Team"
        )
        html = (
            f"<p>Hello {name},</p>"
            f"<p>{current.name} invited you to join <strong>{current.company.name}</strong> on FlowDesk as <strong>{role}</strong>.</p>"
            f'<p><a href="{invite_url}">Accept your invite</a></p>'
            f'<p>If the link does not work, copy and paste this URL into your browser:<br /><a href="{invite_url}">{invite_url}</a></p>'
            "<p>Thanks,<br />FlowDesk Team</p>"
        )
        email_sent, email_error = send_email(subject, email, body, html=html)

    return (
        jsonify(
            {
                "message": "Invite created successfully",
                "invite": invite.to_dict(),
                "invite_url": invite_url,
                "email_sent": email_sent,
                "email_error": email_error,
            }
        ),
        201,
    )


@dashboard_bp.route("/users/<int:user_id>/role", methods=["PATCH"])
@permission_required(Permissions.MANAGE_ROLES)  # ← only admin, owner
def update_role(user_id):
    current = get_current_user()
    company_id = get_company_id()
    target = User.query.filter_by(id=user_id, company_id=company_id).first()

    if not target:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    new_role = data.get("role")
    valid_roles = list(ROLE_PERMISSIONS.keys())
    if new_role not in valid_roles:
        return jsonify(
            {"error": f'Invalid role. Must be one of: {", ".join(valid_roles)} '}
        ), 400

    # Admins cannot assign the 'owner' role — only owners can
    if new_role == "owner" and current.role == "admin":
        return jsonify({"error": "Only an owner can assign the owner role"}), 403

    # Prevent removing the last owner
    if target.role == "owner" and new_role != "owner":
        owner_count = User.query.filter_by(company_id=company_id, role="owner").count()
        if owner_count <= 1:
            return jsonify({"error": "Cannot remove the last owner"}), 400

    target.role = new_role
    db.session.commit()
    return (
        jsonify({"message": f"Role updated to {new_role}", "user": target.to_dict()}),
        200,
    )


# ── POST /api/dashboard/orders ───────────────────────────────────────
# Create a new order for this company
@dashboard_bp.route("/orders", methods=["POST"])
@permission_required(Permissions.MANAGE_ORDERS)  # ← only sales, manager, admin, owner
def create_order():
    company_id = get_company_id()
    data = request.get_json() or {}

    required = ["customer", "product", "amount"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    order = Order(
        company_id=company_id,
        customer=data["customer"],
        product=data["product"],
        amount=data["amount"],
        status=data.get("status", "pending"),
    )

    db.session.add(order)
    db.session.commit()

    return jsonify({"message": "Order created", "order": order.to_dict()}), 201


# ----- GET /api/dashboard/orders/<id> (read single order)
@dashboard_bp.route("/orders/<int:order_id>", methods=["GET"])
@permission_required(Permissions.VIEW_DASHBOARD)
def get_order(order_id):
    company_id = get_company_id()
    record = Order.query.filter_by(id=order_id, company_id=company_id).first()
    if not record:
        return jsonify({"error": "Order not found"}), 404

    return jsonify({"order": record.to_dict()}), 200


# ----- PATCH /api/dashboard/orders/<id> (partial update)
@dashboard_bp.route("/orders/<int:order_id>", methods=["PATCH"])
@permission_required(Permissions.MANAGE_ORDERS)
def update_order(order_id):
    company_id = get_company_id()
    record = Order.query.filter_by(id=order_id, company_id=company_id).first()
    if not record:
        return jsonify({"error": "Order not found"}), 404

    data = request.get_json() or {}
    updatable = ["customer", "product", "amount", "status"]
    changed = False
    for k in updatable:
        if k in data and data[k] is not None:
            setattr(record, k, data[k])
            changed = True

    if changed:
        db.session.commit()

    return jsonify({"message": "Order updated", "order": record.to_dict()}), 200


# ----- DELETE /api/dashboard/orders/<id>
@dashboard_bp.route("/orders/<int:order_id>", methods=["DELETE"])
@permission_required(Permissions.MANAGE_ORDERS)
def delete_order(order_id):
    company_id = get_company_id()
    record = Order.query.filter_by(id=order_id, company_id=company_id).first()
    if not record:
        return jsonify({"error": "Order not found"}), 404

    db.session.delete(record)
    db.session.commit()
    return jsonify({"message": "Order deleted"}), 200


# POST /api/dashboard/revenue — add a record
@dashboard_bp.route("/revenue", methods=["POST"])
@permission_required(Permissions.VIEW_REVENUE)
def add_revenue():
    user = get_current_user()
    data = request.get_json() or {}
    company_id = get_company_id()
    if not data.get("month") or not data.get("amount"):
        return jsonify({"error": "month and amount are required"}), 400
    record = Revenue(company_id=company_id, month=data["month"], amount=data["amount"])
    db.session.add(record)
    db.session.commit()
    return jsonify({"message": "Revenue added", "revenue": record.to_dict()}), 201


# DELETE /api/dashboard/revenue/<id> — delete a record
@dashboard_bp.route("/revenue/<int:rev_id>", methods=["DELETE"])
@permission_required(Permissions.MANAGE_ROLES)
def delete_revenue(rev_id):
    user = get_current_user()
    company_id = get_company_id()
    record = Revenue.query.filter_by(id=rev_id, company_id=company_id).first()
    if not record:
        return jsonify({"error": "Record not found"}), 404
    db.session.delete(record)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
