# User HR Data Management API - Complete cURL Examples

This document provides comprehensive cURL examples for all user-specific HR data management APIs. All endpoints require JWT authentication.

## Base URL
```
http://localhost:3000/api/user/hr-extraction
```

## Authentication
All requests require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1. File Upload & Extraction

### Upload File and Extract HR Data
**POST** `/extract`

```bash
curl -X POST "http://localhost:3000/api/user/hr-extraction/extract" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@contacts.csv" \
  -F "extractionType=company_directory" \
  -F "source=company_contacts" \
  -F "description=HR contacts from company directory"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "people": [
      {
        "name": "John Doe",
        "email": "john.doe@company.com",
        "position": "Software Engineer",
        "company": "Tech Corp",
        "phone": "+1234567890",
        "location": "New York",
        "department": "Engineering",
        "linkedin": "https://linkedin.com/in/johndoe",
        "website": "https://johndoe.com",
        "additionalInfo": "Senior developer with 5 years experience"
      }
    ],
    "metadata": {
      "totalPeople": 1,
      "extractionType": "company_directory",
      "source": "contacts.csv",
      "processedAt": "2025-09-04T14:30:00.000Z",
      "confidence": 0.95,
      "batchId": "user-123-abc12345-def67890"
    }
  },
  "message": "HR data extracted successfully. 0 records already exist in master data, 1 are unique to you.",
  "processingTime": "5432ms",
  "userInfo": {
    "userId": 123,
    "userEmail": "user@example.com"
  },
  "statistics": {
    "duplicatesInMaster": 0,
    "uniqueToUser": 1
  }
}
```

---

## 2. Text Input Extraction

### Extract HR Data from Text
**POST** `/extract-text`

```bash
curl -X POST "http://localhost:3000/api/user/hr-extraction/extract-text" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "text": "John Doe, Software Engineer at Tech Corp, john.doe@company.com, +1234567890, New York",
    "source": "manual_input"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "people": [
      {
        "name": "John Doe",
        "email": "john.doe@company.com",
        "position": "Software Engineer",
        "company": "Tech Corp",
        "phone": "+1234567890",
        "location": "New York"
      }
    ],
    "metadata": {
      "totalPeople": 1,
      "extractionType": "general",
      "source": "manual_input",
      "processedAt": "2025-09-04T14:30:00.000Z",
      "confidence": 0.9,
      "batchId": "user-text-123-abc12345-def67890"
    }
  },
  "message": "HR data extracted successfully. 0 records already exist in master data, 1 are unique to you.",
  "processingTime": "1234ms",
  "userInfo": {
    "userId": 123,
    "userEmail": "user@example.com"
  },
  "statistics": {
    "duplicatesInMaster": 0,
    "uniqueToUser": 1
  }
}
```

---

## 3. List All HR Data

### Get All HR Records (Paginated)
**GET** `/data`

```bash
# Basic list
curl -X GET "http://localhost:3000/api/user/hr-extraction/data" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# With pagination and sorting
curl -X GET "http://localhost:3000/api/user/hr-extraction/data?limit=20&offset=0&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "people": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "John Doe",
        "email": "john.doe@company.com",
        "position": "Software Engineer",
        "company": "Tech Corp",
        "phone": "+1234567890",
        "location": "New York",
        "department": "Engineering",
        "linkedin": "https://linkedin.com/in/johndoe",
        "website": "https://johndoe.com",
        "additionalInfo": "Senior developer with 5 years experience",
        "isDuplicateInMaster": false,
        "masterDataId": null,
        "userNotes": "Great candidate for senior role",
        "userTags": ["senior", "backend", "nodejs"],
        "isPublic": true,
        "source": "contacts.csv",
        "extractionType": "company_directory",
        "confidence": 0.95,
        "status": "processed",
        "batchId": "user-123-abc12345-def67890",
        "createdAt": "2025-09-04T14:30:00.000Z",
        "updatedAt": "2025-09-04T14:30:00.000Z",
        "lastAccessedAt": "2025-09-04T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "pages": 3
    },
    "userId": 123,
    "userEmail": "user@example.com"
  },
  "message": "HR data retrieved successfully"
}
```

---

## 4. View Specific HR Record

### Get HR Data by ID
**GET** `/data/{id}`

```bash
curl -X GET "http://localhost:3000/api/user/hr-extraction/data/64f8a1b2c3d4e5f6a7b8c9d0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "John Doe",
    "email": "john.doe@company.com",
    "position": "Software Engineer",
    "company": "Tech Corp",
    "phone": "+1234567890",
    "location": "New York",
    "department": "Engineering",
    "linkedin": "https://linkedin.com/in/johndoe",
    "website": "https://johndoe.com",
    "additionalInfo": "Senior developer with 5 years experience",
    "isDuplicateInMaster": false,
    "masterDataId": null,
    "userNotes": "Great candidate for senior role",
    "userTags": ["senior", "backend", "nodejs"],
    "isPublic": true,
    "source": "contacts.csv",
    "extractionType": "company_directory",
    "confidence": 0.95,
    "status": "processed",
    "batchId": "user-123-abc12345-def67890",
    "createdAt": "2025-09-04T14:30:00.000Z",
    "updatedAt": "2025-09-04T14:30:00.000Z",
    "lastAccessedAt": "2025-09-04T14:30:00.000Z",
    "userId": 123,
    "userEmail": "user@example.com"
  },
  "message": "HR data retrieved successfully"
}
```

