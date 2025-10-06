# PaperTrail™ Life & Admin Aggregator App Design Document (Final Final…Final…final??? fucking finall)

## Concept

PaperTrail™ is a browser-first platform (later mobile app) that lets chaotic humans aggregate, organize, and manage all life paperwork and admin (insurance letters, credit contracts, warranties, etc.) in one place. It allows scanning or photo upload of documents, highlighter-based surgical OCR for field extraction. Designed for users drowning in paperwork who want zero friction, instant organization, and reminders. <- Patryk huehue

---

## 1. Core Features

### 1.1 Dashboard
The Dashboard serves as the central hub of PaperTrail™, offering users a comprehensive overview of their documents, key fields, and reminders. It is designed to facilitate quick access to critical information and streamline document management tasks.

**Layout and Structure**

- **Left Sidebar (Navigation Pane):**  
  This vertical panel provides access to core functionalities and user settings:  
  - Folders/Collections: Organize documents into customizable categories or buckets for easy retrieval.  
  - User Profile: Access personal information, account settings, and preferences.  
  - Settings: Configure application settings, notification preferences, and integrations.  
  - Help/Support: Access FAQs, tutorials, and customer support.

- **Main Dashboard Area:**  
  The central workspace displaying key information and interactive elements:  
  - Search Bar: Quickly locate documents using keywords or tags (up top over everything).  
  - Document Overview: A grid or list view of all uploaded documents, sortable and filterable by:  
    - Tags: Apply multiple active tags to categorize documents (e.g., "Insurance," "Contracts," "Receipts").  
    - Date: Sort by upload or document date. (default sort)  
    - Status: Filter by document status (e.g., "Pending," "Reviewed," "Archived" ← those all are tags, so we basically use tags for literally every sorting thing ever).  

- **Calendar View:** Displays reminders associated with documents, such as:  
  - Renewal Dates: Insurance policy renewals, subscription expirations.  
  - Payment Deadlines: Loan repayments, credit card due dates.  
  - Appointments: Medical check-ups, contract review meetings.  

- **Quick Actions:** Buttons for common tasks:  
  - Add New Document: Initiate document upload via scanning or photo capture.  
  - Bulk Actions: Select multiple documents for batch operations (e.g., tagging, archiving).  

*literally see if anything from paperless is fun to yoink*

**User Interaction and Experience**

- Drag-and-Drop Upload: Easily upload documents by dragging files into the dashboard.  
- Real-Time Notifications: Receive alerts for upcoming reminders, document status changes, or system updates.  
- Responsive Design: Ensure the dashboard is fully functional across devices, with a mobile-optimized version for on-the-go access. (later)  
- Accessibility Features: Implement keyboard navigation, screen reader support, and high-contrast modes to accommodate diverse user needs.  

**Visual Design and Aesthetics**

- Consistent Branding: Maintain a cohesive visual identity aligned with PaperTrail™'s brand guidelines. (nonexistent now, but: modern, sleek, very very clean)  
- Intuitive Layout: Utilize a clean, uncluttered interface with logical grouping of elements to enhance usability. (that kid youtuber does good dashboards)  
- Interactive Elements: Incorporate hover effects, tooltips, and animations to provide feedback and guide user interactions.  

By integrating these features, the Dashboard will not only serve as a functional workspace but also provide an engaging and user-friendly experience, empowering users to manage their documents and administrative tasks with ease.

---

### 1.2 Document Upload
When the user clicks “Add New”, a dedicated document upload window opens. This interface is designed to allow maximum control, automatic intelligence, and flexibility in managing key data from documents.

**Preview & Multi-Page Support**

- The upload window displays a preview of the document, supporting PDFs, multi-page documents, and multiple photos.  
- A sidebar with thumbnails allows users to quickly navigate between pages.  
- Optional page tagging lets users label pages (e.g., “Page 1”, “Terms”, “Appendix”) for easier reference.  

**Key-Value Pair Extraction**

- The app performs a full-throttle OCR attempt to automatically detect and populate key-value pairs from the document.  
- Users can define templates corresponding to document types (e.g., “Rechnung”, “Versicherung”). Templates specify which key-value pairs to extract for each type.  
- For example, a “Rechnung” template automatically looks for “RechnungsNr”, “Datum”, and “Gesamtbetrag”.  
- Templates can be shipped with the app as standard defaults but are fully customizable by users.  
- The OCR engine must handle variations in spelling and formatting, e.g., “Rechnungs-Nr”, “Rechnungsnummer”, “Rechnungsnr”, “Invoice-Nr”, or “Invoicenummer” all map to the same key.  

