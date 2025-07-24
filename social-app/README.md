## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Init database

```bash
docker run -d \
  --name my-mysql \
  -e MYSQL_ROOT_PASSWORD=secretpw \
  -e MYSQL_DATABASE=appdb \
  -p 3307:3306 \
  -v my-db-volume:/var/lib/mysql \
  mysql:8.0
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Environment Variables

You must set the following environment variable in your .env file:

```
JWT_SECRET=your_jwt_secret_here
```

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Social Media App

A NestJS-based social media application with authentication, posts, comments, and user management.

## Features

- User registration and authentication (JWT)
- Post creation and management
- Comment system
- API versioning (v1)
- Security middleware with Helmet
- CORS configuration for cross-origin requests
- Rate limiting and throttling protection
- Comprehensive API documentation with Swagger

## Security

This application implements security best practices using [Helmet](https://helmetjs.github.io/):

### Security Headers Enabled

Helmet automatically sets several security-related HTTP headers:

- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks  
- **X-XSS-Protection**: Enables XSS filtering
- **Strict-Transport-Security**: Enforces HTTPS connections
- **Referrer-Policy**: Controls referrer information
- **Content-Security-Policy**: Prevents code injection (disabled in development for Swagger compatibility)

### CORS (Cross-Origin Resource Sharing)

CORS is configured to allow frontend applications to communicate with the API:

#### Development Mode
- **Origin**: All origins allowed (`*`)
- **Credentials**: Enabled for cookie-based authentication
- **Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- **Headers**: `Content-Type`, `Authorization`

#### Production Mode
- **Origin**: Configured via `FRONTEND_URL` environment variable
- **Multiple Origins**: Comma-separated URLs (e.g., `https://app.example.com,https://admin.example.com`)
- **Fallback**: No origins allowed if `FRONTEND_URL` is not set

#### Environment Configuration

```bash
# Production CORS configuration
FRONTEND_URL=https://yourfrontend.com,https://youradmin.com

# Development - no configuration needed (allows all origins)
```

### Rate Limiting

The API implements multiple layers of rate limiting to prevent abuse and ensure fair usage:

#### Global Rate Limits

All endpoints are protected with multiple rate limiting tiers:

- **Short Term**: 3 requests per second
- **Medium Term**: 20 requests per 10 seconds  
- **Long Term**: 100 requests per minute

#### Endpoint-Specific Limits

Sensitive endpoints have additional restrictions:

| Endpoint                  | Limit      | Duration | Purpose                     |
| ------------------------- | ---------- | -------- | --------------------------- |
| `POST /api/v1/auth/login` | 3 requests | 1 minute | Prevent brute force attacks |
| `POST /api/v1/users`      | 2 requests | 1 minute | Prevent spam registrations  |

#### Rate Limit Headers

When rate limits are exceeded, the API returns:

- **Status Code**: `429 Too Many Requests`
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

#### Testing Rate Limits

You can test rate limiting by making rapid requests:

```bash
# Test global rate limit (should get 429 after 3 requests)
for i in {1..5}; do curl -w "\n%{http_code}\n" http://localhost:3000/api/v1/health; done

# Test login rate limit
for i in {1..5}; do 
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    -w "\n%{http_code}\n"
done
```

### Testing Security Headers

You can verify the security headers are working by making a request to any endpoint:

```bash
curl -I http://localhost:3000/api/v1/health
```

You should see headers like:
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 0
Referrer-Policy: no-referrer
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1674567890
```

## API Documentation

- **Swagger UI**: Available at `http://localhost:3000/api/v1/docs`
- **API Version**: v1
- **Base URL**: `http://localhost:3000/api/v1`

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run start:dev

# Build for production
pnpm run build
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Environment
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/social_app_db"

# Security
PASSWORD_PEPPER=your-strong-password-pepper-here
JWT_SECRET=your-jwt-secret-key-here

# Hash Configuration
HASH_MEMORY_COST=65536
HASH_TIME_COST=2
HASH_PARALLELISM=1

# CORS Configuration (Production only)
# Comma-separated list of allowed frontend URLs
FRONTEND_URL=https://yourfrontend.com,https://youradmin.com
```

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `PASSWORD_PEPPER`: Additional security layer for password hashing
- `JWT_SECRET`: Secret key for JWT token generation

### Optional Variables

- `NODE_ENV`: Environment mode (development/test/production)
- `PORT`: Server port (default: 3000)
- `HASH_*`: Argon2 password hashing configuration
- `FRONTEND_URL`: Allowed CORS origins for production (development allows all)