**Error Response (Not Found):**
```json
{
  "success": false,
  "message": "HR data not found or does not belong to you",
  "data": null
}
```

---

## 5. Create Manual HR Entry

### Add Manual HR Data
**POST** `/data/manual`

```bash
curl -X POST "http://localhost:3000/api/user/hr-extraction/data/manual" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@techcorp.com",
    "position": "Product Manager",
    "company": "Tech Corp",
    "phone": "+1987654321",
    "location": "San Francisco",
    "department": "Product",
    "linkedin": "https://linkedin.com/in/janesmith",
    "website": "https://janesmith.com",
    "additionalInfo": "Experienced product manager with 8 years in tech",
    "userNotes": "Met at conference, very interested in our company",
    "userTags": ["product", "senior", "conference"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "name": "Jane Smith",
    "email": "jane.smith@techcorp.com",
    "position": "Product Manager",
    "company": "Tech Corp",
    "phone": "+1987654321",
    "location": "San Francisco",
    "department": "Product",
    "linkedin": "https://linkedin.com/in/janesmith",
    "website": "https://janesmith.com",
    "additionalInfo": "Experienced product manager with 8 years in tech",
    "isDuplicateInMaster": false,
    "masterDataId": null,
    "userNotes": "Met at conference, very interested in our company",
    "userTags": ["product", "senior", "conference"],
    "isPublic": true,
    "source": "manual_entry",
    "extractionType": "manual",
    "confidence": 1.0,
    "status": "processed",
    "batchId": "manual-123-1693834200000",
    "createdAt": "2025-09-04T14:30:00.000Z",
    "updatedAt": "2025-09-04T14:30:00.000Z",
    "userId": 123,
    "userEmail": "user@example.com"
  },
  "message": "Manual HR data created successfully"
}
```

---

## 6. Update HR Record

### Edit/Update HR Data
**PUT** `/data/{id}`

```bash
curl -X PUT "http://localhost:3000/api/user/hr-extraction/data/64f8a1b2c3d4e5f6a7b8c9d0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "position": "Senior Software Engineer",
    "phone": "+1234567891",
    "userNotes": "Updated after phone interview - very interested",
    "userTags": ["senior", "backend", "nodejs", "interviewed"],
    "isPublic": false
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "John Doe Updated",
    "email": "john.doe@company.com",
    "position": "Senior Software Engineer",
    "company": "Tech Corp",
    "phone": "+1234567891",
    "location": "New York",
    "department": "Engineering",
    "linkedin": "https://linkedin.com/in/johndoe",
    "website": "https://johndoe.com",
    "additionalInfo": "Senior developer with 5 years experience",
    "isDuplicateInMaster": false,
    "masterDataId": null,
    "userNotes": "Updated after phone interview - very interested",
    "userTags": ["senior", "backend", "nodejs", "interviewed"],
    "isPublic": false,
    "source": "contacts.csv",
    "extractionType": "company_directory",
    "confidence": 0.95,
    "status": "processed",
    "batchId": "user-123-abc12345-def67890",
    "createdAt": "2025-09-04T14:30:00.000Z",
    "updatedAt": "2025-09-04T14:35:00.000Z",
    "lastAccessedAt": "2025-09-04T14:35:00.000Z",
    "userId": 123,
    "userEmail": "user@example.com"
  },
  "message": "HR data updated successfully"
}
```

---

## 7. Delete HR Record

### Delete Single HR Record
**DELETE** `/data/{id}`

```bash
curl -X DELETE "http://localhost:3000/api/user/hr-extraction/data/64f8a1b2c3d4e5f6a7b8c9d0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "userId": 123
  },
  "message": "HR data deleted successfully"
}
```

### Bulk Delete HR Records
**DELETE** `/data/bulk`

```bash
curl -X DELETE "http://localhost:3000/api/user/hr-extraction/data/bulk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [
      "64f8a1b2c3d4e5f6a7b8c9d0",
      "64f8a1b2c3d4e5f6a7b8c9d1",
      "64f8a1b2c3d4e5f6a7b8c9d2"
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 2,
    "failedIds": ["64f8a1b2c3d4e5f6a7b8c9d2"],
    "totalRequested": 3,
    "userId": 123
  },
  "message": "Successfully deleted 2 out of 3 records"
}
```

---

## 8. Search HR Data

### Search with Filters
**GET** `/search`