**Dynamic Template & Field Creation**

- Users can add new key-value pairs during the upload process:  
  - If created within “edit template”, the new pair is saved to the template for future documents.  
  - If created while adding a single document, the system asks whether to save it to the template or just for this document. Users can also create a new template on the fly, define its name, and set the trigger keyword(s) that automatically apply it in the future.  
- Custom OCR for specific values: Users can click a value field, draw a marking box on the document preview, and run OCR on only that cropped area. The newly recognized text is automatically populated into the selected value field. This allows precise corrections and additions.  

**Tagging & Search**

- Beyond key-value pairs, users can create tags for each document (e.g., “2025”, “Medical”, “Electronics”).  
- Tags augment search and filtering, independent of the key-value structure.  
- Example: If “Pixel 9” is extracted as a key-value pair “Bezeichnung”, and the user adds the tag “Electronics”, searching either “Pixel” or “Electronics” will display this document.  
- The dashboard displays top tags, allowing users to click on tags to filter documents. Multiple tags can be applied simultaneously to refine searches.  

**Backend Storage & Microservice Architecture**

- Each uploaded document is assigned a unique ID and stored in a MongoDB database, ensuring:  
  - Non-standard key-value pairs are captured and retrievable.  
  - Templates and tags are logically structured and separated for search and reuse.  
- Microservice design allows scalable OCR processing, template management, and tagging services to work independently and efficiently.  

---

### 1.3 Document Review & Editing
Once a document is uploaded and the initial OCR extraction has run, users enter the Document Review & Editing phase (same window as the “add new” opens). This part of interface allows users to verify, correct, and enhance the automatically detected key-value pairs, while giving full control over visual highlighting and targeted OCR reprocessing.

**Document Preview & Navigation**

- A full preview of the document is displayed, supporting multi-page navigation through:  
  - Sidebar thumbnails for quick page jumps (left from preview?).  
  - Swipe gestures on mobile or touch screens for fast page flipping. (later on).  

**Key-Value Pair Review**

All key-value pairs extracted by OCR are listed alongside the preview, linked to their corresponding fields in the document that will be fed into the database as key-value pairs.

Users can:  
- Edit values directly by typing in the input field.  
- Trigger selective OCR re-scans by drawing a highlight rectangle over the document area corresponding to a key-value pair. The app then crops the selected region and runs OCR only on that area (in the background, does not crop the preview).  
- For mobile, users will be able to draw a box or swipe over a region to select it. The swipe/touch gesture generates a corresponding bounding rectangle that can trigger the same selective OCR.  

---
**Highlighting & Overlay**

- Each key-value pair is visually linked to its corresponding area on the document preview using a translucent rectangle.  
- **Distinct Color:** Each field has a unique color, chosen when correcting/filling the value. This color is applied to both the rectangle outline on the preview and the associated value box in the sidebar.  
- **Translucent Fill:** The rectangle has a semi-transparent fill so the underlying text remains readable, while the outline remains fully opaque to clearly mark the area.  
- **Activation Indicator:** Clicking a value box highlights its corresponding area. An accent or slightly thicker outline indicates active editing, while the translucent fill stays the same.  
- **Consistency:** The sidebar value box mirrors the rectangle’s color, reinforcing the link between field and preview area.  
- **Future Mobile Support (Planned):** Users will be able to tap a value box to activate highlighting and adjust the selection via touch gestures.  

**Custom Fields & On-the-Fly OCR**

- Users can create additional key-value pairs during review:  
  - These can be ad-hoc for the specific document or optionally saved to a template for future documents.  
  - For each new pair, users select the region on the preview, and the app runs OCR on the defined rectangle, populating the value automatically.  
  - Flow: button (under all existing key-value pairs) → click → enter key → click value field → either type it or mark it on the preview for OCR.  

- Existing fields can also be reassigned:  
  - Users can redefine the linked value by clicking on the value field and then dragging the rectangle on the preview or typing the new value.  
  - Re-running OCR on a redefined area updates the key-value field in real time.  

**Multi-Page Editing**

