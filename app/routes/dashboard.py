from flask import Blueprint,jsonify,request
from flask_jwt_extended import get_jwt,jwt_required
from app.models import User ,Revenue,Order
from app import db
from sqlalchemy import func
from datetime import datetime, timezone


dashboard_bp = Blueprint('dashboard', __name__)

def get_company_id():
    claims = get_jwt()
    return claims['company_id']
# ── GET /api/dashboard/summary ─────────────────────────────────────
# Returns: total revenue, total orders, total users, revenue this month
@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    company_id = get_company_id()

    # Total revenue across all time
    total_revenue = db.session.query(
        func.sum(Revenue.amount)
    ).filter_by(company_id=company_id).scalar() or 0

    # Total orders
    total_orders = Order.query.filter_by(company_id=company_id).count()

    # Completed orders only
    completed_orders = Order.query.filter_by(
        company_id=company_id,
        status='completed'
    ).count()

    # Total users in the company
    total_users = User.query.filter_by(company_id=company_id).count()

    # Revenue this month
    from datetime import datetime
    current_month = datetime.utcnow().strftime('%Y-%m')
    month_revenue = db.session.query(
        func.sum(Revenue.amount)
    ).filter_by(company_id=company_id, month=current_month).scalar() or 0

    return jsonify({
        'total_revenue':    round(total_revenue, 2),
        'total_orders':     total_orders,
        'completed_orders': completed_orders,
        'total_users':      total_users,
        'month_revenue':    round(month_revenue, 2)
    }), 200

# ── GET /api/dashboard/revenue ─────────────────────────────────────
# Returns: monthly revenue list for the chart
@dashboard_bp.route('/revenue',methods=['GET'])
@jwt_required()
def revenue():
    company_id = get_company_id()
    
    records = Revenue.query.filter_by(company_id=company_id)\
    .order_by(Revenue.month.asc()).all()
    
    return  jsonify({
        'revenue':[r.to_dict() for r in records]
    }),200
    
# ── GET /api/dashboard/orders ─────────────────────────────────────
# Returns: recent orders list for the table
@dashboard_bp.route('/orders',methods=['GET'])
@jwt_required()
def orders():
    company_id=get_company_id()
    
    # Optional status filter: /api/dashboard/orders?status=completed
    status =request.args.get('status')
    query = Order.query.filter_by(company_id=company_id)
    if status:
        query =query.filter_by(status=status)
    
    records = query.order_by(Order.created_at.desc()).limit(20).all()    
    
    return jsonify({
        'orders':[o.to_dict() for o in records]
    }),200
    
# ── GET /api/dashboard/users ─────────────────────────────────────
# Returns: all users in this company
@dashboard_bp.route('/users', methods=['GET'])
@jwt_required()
def users():
    company_id = get_company_id()
    
    record =User.query.filter_by(company_id=company_id)\
        .order_by(User.created_at.desc()).all()
        
    return jsonify({
        'users':[u.to_dict() for u in record]
    }),200
    
# ── POST /api/dashboard/orders ───────────────────────────────────────
# Create a new order for this company
@dashboard_bp.route('/orders', methods=['POST'])
@jwt_required()
def create_order():
    company_id = get_company_id()
    data = request.get_json()
    
    required = ['customer', 'product', 'amount']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    order = Order(
        company_id = company_id,
        customer   = data['customer'],
        product    = data['product'],
        amount     = data['amount'],
        status     = data.get('status', 'pending')
    )
    
    db.session.add(order)
    db.session.commit()
    
    return jsonify({
        'message': 'Order created',
        'order':   order.to_dict()
    }), 201
