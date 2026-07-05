# Deployment Guide

This guide covers deploying FlowDesk to production platforms.

## Prerequisites

- Git repository pushed to GitHub
- Environment variables configured
- PostgreSQL database (free tier available on most platforms)

## Railway (Recommended)

Railway is the simplest option for Flask apps.

### Setup

1. **Connect GitHub repository**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project"
   - Select "GitHub Repo"
   - Authorize and select this repository

2. **Add PostgreSQL**
   - Click "Add Service" → "Database" → "PostgreSQL"
   - Railway creates `DATABASE_URL` automatically

3. **Configure environment variables**
   - Go to project settings
   - Add variables:
     ```
     JWT_SECRET_KEY=your-super-secret-key-here
     FLASK_ENV=production
     ```

4. **Deploy**
   - Push to main branch
   - Railway auto-deploys
   - View logs in dashboard

### URL

Your app will be available at: `https://your-project-name.up.railway.app`

---

## Heroku

Heroku is also easy but has different setup.

### Setup

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Windows
   choco install heroku-cli
   ```

2. **Login & create app**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Add PostgreSQL add-on**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

4. **Set environment variables**
   ```bash
   heroku config:set JWT_SECRET_KEY="your-super-secret-key"
   heroku config:set FLASK_ENV="production"
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

6. **Run migrations**
   ```bash
   heroku run flask db upgrade
   ```

7. **View logs**
   ```bash
   heroku logs --tail
   ```

### URL

Your app will be available at: `https://your-app-name.herokuapp.com`

---

## Docker

Containerize your app for any platform.

### Build Dockerfile

Create `Dockerfile` in project root:

```dockerfile
FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "run:app"]
```

### Build & Test Locally

```bash
# Build image
docker build -t flowdesk .

# Run container
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET_KEY="your-key" \
  flowdesk
```

### Deploy to Docker Hub

```bash
# Tag image
docker tag flowdesk your-username/flowdesk

# Push to Docker Hub
docker push your-username/flowdesk
```

Then use the image on any platform (AWS, GCP, Azure, etc.)

---

## AWS

Using AWS Elastic Beanstalk.

### Setup

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize**
   ```bash
   eb init -p python-3.14 flowdesk
   eb create flowdesk-env
   ```

3. **Set environment variables**
   ```bash
   eb setenv JWT_SECRET_KEY="your-key" FLASK_ENV=production
   ```

4. **Deploy**
   ```bash
   git push && eb deploy
   ```

---

## Environment Configuration for Production

### Critical Settings

```env
# Must change these
JWT_SECRET_KEY=generate-a-random-secure-string-here
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Should set these
FLASK_ENV=production
FLASK_DEBUG=false

# SMTP for email invites (optional but recommended)
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
MAIL_USE_TLS=true
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
```

### Generate JWT Secret

```bash
# macOS/Linux
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Windows
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Database Migrations

### On first deployment

```bash
# Using Heroku
heroku run flask db upgrade

# Using Railway (via CLI or dashboard terminal)
railway run flask db upgrade

# Using Docker
docker exec container-name flask db upgrade
```

### Seeding production data (optional)

```bash
# Only if you want sample data
heroku run python -m app.seeds.seed
```

⚠️ **Note:** Seeding will delete all existing data. Use only on fresh databases!

---

## Monitoring & Logs

### Railway
- Dashboard shows live logs
- Metrics tab shows memory/CPU usage

### Heroku
```bash
heroku logs --tail        # Stream logs
heroku logs -n 100        # Last 100 lines
heroku logs --dyno=web.1  # Specific dyno
```

### Check app status
```bash
# Heroku
heroku ps

# Railway (via CLI)
railway status
```

---

## Scaling

### Railway
- Upgrade from free tier to paid
- Increase RAM/CPU in settings
- Railway handles scaling automatically

### Heroku
```bash
# Scale to more dynos
heroku ps:scale web=2

# Change dyno size
heroku ps:type standard-1x
```

---

## SSL/TLS Certificates

- **Railway** - Automatic with *.up.railway.app domain
- **Heroku** - Automatic with *.herokuapp.com domain
- **Custom domain** - Most platforms offer free auto-renewal

---

## Performance Tips

1. **Enable CORS caching** in config for production
2. **Use connection pooling** for database (usually automatic)
3. **Compress responses** with gzip
4. **Set proper cache headers** for static assets
5. **Monitor database connections** - watch for leaks

---

## Security Checklist

- [ ] `FLASK_DEBUG=false` in production
- [ ] Strong `JWT_SECRET_KEY` (32+ characters)
- [ ] Database credentials never in code (use env vars)
- [ ] HTTPS enforced
- [ ] CORS configured appropriately
- [ ] SQL injection protection (SQLAlchemy handles this)
- [ ] Rate limiting configured (optional but recommended)
- [ ] Error messages don't leak sensitive info

---

## Troubleshooting

### App won't start
```bash
heroku logs --tail    # Check logs
heroku ps             # Check dyno status
```

### Database connection fails
```bash
heroku config         # Check DATABASE_URL is set
heroku logs           # Look for connection errors
```

### Permission errors
- Ensure `MANAGE_ROLES` permission set correctly
- Check `FLASK_ENV=production` is set
- Verify JWT secret matches between instances

### Slow responses
- Check database indexes
- Review slow queries in logs
- Consider caching frequently accessed data

---

## Support

For deployment issues:
1. Check platform-specific documentation
2. Review application logs
3. Open a GitHub issue with error details
4. Check the troubleshooting section above

---

**Happy deploying! 🚀**
