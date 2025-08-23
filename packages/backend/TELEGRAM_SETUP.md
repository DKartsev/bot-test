# Telegram Bot Setup Guide

## Overview

This guide covers setting up the Telegram bot integration for the support system, including bot creation, webhook configuration, and testing.

## Prerequisites

- Telegram account
- Node.js backend running
- PostgreSQL database with migrations applied
- Public HTTPS URL (for production) or ngrok (for development)

## Step 1: Create Telegram Bot

1. **Start a chat with @BotFather** on Telegram
2. **Send `/newbot`** command
3. **Choose a name** for your bot (e.g., "Support Bot")
4. **Choose a username** (must end with 'bot', e.g., "my_support_bot")
5. **Save the bot token** - you'll need it for configuration

## Step 2: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TG_WEBHOOK_PATH=/telegram/webhook
TELEGRAM_SET_WEBHOOK_ON_START=true

# Server Configuration
PUBLIC_URL=https://your-domain.com  # For production
# or
PUBLIC_URL=http://localhost:3000    # For development
```

## Step 3: Database Setup

Ensure your database is running and migrations are applied:

```bash
npm run migrate
```

## Step 4: Start Backend Service

```bash
npm run dev
```

## Step 5: Configure Webhook

### Option A: Automatic Setup (Recommended)

```bash
npm run setup-telegram
```

### Option B: Manual Setup

1. **For Development (using ngrok):**
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # Start ngrok tunnel
   ngrok http 3000
   
   # Use the HTTPS URL from ngrok output
   ```

2. **Set webhook manually:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://your-ngrok-url.ngrok.io/telegram/webhook"}'
   ```

## Step 6: Test Bot Integration

1. **Send a message** to your bot on Telegram
2. **Check backend logs** for incoming message processing
3. **Verify database** - check if user and chat records are created

## Webhook Endpoints

### POST `/telegram/webhook`
Receives updates from Telegram Bot API.

**Supported update types:**
- `message` - New messages
- `edited_message` - Edited messages
- `channel_post` - Channel posts
- `edited_channel_post` - Edited channel posts
- `callback_query` - Inline button callbacks

### GET `/telegram/bot-info`
Returns information about the bot.

### POST `/telegram/set-webhook`
Manually set webhook URL.

### DELETE `/telegram/webhook`
Remove webhook configuration.

### POST `/telegram/send-message`
Send message to specific chat.

## Message Processing Flow

1. **User sends message** to bot on Telegram
2. **Telegram sends webhook** to `/telegram/webhook`
3. **Backend processes message:**
   - Creates/updates user record
   - Creates/updates chat record
   - Saves message to database
   - Checks for escalation triggers
   - Assigns to operator if needed
4. **Response sent back** to user (if auto-response enabled)

## Escalation Logic

Messages are automatically escalated to operators when:

- **Keywords detected:** "оператор", "жалоба", "проблема", etc.
- **Message count threshold:** 5+ messages from user
- **Manual escalation:** Operator can escalate any chat

## Testing

### 1. Basic Functionality
```bash
# Test bot info endpoint
curl http://localhost:3000/telegram/bot-info

# Test webhook setup
curl -X POST http://localhost:3000/telegram/set-webhook \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-url.com/telegram/webhook"}'
```

### 2. Message Processing
1. Send message to bot on Telegram
2. Check backend console logs
3. Verify database records created
4. Check operator panel for new chat

### 3. WebSocket Updates
1. Open operator panel in browser
2. Send message to bot
3. Verify real-time updates appear

## Troubleshooting

### Common Issues

1. **Webhook not receiving updates:**
   - Check if webhook URL is accessible
   - Verify bot token is correct
   - Check backend logs for errors

2. **Database connection errors:**
   - Ensure PostgreSQL is running
   - Check database credentials
   - Verify migrations are applied

3. **Messages not being processed:**
   - Check TelegramService logs
   - Verify repository methods exist
   - Check database schema

### Debug Mode

Enable detailed logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Webhook Verification

Check webhook status:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Production Considerations

1. **HTTPS Required:** Telegram requires HTTPS for webhooks
2. **SSL Certificate:** Ensure valid SSL certificate
3. **Rate Limiting:** Implement rate limiting for webhook endpoints
4. **Error Handling:** Robust error handling and logging
5. **Monitoring:** Set up monitoring for webhook health

## Security Notes

1. **Bot Token:** Keep bot token secure, never commit to version control
2. **Webhook Validation:** Consider implementing webhook signature validation
3. **Access Control:** Restrict webhook endpoints if needed
4. **Input Validation:** Validate all incoming webhook data

## Next Steps

After successful setup:

1. **Test message flow** end-to-end
2. **Configure auto-responses** for common queries
3. **Set up operator notifications** for new chats
4. **Implement advanced features** like inline keyboards
5. **Monitor performance** and optimize as needed
