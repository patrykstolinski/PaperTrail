# Unified Search API Documentation

## Endpoint
**GET** `/api/search`

## Authentication
Required: `X-Dev-User-Id: <userId>` (dev mode) or `Authorization: Bearer <token>` (production)

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | - | Search query (searches titles, tags, filenames, extractedFields, folder names, descriptions, slugs) |
| `type` | string | `all` | Filter by type: `all`, `documents`, `folders` |
| `tags` | string | - | Comma-separated tags for document filtering (AND logic) |
| `folderId` | ObjectId | - | Filter documents by folder |
| `page` | number | `1` | Page number for pagination |
| `pageSize` | number | `20` | Items per page |

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "_id": "68fb7cdb2a3927fe180f4058",
        "originalFileName": "Screenshot 2025-08-04 112958.png",
        "fileType": "image/png",
        "fileSize": 12214,
        "title": "Zustand Testing",
        "archived": false,
        "tags": [],
        "userId": "650000000000000000000001",
        "status": "uploaded",
        "folderId": null,
        "pages": [...],
        "reminders": [],
        "createdAt": "2025-10-24T13:19:23.739Z",
        "updatedAt": "2025-10-24T19:37:30.127Z"
      }
    ],
    "folders": [
      {
        "_id": "68f9f8ef08977bbd7666ab12",
        "name": "Medical Invoices",
        "slug": "medical-invoices",
        "description": "All medical-related invoices",
        "color": "#FF5733",
        "documentCount": 5,
        "createdAt": "2025-10-20T...",
        "updatedAt": "2025-10-20T..."
      }
    ]
  },
  "meta": {
    "totalDocuments": 1,
    "totalFolders": 0,
    "totalCount": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

## How To Use

### Basic Search - Find Documents by Title

Search for documents with "Zustand" in the title:

```bash
GET /api/search?q=Zustand
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Returns:** Documents with titles matching "Zustand" (case-insensitive)
- ✅ Matches: "Zustand Testing", "zustand Store", "My Zustand App"

### Search by Filename

Search for documents by original filename:

```bash
GET /api/search?q=Screenshot
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Returns:** Documents with filenames containing "Screenshot"
- ✅ Matches: "Screenshot 2025-08-04 112958.png", "Screenshot 2025-09-15 093807.png"

### Search by Tags

Search for documents with specific tags (AND logic):

```bash
GET /api/search?tags=erejkhrfesd,dsfdgfd
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Returns:** Documents that have BOTH tags
- ✅ Document must have tag "erejkhrfesd" AND "dsfdgfd,"

### Search ExtractedFields

Search for documents by OCR-extracted field keys or values:

```bash
# Find documents with "Kunden-Nr" field
GET /api/search?q=Kunden-Nr
Headers: X-Dev-User-Id: 650000000000000000000001

# Find documents where any field contains "ewqewqeqw"
GET /api/search?q=ewqewqeqw
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Returns:** Documents where extractedFields contain the search term
- ✅ Matches field names: `{ "Kunden-Nr": "123" }`
- ✅ Matches field values: `{ "Kunden-Nr": "ewqewqeqw" }`

Example document with extractedFields:
```json
{
  "_id": "68fb2e300926481d80333bb1",
  "title": "Präsentation Blabla",
  "extractedFields": {
    "Kunden-Nr": "ewqewqeqw",
    "Rechnungs-Nr": "ewqe",
    "Datum": "grztrzt"
  }
}
```

### Search Only Documents (No Folders)

```bash
GET /api/search?q=test&type=documents
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Returns:** Only documents matching "test", no folders
- `data.documents` = array of matching documents
- `data.folders` = empty array `[]`

### Search Only Folders (No Documents)

```bash
GET /api/search?type=folders&q=medical
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Returns:** Only folders matching "medical" in name, description, or slug
- `data.documents` = empty array `[]`
- `data.folders` = array of matching folders with `documentCount`

### Search Documents in Specific Folder

```bash
GET /api/search?folderId=68f9f8ef08977bbd7666ab12&q=invoice
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Returns:** Only documents inside folder `68f9f8ef08977bbd7666ab12` that match "invoice"

### Pagination

```bash
# First page (default)
GET /api/search?q=test&page=1&pageSize=5
Headers: X-Dev-User-Id: 650000000000000000000001

# Second page
GET /api/search?q=test&page=2&pageSize=5
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Response meta:**
```json
{
  "meta": {
    "totalDocuments": 14,
    "totalFolders": 0,
    "totalCount": 14,
    "page": 2,
    "pageSize": 5,
    "totalPages": 3
  }
}
```

### Combined Search (All + Pagination)

Search everything (documents AND folders) with pagination:

```bash
GET /api/search?q=test&page=1&pageSize=20
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Returns:** Both documents and folders sorted by `createdAt` (newest first), paginated across combined results.

## Search Behavior

### Type: `all` (default)
- Searches **both** documents and folders
- Combines results and sorts by `createdAt` (most recent first)
- Applies pagination to **combined** results
- Returns both document and folder arrays in response

### Type: `documents`
- Searches **only** documents
- Applies pagination to documents only
- `meta.totalCount` = `meta.totalDocuments`
- `data.folders` will be empty array

### Type: `folders`
- Searches **only** folders
- Applies pagination to folders only
- `meta.totalCount` = `meta.totalFolders`
- `data.documents` will be empty array

## What Fields Are Searched?

### Documents
The `q` parameter searches across:
- **title** (regex, case-insensitive) - e.g., "Zustand Testing"
- **tags** (array elements, regex, case-insensitive) - e.g., `["erejkhrfesd", "dsfdgfd,"]`
- **originalFileName** (regex, case-insensitive) - e.g., "Screenshot 2025-08-04 112958.png"
- **extractedFields** keys AND values (regex, case-insensitive) - e.g., `{"Kunden-Nr": "ewqewqeqw"}`

**Note:** Search uses regex pattern matching for flexibility. Provides predictable substring matching and works seamlessly with the extractedFields dynamic schema.

### Folders
The `q` parameter searches across:
- **name** (regex, case-insensitive) - e.g., "Medical Invoices"
- **description** (regex, case-insensitive)
- **slug** (regex, case-insensitive) - e.g., "medical-invoices"

Each folder result includes `documentCount` (total documents in folder).

## Real-World Examples

### Example 1: Find All Screenshots

```bash
GET /api/search?q=Screenshot
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Matches:**
- "Screenshot 2025-08-04 112958.png"
- "Screenshot 2025-09-15 093807.png"
- "Screenshot 2025-10-07 163855.png"

### Example 2: Find Documents with Reminders

```bash
# Search for documents mentioning specific dates or messages
GET /api/search?q=2025-10-31
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Note:** Reminder dates/messages are NOT currently searchable (not in search scope). Only title, tags, filename, extractedFields are searched.

### Example 3: Find Documents by File Type

```bash
# Find all PDFs
GET /api/search?q=.pdf
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Matches:** Documents with ".pdf" in originalFileName
- "Flyer_Arbeitsvermittler.pdf"
- "Frau Olga Pogiaridou.pdf"
- "Kostenvoranschlag 2509104 Malerarbeiten im Bad.pdf"

### Example 4: Find Documents with Specific Tag

```bash
GET /api/search?tags=455555
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Returns:** Documents that have tag "455555"
- Document "Testing testing" with tags `["455555"]`

### Example 5: Search ExtractedFields for Invoice Number

```bash
GET /api/search?q=ewqe
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Matches:**
- Document with `extractedFields: { "Rechnungs-Nr": "ewqe" }`
- Also matches field value: `{ "Kunden-Nr": "ewqewqeqw" }` (contains "ewqe")

## Performance Notes

- **Regex Search**: Uses case-insensitive regex for all text fields → Predictable substring matching
- **ExtractedFields Search**: Uses `$objectToArray` aggregation with regex → Handles dynamic schema
- **Pagination**: Applied after combining results when `type=all`
- **Document Count**: Folders include real-time document count via aggregation
- **Optimization**: All searches use aggregation pipelines for consistency. For very large datasets (100k+ documents), consider adding compound indexes or implementing Elasticsearch.

## Frontend Integration Example

```javascript
// Search everything
const response = await fetch('/api/search?q=Zustand&page=1&pageSize=20', {
  headers: {
    'X-Dev-User-Id': '650000000000000000000001'
  }
});

const { success, data, meta } = await response.json();

if (success) {
  // Render documents
  data.documents.forEach(doc => {
    console.log(`Document: ${doc.title} (${doc.originalFileName})`);
  });

  // Render folders
  data.folders.forEach(folder => {
    console.log(`Folder: ${folder.name} (${folder.documentCount} docs)`);
  });

  // Pagination info
  console.log(`Showing page ${meta.page} of ${meta.totalPages}`);
  console.log(`Total results: ${meta.totalCount}`);
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Missing authenticated user"
}
```

**Cause:** Missing `X-Dev-User-Id` header or invalid JWT token.

**Fix:** Add header: `X-Dev-User-Id: 650000000000000000000001`

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Error message details"
}
```

**Cause:** Server-side error (check server logs for details)

## Migration from Separate Endpoints

### Old (Separate Searches)
```javascript
// Required 2 API calls
const docs = await fetch('/api/documents/search?q=invoice');
const folders = await fetch('/api/folders/search?q=invoice');
// Merge results client-side
```

### New (Unified Search)
```javascript
// Single API call
const results = await fetch('/api/search?q=invoice&type=all');
// Results.data.documents and results.data.folders already combined
```
