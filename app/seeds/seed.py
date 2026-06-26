from app import create_app, db
from app.models import Company, User, Revenue, Order
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    # Clear old data
    db.drop_all()
    db.create_all()

    # Create 2 companies (2 tenants)
    company_a = Company(name='Acme Corp',    slug='acme-corp')
    company_b = Company(name='Beta Studios', slug='beta-studios')
    db.session.add_all([company_a, company_b])
    db.session.commit()

    # Create users for each company
    user_a = User(
        company_id = company_a.id,
        email      = 'admin@acme.com',
        password   = generate_password_hash('password123'),
        name       = 'Alice Admin',
        role       = 'admin'
    )
    user_b = User(
        company_id = company_b.id,
        email      = 'admin@beta.com',
        password   = generate_password_hash('password123'),
        name       = 'Bob Admin',
        role       = 'admin'
    )
    db.session.add_all([user_a, user_b])
    db.session.commit()

    # Revenue data for Acme Corp
    revenues_a = [
        Revenue(company_id=company_a.id, amount=12000, month='2024-01'),
        Revenue(company_id=company_a.id, amount=15500, month='2024-02'),
        Revenue(company_id=company_a.id, amount=13800, month='2024-03'),
        Revenue(company_id=company_a.id, amount=17200, month='2024-04'),
        Revenue(company_id=company_a.id, amount=19100, month='2024-05'),
        Revenue(company_id=company_a.id, amount=21000, month='2024-06'),
    ]
    # Revenue data for Beta Studios
    revenues_b = [
        Revenue(company_id=company_b.id, amount=8000,  month='2024-01'),
        Revenue(company_id=company_b.id, amount=9200,  month='2024-02'),
        Revenue(company_id=company_b.id, amount=11000, month='2024-03'),
        Revenue(company_id=company_b.id, amount=10500, month='2024-04'),
        Revenue(company_id=company_b.id, amount=13000, month='2024-05'),
        Revenue(company_id=company_b.id, amount=14500, month='2024-06'),
    ]
    db.session.add_all(revenues_a + revenues_b)

    # Orders for Acme Corp
    orders_a = [
        Order(company_id=company_a.id, customer='John Doe',  product='Pro Plan',    amount=299, status='completed'),
        Order(company_id=company_a.id, customer='Sara Lee',  product='Basic Plan',  amount=99,  status='completed'),
        Order(company_id=company_a.id, customer='Mike Ross', product='Enterprise',  amount=999, status='pending'),
    ]
    # Orders for Beta Studios
    orders_b = [
        Order(company_id=company_b.id, customer='Emma Stone', product='Starter',    amount=49,  status='completed'),
        Order(company_id=company_b.id, customer='James Bond', product='Pro Plan',   amount=299, status='cancelled'),
    ]
    db.session.add_all(orders_a + orders_b)
    db.session.commit()

    print("Database seeded successfully!")
    print(f"   Company A: {company_a.name} (id={company_a.id})")
    print(f"   Company B: {company_b.name} (id={company_b.id})")