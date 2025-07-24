# Social Media App

A comprehensive NestJS-based social media application with robust authentication, content management, and enterprise-grade security features.

## 🚀 Features

- **User Management**: Registration, authentication, and profile management
- **Content System**: Post creation, editing, and visibility controls
- **Social Interaction**: Comment system with nested discussions
- **Security First**: Multi-layer security with Helmet, CORS, and rate limiting
- **API Versioning**: Future-proof API design with version control
- **Developer Experience**: Comprehensive Swagger documentation
- **Production Ready**: Environment-aware configuration and validation

## 🛡️ Security

### Multi-Layer Protection

This application implements enterprise-grade security following industry best practices:

#### Security Headers (Helmet)
- **X-Content-Type-Options**: Prevents MIME type sniffing attacks
- **X-Frame-Options**: Protects against clickjacking
- **X-XSS-Protection**: Cross-site scripting protection
- **Strict-Transport-Security**: Enforces HTTPS in production
- **Referrer-Policy**: Controls referrer information leakage
- **Content-Security-Policy**: Prevents code injection (production only)

#### CORS (Cross-Origin Resource Sharing)
- **Development**: Permissive settings for rapid development
- **Production**: Strict origin control via environment configuration
- **Credentials**: Full support for cookie-based authentication
- **Flexible**: Multi-origin support for complex deployments

#### Rate Limiting & Throttling
- **Global Protection**: Multi-tier rate limiting (3/sec, 20/10sec, 100/min)
- **Endpoint-Specific**: Custom limits for sensitive operations
- **Brute Force Protection**: Login attempt limiting
- **Spam Prevention**: Registration rate limiting
- **Automatic Headers**: Real-time limit information in responses

## 📚 API Documentation

