# Local Item Swap - API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication

All authenticated endpoints require a valid session cookie. Authentication is handled by NextAuth.

### Sign In
Handled via NextAuth providers. Access authentication at:
- Google OAuth: `/api/auth/signin`
- Email Magic Link: `/api/auth/signin`

Sessions are automatically managed via cookies.

---

## User Endpoints

### GET /api/users/me
Get the authenticated user's profile.

**Authentication:** Required

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "https://example.com/avatar.jpg",
  "image": "https://example.com/image.jpg",
  "bio": "I love swapping items!",
  "location_lat": 40.7128,
  "location_lng": -74.0060,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - User not found

---

### PATCH /api/users/me
Update the authenticated user's profile.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Jane Doe",
  "bio": "Updated bio",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "location_lat": 40.7580,
  "location_lng": -73.9855
}
```

**Allowed Fields:**
- `name` (string)
- `bio` (string)
- `avatar_url` (string)
- `location_lat` (float, -90 to 90)
- `location_lng` (float, -180 to 180)

**Response:**
```json
{
  "id": "uuid",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "bio": "Updated bio",
  "location_lat": 40.7580,
  "location_lng": -73.9855,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (bad field values)
- `401` - Unauthorized

---

## Item Endpoints

### GET /api/items
List all available items with optional filtering.

**Authentication:** Not required

**Query Parameters:**
- `category` (string, optional) - Filter by category
- `condition` (enum, optional) - Filter by condition: `new`, `good`, or `worn`
- `distance` (number, optional) - Distance filter in km (stub implementation)

**Examples:**
```
GET /api/items
GET /api/items?category=electronics
GET /api/items?condition=new
GET /api/items?category=books&condition=good
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "iPhone 13",
    "description": "Barely used iPhone 13 in great condition",
    "category": "electronics",
    "condition": "good",
    "is_available": true,
    "created_at": "2024-01-20T14:00:00Z",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  }
]
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### POST /api/items
Create a new item listing.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "iPhone 13",
  "description": "Barely used iPhone 13 in great condition",
  "category": "electronics",
  "condition": "good"
}
```

**Required Fields:**
- `title` (string)
- `description` (string)
- `category` (string)
- `condition` (enum: `new`, `good`, or `worn`)

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "iPhone 13",
  "description": "Barely used iPhone 13 in great condition",
  "category": "electronics",
  "condition": "good",
  "is_available": true,
  "created_at": "2024-01-20T14:00:00Z",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  }
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid request (missing fields or invalid condition)
- `401` - Unauthorized

---

### GET /api/items/:id
Get details of a specific item.

**Authentication:** Not required

**URL Parameters:**
- `id` (uuid) - Item ID

**Example:**
```
GET /api/items/123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "iPhone 13",
  "description": "Barely used iPhone 13 in great condition",
  "category": "electronics",
  "condition": "good",
  "is_available": true,
  "created_at": "2024-01-20T14:00:00Z",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "I love tech!"
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Item not found
- `500` - Server error

---

### DELETE /api/items/:id
Delete an item (only by owner).

**Authentication:** Required

**URL Parameters:**
- `id` (uuid) - Item ID

**Example:**
```
DELETE /api/items/123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "message": "Item deleted successfully"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not the owner)
- `404` - Item not found

---

## Swap Request Endpoints

### POST /api/swaps
Create a new swap request.

**Authentication:** Required

**Request Body:**
```json
{
  "offered_item_ids": ["uuid1", "uuid2"],
  "requested_item_ids": ["uuid3"]
}
```

**Fields:**
- `offered_item_ids` (array of UUIDs) - Items you're offering
- `requested_item_ids` (array of UUIDs) - Items you want

**Validation:**
- At least one item must be specified
- Offered items must belong to you and be available
- Requested items must exist, be available, and not belong to you

**Response:**
```json
{
  "id": "uuid",
  "requester_id": "uuid",
  "status": "pending",
  "created_at": "2024-01-21T10:00:00Z",
  "requester": {
    "id": "uuid",
    "name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  },
  "swapItems": [
    {
      "id": "uuid",
      "swap_request_id": "uuid",
      "item_id": "uuid1",
      "type": "offered",
      "item": { /* full item object */ }
    },
    {
      "id": "uuid",
      "swap_request_id": "uuid",
      "item_id": "uuid3",
      "type": "requested",
      "item": { /* full item object */ }
    }
  ]
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid request (validation failed)
- `401` - Unauthorized
- `403` - Forbidden (not your items)
- `404` - Items not found

---

### PATCH /api/swaps/:id
Update a swap request status.

**Authentication:** Required

**URL Parameters:**
- `id` (uuid) - Swap request ID

**Request Body:**
```json
{
  "status": "accepted"
}
```

**Status Values:**
- `pending` - Initial state
- `accepted` - Swap approved (only recipient can set)
- `rejected` - Swap declined (requester or recipient)

**Authorization:**
- Only the requester or recipient can modify
- Only the recipient (owner of requested items) can accept
- When accepted, all involved items are marked unavailable

**Response:**
```json
{
  "id": "uuid",
  "requester_id": "uuid",
  "status": "accepted",
  "created_at": "2024-01-21T10:00:00Z",
  "requester": { /* user object */ },
  "swapItems": [ /* swap items with full item details */ ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid status value
- `401` - Unauthorized
- `403` - Forbidden (not authorized to change status)
- `404` - Swap request not found

---

### GET /api/swaps/my
Get all swap requests involving the authenticated user.

**Authentication:** Required

**Response:**
```json
{
  "sent": [
    {
      "id": "uuid",
      "requester_id": "uuid",
      "status": "pending",
      "created_at": "2024-01-21T10:00:00Z",
      "requester": { /* user object */ },
      "swapItems": [ /* swap items */ ]
    }
  ],
  "received": [
    {
      "id": "uuid",
      "requester_id": "uuid",
      "status": "pending",
      "created_at": "2024-01-21T09:00:00Z",
      "requester": { /* user object */ },
      "swapItems": [ /* swap items */ ]
    }
  ]
}
```

**Fields:**
- `sent` - Swaps initiated by you
- `received` - Swaps where someone wants your items

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but not allowed)
- `404` - Not Found
- `500` - Internal Server Error

---

## Data Models

### Item Conditions
- `new` - Brand new item
- `good` - Gently used, good condition
- `worn` - Used, shows signs of wear

### Swap Statuses
- `pending` - Awaiting response
- `accepted` - Approved by recipient
- `rejected` - Declined

### Swap Item Types
- `offered` - Items being offered by requester
- `requested` - Items being requested by requester
