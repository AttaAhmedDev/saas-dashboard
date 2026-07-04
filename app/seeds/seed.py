from app import create_app, db
from app.models import Company, User, Revenue, Order
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    try:  # we must use try and except as we edit database (rollback if something wrong)
        # Clear old data just for development , not in production (take care of that)
        db.drop_all()
        db.create_all()

        # Create 2 companies (2 tenants)
        company_a = Company(name="Acme Corp", slug="acme-corp")
        company_b = Company(name="Beta Studios", slug="beta-studios")
        db.session.add_all([company_a, company_b])
        db.session.commit()

        ADMIN_PASSWORD = generate_password_hash("password123")

        # Create users for each company
        users = [
            User(
                company_id=company_a.id,
                email="owner@acme.com",
                password=ADMIN_PASSWORD,
                name="Alice Owner",
                role="owner",
            ),
            User(
                company_id=company_a.id,
                email="sales@acme.com",
                password=ADMIN_PASSWORD,
                name="Bob Sales",
                role="sales",
            ),
            User(
                company_id=company_a.id,
                email="accountant@acme.com",
                password=ADMIN_PASSWORD,
                name="Carol Numbers",
                role="accountant",
            ),
            User(
                company_id=company_a.id,
                email="hr@acme.com",
                password=ADMIN_PASSWORD,
                name="Dave HR",
                role="hr",
            ),
            User(
                company_id=company_b.id,
                email="owner@beta.com",
                password=ADMIN_PASSWORD,
                name="John Owner",
                role="owner",
            ),
            User(
                company_id=company_b.id,
                email="sales@beta.com",
                password=ADMIN_PASSWORD,
                name="Jane Sales",
                role="sales",
            ),
        ]
        db.session.add_all(users)
        db.session.commit()

        # Revenue data for Acme Corp
        revenues_a = [
            Revenue(company_id=company_a.id, amount=12000, month="2024-01"),
            Revenue(company_id=company_a.id, amount=15500, month="2024-02"),
            Revenue(company_id=company_a.id, amount=13800, month="2024-03"),
            Revenue(company_id=company_a.id, amount=17200, month="2024-04"),
            Revenue(company_id=company_a.id, amount=19100, month="2024-05"),
            Revenue(company_id=company_a.id, amount=21000, month="2024-06"),
        ]
        # Revenue data for Beta Studios
        revenues_b = [
            Revenue(company_id=company_b.id, amount=8000, month="2024-01"),
            Revenue(company_id=company_b.id, amount=9200, month="2024-02"),
            Revenue(company_id=company_b.id, amount=11000, month="2024-03"),
            Revenue(company_id=company_b.id, amount=10500, month="2024-04"),
            Revenue(company_id=company_b.id, amount=13000, month="2024-05"),
            Revenue(company_id=company_b.id, amount=14500, month="2024-06"),
        ]
        db.session.add_all(revenues_a + revenues_b)

        STATUS_COMPLETED = "completed"
        STATUS_PENDING = "pending"
        STATUS_CANCELLED = "cancelled"

        # Orders for Acme Corp
        orders_a = [
            Order(
                company_id=company_a.id,
                customer="John Doe",
                product="Pro Plan",
                amount=299,
                status=STATUS_COMPLETED,
            ),
            Order(
                company_id=company_a.id,
                customer="Sara Lee",
                product="Basic Plan",
                amount=99,
                status=STATUS_COMPLETED,
            ),
            Order(
                company_id=company_a.id,
                customer="Mike Ross",
                product="Enterprise",
                amount=999,
                status=STATUS_PENDING,
            ),
        ]
        # Orders for Beta Studios
        orders_b = [
            Order(
                company_id=company_b.id,
                customer="Emma Stone",
                product="Starter",
                amount=49,
                status=STATUS_COMPLETED,
            ),
            Order(
                company_id=company_b.id,
                customer="James Bond",
                product="Pro Plan",
                amount=299,
                status=STATUS_CANCELLED,
            ),
        ]
        db.session.add_all(orders_a + orders_b)
        db.session.commit()

        print("Database seeded successfully!")
        print(f"   Company A: {company_a.name} (id={company_a.id})")
        print(f"   Company B: {company_b.name} (id={company_b.id})")
    except Exception as ex:
        db.session.rollback()
        print(f"Error:{ex}")
