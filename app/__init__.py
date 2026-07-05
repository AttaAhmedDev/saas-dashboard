from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from app.config import Config
from flask_bcrypt import Bcrypt
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)

    CORS(app)

    # Register routes
    from app.routes.auth import auth_bp
    from app.routes.dashboard import dashboard_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    @app.route("/")
    @app.route("/login")
    def login_page():
        return render_template("auth/login.html")

    @app.route("/dashboard")
    def dashboard():
        return render_template("dashboard/dashboard.html")

    @app.route("/revenue")
    def revenue_page():
        return render_template("dashboard/revenue.html")

    @app.route("/orders")
    def orders_page():
        return render_template("dashboard/orders.html")

    @app.route("/team")
    def team_page():
        return render_template("dashboard/team.html")

    @app.route("/settings")
    def settings_page():
        return render_template("dashboard/settings.html")

    @app.route("/invite/<token>")
    def invite_page(token):
        from app.models import Invite

        invite = Invite.query.filter_by(token=token, status="pending").first()
        if not invite:
            return render_template(
                "auth/login.html", error="Invite not found or expired"
            )

        return render_template(
            "auth/invite.html",
            token=token,
            invite={
                "name": invite.name,
                "email": invite.email,
                "role": invite.role,
                "company_name": invite.company.name,
            },
        )

    return app