- **Interactive Docs**: [http://localhost:3000/api/v1/docs](http://localhost:3000/api/v1/docs)
- **API Version**: v1
- **Base URL**: `http://localhost:3000/api/v1`
- **Authentication**: Bearer token (JWT)

### Endpoint Overview

| Resource | Endpoint                     | Methods                  | Description               |
| -------- | ---------------------------- | ------------------------ | ------------------------- |
| Health   | `/api/v1/health`             | GET                      | Application health check  |
| Users    | `/api/v1/users`              | GET, POST, PATCH, DELETE | User management           |
| Auth     | `/api/v1/auth/*`             | POST                     | Authentication operations |
| Posts    | `/api/v1/posts`              | GET, POST, PATCH, DELETE | Content management        |
| Comments | `/api/v1/posts/:id/comments` | GET, POST, PATCH, DELETE | Social interactions       |

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd social-app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up the database**
   ```bash
   # MySQL with Docker
   docker run -d \
     --name social-app-mysql \
     -e MYSQL_ROOT_PASSWORD=your_password \
     -e MYSQL_DATABASE=social_app \
     -p 3306:3306 \
     -v social-app-data:/var/lib/mysql \
     mysql:8.0
   ```
   
   > **Note**: If you already have MySQL running locally, you can use a different port:
   > ```bash
   > # Use port 3307 to avoid conflicts
   > docker run -d \
   >   --name social-app-mysql \
   >   -e MYSQL_ROOT_PASSWORD=secretpw \
   >   -e MYSQL_DATABASE=social_app \
   >   -p 3307:3306 \
   >   -v social-app-data:/var/lib/mysql \
   >   mysql:8.0
   > ```
   > Then update your `DATABASE_URL` to use port 3307: `mysql://root:secretpw@localhost:3307/social_app`

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run database migrations**
   ```bash
   pnpm prisma migrate dev
   ```

6. **Start the development server**
   ```bash
   pnpm run start:dev
   ```

The application will be available at [http://localhost:3000](http://localhost:3000)

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="mysql://username:password@localhost:3306/social_app"

# Security (Required)
PASSWORD_PEPPER=your-strong-random-pepper-string
JWT_SECRET=your-jwt-secret-key-minimum-32-characters

# Hash Configuration (Optional - defaults provided)
HASH_MEMORY_COST=65536    # Memory usage in bytes
HASH_TIME_COST=2          # Time iterations
HASH_PARALLELISM=1        # Parallel threads

# CORS (Production only)
FRONTEND_URL=https://yourapp.com,https://admin.yourapp.com
```

### Required Variables

| Variable          | Description                  | Example                          |
| ----------------- | ---------------------------- | -------------------------------- |
| `DATABASE_URL`    | MySQL connection string      | `mysql://user:pass@host:3306/db` |
| `PASSWORD_PEPPER` | Additional password security | `random-string-min-32-chars`     |
| `JWT_SECRET`      | JWT signing secret           | `your-secure-secret-key`         |

#### MySQL Connection Examples

```bash
# Local MySQL (default port)
DATABASE_URL="mysql://root:password@localhost:3306/social_app"

# Local MySQL (custom port 3307)
DATABASE_URL="mysql://root:secretpw@localhost:3307/social_app"

# Remote MySQL with SSL
DATABASE_URL="mysql://user:pass@remote-host:3306/social_app?ssl=true"

# Cloud MySQL (PlanetScale, etc.)
DATABASE_URL="mysql://user:pass@aws.connect.psdb.cloud/social_app?sslaccept=strict"
```

### Optional Variables

| Variable       | Default       | Description                           |
| -------------- | ------------- | ------------------------------------- |
| `NODE_ENV`     | `development` | Application environment               |
| `PORT`         | `3000`        | Server port                           |
| `FRONTEND_URL` | N/A           | CORS allowed origins (production)     |
| `HASH_*`       | See above     | Argon2 password hashing configuration |

## 🧪 Development

### Available Scripts

```bash
# Development
pnpm run start:dev    # Watch mode with auto-reload
pnpm run start        # Standard development mode
pnpm run start:prod   # Production mode

# Building
pnpm run build        # Compile TypeScript

# Testing
pnpm run test         # Unit tests
pnpm run test:e2e     # End-to-end tests
pnpm run test:cov     # Test coverage

# Database
pnpm prisma studio    # Database GUI
pnpm prisma migrate   # Run migrations
```

### Testing Security Features

```bash
# Test rate limiting
for i in {1..5}; do curl -w "\n%{http_code}\n" http://localhost:3000/api/v1/health; done

# Test security headers
curl -I http://localhost:3000/api/v1/health

# Test login rate limiting
for i in {1..4}; do 
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    -w "\n%{http_code}\n"
done
```

### Customizing Rate Limits

Update `src/app.module.ts` to modify global limits:

```typescript
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,    // Time window (ms)
    limit: 3,     // Max requests
  },
  // ... additional tiers
])
```

Use `@Throttle()` decorator for endpoint-specific limits:

```typescript
@Post('sensitive-endpoint')
@Throttle({ short: { limit: 1, ttl: 60000 } })
async sensitiveOperation() {
  // Implementation
}
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure `JWT_SECRET` (32+ characters)
- [ ] Set up proper `DATABASE_URL` for MySQL
- [ ] Configure `FRONTEND_URL` for CORS
- [ ] Enable HTTPS/TLS
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for MySQL

### Docker Deployment

```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

## 🏗️ Architecture

### Technology Stack

- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: MySQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Security**: Helmet, CORS, Throttling
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, Zod
- **Testing**: Jest

### Project Structure

```
src/
├── auth/           # Authentication module
├── user/           # User management
├── post/           # Content management
├── comment/        # Social interactions
├── common/         # Shared utilities
├── prisma/         # Database layer
└── schemas/        # Validation schemas
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is [MIT licensed](LICENSE).

## 🔗 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [MySQL Documentation](https://dev.mysql.com/doc)

---

**Built with using NestJS**
