# Wix Webhook Setup Guide

This document explains how to configure Wix webhooks to sync real-time events (bookings, contacts, members) to Sparkwave.

## Webhook URL

```
https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/wix-webhook
```

## Supported Event Types

The webhook handler processes these Wix events:

| Event Type | Action | Pipeline Stage |
|------------|--------|----------------|
| `contact/created` | Creates new contact | `new` |
| `contact/updated` | Updates existing contact | (unchanged) |
| `booking/created` | Creates/updates contact | `booked_class` |
| `booking/confirmed` | Creates/updates contact | `booked_class` |
| `member/created` | Creates/updates contact | `member` |
| Form submissions | Creates/updates contact | `new` |

## Configuring Webhooks in Wix Dashboard

1. **Go to Wix Developer Center**
   - Visit: https://dev.wix.com/
   - Select your site (Fight Flow Academy)

2. **Navigate to Webhooks**
   - Go to: Site Settings → Webhooks
   - Or: https://manage.wix.com/account/site-selector?actionUrl=https%3A%2F%2Fwww.wix.com%2Fmy-account%2Fsite%2F%7BmetaSiteId%7D%2Fwebhooks

3. **Add New Webhook**

   For each event type you want to sync:

   **Contact Created:**
   - Event: `Contact Created` (Contacts API)
   - URL: `https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/wix-webhook`
   
   **Contact Updated:**
   - Event: `Contact Updated` (Contacts API)
   - URL: `https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/wix-webhook`
   
   **Booking Created:**
   - Event: `Booking Created` (Bookings API)
   - URL: `https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/wix-webhook`
   
   **Booking Confirmed:**
   - Event: `Booking Confirmed` (Bookings API)
   - URL: `https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/wix-webhook`
   
   **Member Created:**
   - Event: `Member Created` (Members API)
   - URL: `https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/wix-webhook`

4. **Recommended: Enable Form Submission Webhooks**
   - Event: `Form Submission` (Wix Forms)
   - URL: `https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/wix-webhook`

## Testing the Webhook

Test with curl:

```bash
curl -X POST "https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/wix-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "contact/created",
    "instanceId": "your-wix-instance-id",
    "timestamp": "2026-02-05T12:00:00Z",
    "data": {
      "id": "wix-contact-123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "555-123-4567"
    }
  }'
```

Expected response:
```json
{
  "status": "success",
  "contact_id": "uuid-here",
  "is_new": true,
  "event_type": "contact/created"
}
```

## How Contact Matching Works

The webhook uses intelligent deduplication:

1. **First tries to match by email** (case-insensitive) within Fight Flow business
2. **Then tries to match by phone** (normalized to E.164 format)
3. **Then tries to match by Wix contact ID** stored in metadata
4. **If no match found**, creates a new contact

This ensures we don't create duplicate contacts when the same person appears in multiple Wix events.

## Monitoring

- **Function Logs**: View in Supabase Dashboard → Edge Functions → wix-webhook → Logs
- **Activity Feed**: All events are logged to `mc_activities` table and visible in Mission Control
- **Dashboard URL**: https://supabase.com/dashboard/project/wrsoacujxcskydlzgopa/functions/wix-webhook

## Troubleshooting

**Webhook returns 200 but contact not created:**
- Check if the payload contains identifiable info (email, phone, or wixContactId)
- View function logs for details

**Duplicate contacts appearing:**
- The webhook deduplicates by email and phone
- Check if contacts have different email/phone combinations

**Wix shows webhook failures:**
- Verify the webhook URL is correct
- Check Supabase function logs for errors
- The function always returns 200 to prevent Wix retry storms

## Configuration

The webhook is hardcoded to use Fight Flow's business ID:
```
456dc53b-d9d9-41b0-bc33-4f4c4a791eff
```

To support multiple businesses, modify the function to extract the business ID from the Wix instance ID.

## Payload Examples

### Contact Created (Wix Contacts API)
```json
{
  "eventType": "contact/created",
  "instanceId": "4bef8d9b-4a79-4253-b76c-0714a99fed62",
  "data": {
    "id": "abc123",
    "firstName": "Jane",
    "lastName": "Smith",
    "emails": [{"email": "jane@example.com"}],
    "phones": [{"phone": "555-555-5555"}]
  }
}
```

### Booking Confirmed (Wix Bookings API)
```json
{
  "eventType": "booking/confirmed",
  "instanceId": "4bef8d9b-4a79-4253-b76c-0714a99fed62",
  "data": {
    "contactDetails": {
      "firstName": "Bob",
      "lastName": "Johnson",
      "email": "bob@example.com",
      "phone": "555-123-4567",
      "contactId": "wix-contact-456"
    },
    "bookedResources": [...],
    "startDate": "2026-02-10T10:00:00Z"
  }
}
```

### Member Created (Wix Members API)
```json
{
  "eventType": "member/created",
  "instanceId": "4bef8d9b-4a79-4253-b76c-0714a99fed62",
  "data": {
    "member": {
      "id": "member-789",
      "loginEmail": "member@example.com"
    },
    "contact": {
      "firstName": "New",
      "lastName": "Member",
      "contactId": "wix-contact-789"
    }
  }
}
```
