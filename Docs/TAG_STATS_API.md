# Tag Statistics API

## Endpoint
**GET** `/api/documents/tags/stats`

## Purpose
Returns aggregated tag statistics across all user's documents. Shows the most frequently used tags with their occurrence counts. Useful for:
- Displaying popular tags to users
- Creating clickable tag filter buttons
- Tag cloud visualization
- Understanding document categorization

## Authentication
Required: `X-Dev-User-Id: <userId>` (dev mode) or `Authorization: Bearer <token>` (production)

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | `10` | Maximum number of tags to return (top N by count) |

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "tag": "erejkhrfesd",
      "count": 3
    },
    {
      "tag": "455555",
      "count": 1
    },
    {
      "tag": "dsfdgfd,",
      "count": 1
    },
    {
      "tag": "fghgfhgf",
      "count": 1
    },
    {
      "tag": "hgfhgf",
      "count": 1
    }
  ]
}
```

## How It Works

**Backend Aggregation Pipeline:**
1. Filters documents by authenticated user
2. Unwinds tags array (creates one document per tag)
3. Filters out empty/null tags
4. Groups by tag name and counts occurrences
5. Sorts by count descending
6. Limits to top N tags
7. Formats output as `{ tag, count }`

## Usage Examples

### Get Top 10 Tags (Default)
```bash
GET /api/documents/tags/stats
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "tag": "Invoice", "count": 25 },
    { "tag": "2025", "count": 18 },
    { "tag": "Medical", "count": 12 },
    { "tag": "Important", "count": 8 },
    { "tag": "Contract", "count": 5 }
  ]
}
```

### Get Top 5 Tags
```bash
GET /api/documents/tags/stats?limit=5
Headers: X-Dev-User-Id: 650000000000000000000001
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "tag": "erejkhrfesd", "count": 3 },
    { "tag": "455555", "count": 1 },
    { "tag": "dsfdgfd,", "count": 1 },
    { "tag": "fghgfhgf", "count": 1 },
    { "tag": "hgfhgf", "count": 1 }
  ]
}
```

### Get Top 20 Tags
```bash
GET /api/documents/tags/stats?limit=20
Headers: X-Dev-User-Id: 650000000000000000000001
```

## Frontend Integration

### Example 1: Display Top Tags as Buttons

```javascript
import { useEffect, useState } from 'react';

