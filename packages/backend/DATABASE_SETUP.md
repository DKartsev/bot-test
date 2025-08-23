# Database Setup and Migration Guide

## Overview

This guide covers setting up the PostgreSQL database for the support backend system, including schema creation, data seeding, and running migrations.

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ and npm
- Access to create databases and users

## Database Configuration

### Environment Variables

Create a `.env` file in the backend package root with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/support_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=support_db
DB_USER=postgres
DB_PASSWORD=your_password

# Alternative: Use individual variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=support_db
DB_USER=postgres
DB_PASSWORD=your_password
```

**Note**: `DATABASE_URL` takes precedence over individual variables.

### Database Creation

1. Connect to PostgreSQL as superuser:
```bash
psql -U postgres
```

2. Create database and user:
```sql
CREATE DATABASE support_db;
CREATE USER support_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE support_db TO support_user;
```

## Running Migrations

### Automatic Migration

The system includes an automatic migration runner that:
- Creates a `migrations` table to track executed migrations
- Executes SQL files in alphabetical order
- Prevents duplicate execution of migrations
- Provides detailed logging

### Running Migrations

#### Development (with ts-node):
```bash
npm run migrate
```

#### Production (compiled):
```bash
npm run migrate:build
```

### Migration Files

Migrations are located in `src/database/migrations/`:

- `001_initial_schema.sql` - Core database schema
- `002_seed_data.sql` - Initial data population

## Database Schema

### Core Tables

#### Users
- `id` - Primary key
- `telegram_id` - Telegram user ID
- `username` - Telegram username
- `first_name`, `last_name` - User names
- `balance` - User balance
- `deals_count` - Number of completed deals
- `flags` - Array of user flags
- `is_blocked`, `is_verified` - Status flags

#### Chats
- `id` - Primary key
- `user_id` - Reference to user
- `status` - Chat status (waiting, in_progress, closed, waiting_for_operator)
- `priority` - Priority level (low, medium, high, urgent)
- `source` - Chat source (telegram, website, p2p)
- `operator_id` - Assigned operator
- `tags` - Array of chat tags
- `escalation_reason` - Reason for escalation

#### Messages
- `id` - Primary key
- `chat_id` - Reference to chat
- `author_type` - Message author (user, operator, bot)
- `author_id` - Author ID
- `text` - Message content
- `timestamp` - Message timestamp
- `is_read` - Read status
- `metadata` - Additional message data

#### Operators
- `id` - Primary key
- `name` - Operator name
- `email` - Operator email
- `role` - Role (operator, senior_operator, admin)
- `is_active` - Active status
- `max_chats` - Maximum concurrent chats

### Additional Tables

- `attachments` - File attachments
- `notes` - Operator notes
- `cases` - Support cases
- `canned_responses` - Predefined responses

## Data Seeding

The `002_seed_data.sql` migration includes:

- Sample operators (admin, senior, regular)
- Sample users for testing
- Sample chats and messages
- Canned responses and templates

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check PostgreSQL service status
   - Verify host/port configuration
   - Check firewall settings

2. **Authentication Failed**
   - Verify username/password
   - Check user permissions
   - Ensure database exists

3. **Migration Errors**
   - Check PostgreSQL version compatibility
   - Verify SQL syntax
   - Check for conflicting table names

### Debug Mode

Enable detailed logging by setting:
```bash
LOG_LEVEL=debug
```

### Manual Migration

If automatic migration fails, you can run SQL files manually:

```bash
psql -U username -d support_db -f src/database/migrations/001_initial_schema.sql
psql -U username -d support_db -f src/database/migrations/002_seed_data.sql
```

## Backup and Recovery

### Creating Backup
```bash
pg_dump -U username -d support_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restoring Backup
```bash
psql -U username -d support_db < backup_file.sql
```

## Performance Considerations

- Indexes are created on frequently queried columns
- Connection pooling is configured for optimal performance
- Consider adding additional indexes based on query patterns

## Security Notes

- Use strong passwords for database users
- Limit database access to necessary hosts only
- Regularly update PostgreSQL security patches
- Consider using SSL connections in production

## Next Steps

After successful database setup:

1. Start the backend service: `npm run dev`
2. Verify API endpoints respond correctly
3. Test WebSocket connections
4. Configure Telegram bot webhook
5. Test escalation logic with sample data
