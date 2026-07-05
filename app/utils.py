import os
import ssl
import smtplib
from email.message import EmailMessage
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


def send_email(subject, recipients, body, html=None):
    from flask import current_app

    server = current_app.config.get("MAIL_SERVER")
    if not server:
        return False, "Mail server is not configured"

    port = current_app.config.get("MAIL_PORT", 587)
    username = current_app.config.get("MAIL_USERNAME")
    password = current_app.config.get("MAIL_PASSWORD")
    use_tls = current_app.config.get("MAIL_USE_TLS", True)
    use_ssl = current_app.config.get("MAIL_USE_SSL", False)
    sender = current_app.config.get("MAIL_DEFAULT_SENDER") or username

    if not sender:
        return False, "Mail default sender is not configured"

    if isinstance(recipients, str):
        recipients = [recipients]

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)
    msg.set_content(body)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        if use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(server, port, context=context, timeout=20) as smtp:
                if username and password:
                    smtp.login(username, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(server, port, timeout=20) as smtp:
                if use_tls:
                    smtp.starttls(context=ssl.create_default_context())
                if username and password:
                    smtp.login(username, password)
                smtp.send_message(msg)
    except Exception as exc:
        return False, str(exc)

    return True, None