- Each page can have multiple key-value areas defined.  
- While each page has multiple key-value areas, the document is treated as a whole in the database (one entry, not multiple entries per page).  
- When adding a new key-value pair, the full list of key-value pairs is displayed on each page of the multipage document.  
- Users can navigate between pages while maintaining the context of which field is active.  
- (Planned mobile support: two-finger pinch to zoom, single-finger swipe for page navigation, touch gestures for marking/selecting regions.)  

**Tagging & Search Integration**

- Users can add or edit tags in the review/create interface.  
- Tags provide additional metadata independent of key-value pairs.  
- Tags and key-value pairs are fully integrated into the dashboard search and filter system.  
- Default dashboard view shows all documents, sorted by newest uploaded.  
- Users can search by tag, value, or key via the search bar.  
- Clicking on a tag from the tag list applies incremental filtering to the dashboard view.  
- Multiple tags can be selected to refine the document display.  
- Searches respect existing tag filters, operating only within the already restricted subset of documents. (*add reset button*).  

**Backend Integration**

- All edits, highlights, OCR re-runs, and custom fields are persisted immediately in the MongoDB database, ensuring:  
  - Consistency between document preview, key-value pairs, and dashboard.  
  - Traceable history for each field in case of corrections or audits.  
- Templates store default key-color associations, OCR keywords, and recognition rules, ensuring consistency across documents of the same type.  

---

### 1.6 Reminders & Notifications

- Track key dates (renewals, payments, cancellations).  
- Email reminders in browser version; push/browser notifications reserved for app version.  
- Automatic recurring events (e.g., “credit card due every month”).  
- Aggregate of reminders into dashboard view ← in calendar.  

---

### 1.7 Search / Filter / Archive

- Search by keyword, field, type, or multiple tags.  
- Filter by tags, reuse tags across documents.  
- Mark documents as active or archived.  

---

## 2. Tech Stack

### Frontend

- **Framework:** React (browser-first, highly componentized, supports future mobile via React Native or Capacitor)  
- **State Management:** Zustand (centralized state for documents, templates, highlights, and tags)  
- **UI Library / Design System:** Tailwind CSS or Material-UI (for rapid styling, responsive layouts, accessible components)  
- **Document Viewer / Canvas:**  
  - HTML5 `<canvas>` and/or Fabric.js for document previews and highlights  
  - PDF.js for multi-page PDF rendering and thumbnails  
- **OCR Integration (client-side optional):** Tesseract.js for quick previews or user-guided highlights  
- **Notifications & Alerts:** Browser notifications API, custom toast notifications for reminders or updates  
- **File Handling / Uploads:** HTML5 drag-and-drop, fine-grained file input controls, client-side validation  

### Backend

**a) Document Service**  
- Stores metadata (MongoDB) + file references (local).  
- Handles CRUD for documents, pages, key-value fields, tags.  
- Multi-page support: pages stored as subdocuments.  

**Endpoints:**  
- POST `/documents` – upload doc  
- GET `/documents` – list/filter  
- GET `/documents/:id` – fetch full doc + OCR fields  
- PUT `/documents/:id` – update fields, tags, highlights  

**b) (potential) Template Service**  
- Stores templates with field definitions, OCR keywords, color associations.  
- CRUD templates + template application rules.  

**Endpoints:**  
- GET `/templates`  
- POST `/templates`  
- PUT `/templates/:id`  
- DELETE `/templates/:id`  

**c) (potential but important) Notification/Reminder Service**  
- Manages reminders (recurring or one-off).  
- Sends emails / browser push.  
- BackgroundTasks in FastAPI.  

**Endpoints:**  
- POST `/reminders` – add reminder  
- GET `/reminders/:user_id` – list  
- PUT `/reminders/:id` – update  

---

## 3. Workflow (User Interaction Flow)

### 3.1 Dashboard Entry
- User logs in → redirected to Dashboard.  
- Dashboard loads:  
  - Fetches document metadata from Document Service.  
  - Fetches tags, templates, and reminders from Template & Notification Services.  
  - Displays top tags, quick actions, and calendar overview.  

### 3.2 Adding a New Document
- User clicks “Add New Document” → opens Document Upload Window.  
- User uploads:  
  - Drag-and-drop or file picker.  
  - Supports PDF, multi-page PDF, or images.  
- Document Service stores file in local storage and metadata in MongoDB.  
- Automatic OCR (client-side with Tesseract.js) runs on full document → populates key-value pairs.  
- Template Service applies rules:  
  - Matches document type based on keywords (e.g., “Rechnung”).  
  - Populates default key-value pairs for recognized template.  