function TagFilterPanel() {
  const [topTags, setTopTags] = useState([]);
  const userId = '650000000000000000000001';

  // Fetch top tags on component mount
  useEffect(() => {
    fetch('/api/documents/tags/stats?limit=5', {
      headers: { 'X-Dev-User-Id': userId }
    })
      .then(r => r.json())
      .then(({ data }) => setTopTags(data))
      .catch(err => console.error('Error fetching tags:', err));
  }, []);

  // Filter documents by tag
  const handleTagClick = async (tag) => {
    const response = await fetch(
      `/api/search?tags=${encodeURIComponent(tag)}&type=documents`,
      { headers: { 'X-Dev-User-Id': userId } }
    );
    const { data } = await response.json();
    // Update your document list with data.documents
    console.log(`Documents with tag "${tag}":`, data.documents);
  };

  return (
    <div className="tag-panel">
      <h3>Popular Tags</h3>
      <div className="tag-buttons">
        {topTags.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className="tag-button"
          >
            {tag} ({count})
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Example 2: Tag Cloud Visualization

```javascript
function TagCloud() {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    fetch('/api/documents/tags/stats?limit=20', {
      headers: { 'X-Dev-User-Id': userId }
    })
      .then(r => r.json())
      .then(({ data }) => setTags(data));
  }, []);

  // Calculate font size based on count
  const getFontSize = (count, maxCount) => {
    const minSize = 12;
    const maxSize = 32;
    return minSize + ((count / maxCount) * (maxSize - minSize));
  };

  const maxCount = Math.max(...tags.map(t => t.count));

  return (
    <div className="tag-cloud">
      {tags.map(({ tag, count }) => (
        <span
          key={tag}
          style={{ fontSize: `${getFontSize(count, maxCount)}px` }}
          onClick={() => handleTagClick(tag)}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
```

### Example 3: Multi-Tag Selection

```javascript
function TagFilter() {
  const [topTags, setTopTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Fetch top tags
  useEffect(() => {
    fetch('/api/documents/tags/stats?limit=10', {
      headers: { 'X-Dev-User-Id': userId }
    })
      .then(r => r.json())
      .then(({ data }) => setTopTags(data));
  }, []);

  // Toggle tag selection
  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Fetch documents when selected tags change
  useEffect(() => {
    if (selectedTags.length > 0) {
      const tagsParam = selectedTags.join(',');
      fetch(`/api/search?tags=${encodeURIComponent(tagsParam)}&type=documents`, {
        headers: { 'X-Dev-User-Id': userId }
      })
        .then(r => r.json())
        .then(({ data }) => setDocuments(data.documents));
    } else {
      // No tags selected - show all documents
      fetch('/api/documents', {
        headers: { 'X-Dev-User-Id': userId }
      })
        .then(r => r.json())
        .then(({ data }) => setDocuments(data));
    }
  }, [selectedTags]);

  return (
    <div>
      <div className="tag-filter">
        {topTags.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={selectedTags.includes(tag) ? 'active' : ''}
          >
            {tag} ({count})
          </button>
        ))}
      </div>
      
      <div className="document-list">
        <p>Showing {documents.length} documents</p>
        {documents.map(doc => (
          <div key={doc._id}>{doc.title}</div>
        ))}
      </div>
    </div>
  );
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

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Error message details"
}
```

**Cause:** Server-side aggregation error (check server logs).

## Technical Details

### Aggregation Pipeline
```javascript
[
  // Filter by user
  { $match: { userId: ownerObjectId } },
  
  // Unwind tags array (one doc per tag)
  { $unwind: "$tags" },
  
  // Filter out empty/null tags
  { $match: { tags: { $ne: null, $ne: "" } } },
  
  // Group by tag and count
  { $group: { _id: "$tags", count: { $sum: 1 } } },
  
  // Sort by count descending
  { $sort: { count: -1 } },
  
  // Limit to top N
  { $limit: 10 },
  
  // Format output
  { $project: { _id: 0, tag: "$_id", count: 1 } }
]
```

### Performance
- **Fast:** Uses MongoDB aggregation with indexes on userId
- **Scalable:** Handles thousands of documents efficiently
- **Global:** Returns stats across ALL user's documents (not paginated)

### Use Cases
1. **Tag Filter Buttons:** Display most popular tags, click to filter documents
2. **Tag Suggestions:** Show users their most-used tags when adding new documents
3. **Tag Cloud:** Visualize tag popularity
4. **Analytics:** Understand how users categorize their documents
5. **Tag Management:** Identify redundant or similar tags for cleanup

## Integration with Search API

Tag stats endpoint pairs perfectly with the unified search API:

```javascript
// 1. Get popular tags
const { data: tags } = await fetch('/api/documents/tags/stats?limit=5')
  .then(r => r.json());

// 2. User clicks a tag button
const selectedTag = tags[0].tag; // e.g., "Invoice"

// 3. Filter documents by that tag
const { data } = await fetch(`/api/search?tags=${selectedTag}&type=documents`)
  .then(r => r.json());

// 4. Display filtered documents
console.log(`Found ${data.documents.length} documents with tag "${selectedTag}"`);
```

## Comparison: Client-Side vs Server-Side Tag Stats

| Aspect | Client-Side (from loaded docs) | Server-Side (this endpoint) |
|--------|-------------------------------|----------------------------|
| **Accuracy** | Only current page | All documents |
| **Performance** | Fast (no API call) | One API call |
| **Pagination** | Limited by page | Complete data |
| **Use Case** | Small datasets | Large datasets |
| **Implementation** | JavaScript map/reduce | MongoDB aggregation |

**Recommendation:** Use server-side (this endpoint) when you have pagination or many documents.