```bash
# Basic search
curl -X GET "http://localhost:3000/api/user/hr-extraction/search?search=engineer" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Advanced search with filters
curl -X GET "http://localhost:3000/api/user/hr-extraction/search?search=engineer&company=tech&position=senior&limit=10&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filter by duplicate status
curl -X GET "http://localhost:3000/api/user/hr-extraction/search?isDuplicateInMaster=false&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "people": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "John Doe",
        "email": "john.doe@company.com",
        "position": "Software Engineer",
        "company": "Tech Corp",
        "phone": "+1234567890",
        "location": "New York",
        "department": "Engineering",
        "linkedin": "https://linkedin.com/in/johndoe",
        "website": "https://johndoe.com",
        "additionalInfo": "Senior developer with 5 years experience",
        "isDuplicateInMaster": false,
        "masterDataId": null,
        "userNotes": "Great candidate for senior role",
        "userTags": ["senior", "backend", "nodejs"],
        "isPublic": true,
        "source": "contacts.csv",
        "extractionType": "company_directory",
        "confidence": 0.95,
        "status": "processed",
        "batchId": "user-123-abc12345-def67890",
        "createdAt": "2025-09-04T14:30:00.000Z",
        "updatedAt": "2025-09-04T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0
    },
    "userId": 123,
    "userEmail": "user@example.com"
  },
  "message": "Search completed successfully"
}
```

---

## 9. Get Statistics

### Get User HR Data Statistics
**GET** `/stats`

```bash
curl -X GET "http://localhost:3000/api/user/hr-extraction/stats" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRecords": 150,
    "processedRecords": 145,
    "pendingRecords": 3,
    "failedRecords": 2,
    "totalBatches": 12,
    "uniquePeople": 120,
    "duplicatesInMaster": 30,
    "recordsByType": {
      "general": 80,
      "business_card": 25,
      "resume": 20,
      "company_directory": 25
    },
    "recordsBySource": {
      "contacts.csv": 50,
      "manual_entry": 30,
      "business_cards.pdf": 70
    },
    "recentActivity": {
      "lastUpload": "2025-09-04T14:30:00.000Z",
      "lastProcessed": "2025-09-04T14:30:00.000Z"
    },
    "userId": 123,
    "userEmail": "user@example.com"
  },
  "message": "Statistics retrieved successfully"
}
```

---

## 10. Batch Operations

### Get Data by Batch
**GET** `/data/batch/{batchId}`

```bash
curl -X GET "http://localhost:3000/api/user/hr-extraction/data/batch/user-123-abc12345-def67890" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "people": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "John Doe",
        "email": "john.doe@company.com",
        "position": "Software Engineer",
        "company": "Tech Corp",
        "phone": "+1234567890",
        "location": "New York",
        "department": "Engineering",
        "linkedin": "https://linkedin.com/in/johndoe",
        "website": "https://johndoe.com",
        "additionalInfo": "Senior developer with 5 years experience",
        "isDuplicateInMaster": false,
        "masterDataId": null,
        "userNotes": "Great candidate for senior role",
        "userTags": ["senior", "backend", "nodejs"],
        "isPublic": true,
        "source": "contacts.csv",
        "extractionType": "company_directory",
        "confidence": 0.95,
        "status": "processed",
        "batchId": "user-123-abc12345-def67890",
        "createdAt": "2025-09-04T14:30:00.000Z",
        "updatedAt": "2025-09-04T14:30:00.000Z"
      }
    ],
    "metadata": {
      "totalPeople": 1,
      "batchId": "user-123-abc12345-def67890",
      "userId": 123,
      "userEmail": "user@example.com"
    }
  },
  "message": "HR data retrieved successfully"
}
```

### Delete Data by Batch
**DELETE** `/data/batch/{batchId}`

```bash
curl -X DELETE "http://localhost:3000/api/user/hr-extraction/data/batch/user-123-abc12345-def67890" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 5,
    "batchId": "user-123-abc12345-def67890",
    "userId": 123
  },
  "message": "Successfully deleted 5 records"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "No file provided",
  "error": "Bad Request"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Query Parameters Reference

### List Data (`GET /data`)
- `limit` (number): Number of records per page (default: 50)
- `offset` (number): Number of records to skip (default: 0)
- `sortBy` (string): Field to sort by (default: 'createdAt')
- `sortOrder` (string): Sort order - 'asc' or 'desc' (default: 'desc')

### Search Data (`GET /search`)
- `search` (string): Text search across name, email, position, company, department
- `company` (string): Filter by company name (case-insensitive)
- `position` (string): Filter by position (case-insensitive)
- `status` (string): Filter by status ('pending', 'processed', 'failed')
- `batchId` (string): Filter by batch ID
- `isDuplicateInMaster` (boolean): Filter by duplicate status in master data
- `limit` (number): Number of results per page (default: 50)
- `offset` (number): Number of results to skip (default: 0)

---

## Notes for Frontend Integration

1. **Authentication**: Always include the JWT token in the Authorization header
2. **Pagination**: Use `limit` and `offset` for pagination, check `total` and `pages` in response
3. **Error Handling**: Check the `success` field in responses and handle errors appropriately
4. **File Upload**: Use `multipart/form-data` for file uploads
5. **Content Type**: Use `application/json` for JSON requests
6. **User Isolation**: All data is automatically filtered by user ID from the JWT token
7. **Duplicate Checking**: Records are automatically checked for duplicates within user data and master data
8. **Batch IDs**: Use batch IDs to group related records from the same upload/source