- User can manually adjust fields:  
  - Click value field → draw highlight rectangle on preview → run selective OCR.  
  - Add new fields (key-value pairs) → optionally save to template.  

### 3.3 Document Review & Editing
- Document opens in Review Mode with:  
  - Preview pane (multi-page PDF + thumbnails).  
  - Sidebar with extracted key-value pairs.  
  - Highlight rectangles linked to fields.  

- **User actions:**  
  - Edit values directly in sidebar.  
  - Re-run OCR on specific region.  
  - Add custom key-value pairs on-the-fly (select region → OCR → populate).  
  - Reassign fields to different areas if OCR was incorrect.  

- **All updates persist immediately in Document Service:**  
  - Fields, highlights, templates, tags.  
  - Changes are audit-traceable.  

### 3.4 Tagging & Search
- User can add/edit tags per document → triggers Document Service update.  
- **Search & filter flow:**  
  - User enters keyword/tag → Document Service queries MongoDB.  
  - Incremental filters applied (multiple tags/fields).  
  - Results displayed in dashboard grid/list.  
- Clicking a document in search → opens Review/Edit Mode with highlights intact.  

### 3.5 Reminders & Notifications
- User sets reminders for:  
  - Renewals, payments, cancellations, appointments.  
  - Recurring events (monthly, yearly, etc.).  
- Reminder Service stores events in MongoDB → schedules BackgroundTasks.  
- **Notifications:**  
  - Browser notifications for upcoming reminders.  
  - Emails sent via integrated SMTP.  
- Dashboard calendar view aggregates all reminders → clickable events open linked document.  

### 3.6 Multi-Page & Advanced Interaction
- **Page navigation:**  
  - Sidebar thumbnails allow jumping between pages.  
  - Active field context is preserved when switching pages.  

- **Highlight consistency:**  
  - Each field’s rectangle color matches sidebar box.  
  - Clicking field on sidebar → highlights rectangle on page.  

- **Mobile gestures (planned):**  
  - Pinch-to-zoom for detail.  
  - Swipe for page navigation.  
  - Tap to select OCR region.  

### 3.7 Backend Microservice Interaction Flow
- **Frontend requests:**  
  - Document metadata → Document Service  
  - Templates → Template Service  
  - Reminders → Notification Service  

- **Document upload triggers:**  
  - Document Service stores file & metadata.  
  - Optionally sends OCR request to OCR Service (server-side processing).  
  - Tagging, key-value edits, and highlights → Document Service updates MongoDB.  
  - Reminders → Notification Service schedules tasks, triggers notifications.  

---

## 4. MVP

- Auth (email / magic-link) — simple user accounts. (I think?? as last)  
- Document upload — accept PDF + images, multi-page support.  
- Document viewer — thumbnails and preview.  
- Client-side OCR preview — Tesseract.js run on full doc for instant extraction.  
- Surgical highlight OCR — user can draw a rectangle on the preview; OCR that region and populate a key-value field.  
- Key-value fields + templates (basic) — allow associating a small set of fields (e.g., InvoiceNr, Date, Total) and saving a simple template.  
- Tags + search — tag a doc, search by tag/key/value text.  
- Save & persist — store files in MongoDB.  
- Basic UI — basically dashboard and stuff needed to add/edit the document.  
- Simple reminders model — let user attach one-off or recurring reminders to a document (calendar?).  

### 4.1 Acceptance criteria for MVP

- A new user can sign up and upload a PDF or image.  
- The uploaded document displays in the viewer with page thumbnails.  
- Tesseract runs and returns text; sidebar shows at least 3 extracted candidate fields from templates.  
- User can draw a bounding box on the preview and replace the OCR result for a selected field.  
- User can add tags and perform a search that returns the uploaded document.  
- User can attach a reminder to the document and see it in the reminders list.  
- Files and metadata persist in Mongo and are retrievable.  
- (Potential) Basic security: TLS endpoints, authentication required for docs, file type validation.  

### 4.2 Development Sequence

- Prototype cleanup → modularize current HTML/JS.  
- Backend skeleton → Express + MongoDB with documents collection.  
- File uploads → handle PDFs/images, store on disk.  
- Wire frontend to backend → doc upload → backend → return ID.  
- Document review integration → fields/highlights saved via API.  
- Dashboard UI → fetch all docs, display, search, filter.  
- Tags → add/edit per doc, filter dashboard.  
- Stabilize MVP → one-user, browser-only, persistent storage.  
