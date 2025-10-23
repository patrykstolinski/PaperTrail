import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Subschema: fully dynamic key-value pairs for OCR/user-defined metadata
 * - No predefined fields
 * - Can hold arbitrary keys and values (e.g. Kundennummer, Rechnungsnummer, Lieferungsdatum, Versicherungsnummer etc.)
 * - Templates (Rechnung, Versicherung, etc.) will define which keys exist at runtime
 */
const ExtractedFieldsSchema = new Schema(
    {},
    {
        _id: false,
        strict: false, // allow completely arbitrary fields
    }
);

/**
 * Subschema: Per-page metadata for multi-page documents
 * - Stores metadata for each page of a multi-page PDF or image sequence
 * - thumbnailGridFS: ObjectId reference to GridFS file for page thumbnail
 * - extractedFields: Per-page OCR data (same flexible schema as document-level)
 * - ocrText: Full text extracted from this page via OCR
 */
const PageMetadataSchema = new Schema(
    {
        pageNumber: {
            type: Number,
            required: true,
        },
        thumbnailGridFS: {
            type: Schema.Types.ObjectId,
            // Reference to GridFS file in 'thumbnails' bucket
        },
        extractedFields: {
            type: ExtractedFieldsSchema,
            default: {},
        },
        ocrText: {
            type: String,
            // Full text content of this page for searching
        },
    },
    {
        _id: false, // Don't create separate _id for each page subdocument
    }
);

const DocumentSchema = new Schema(
{
    // ------ Required fields ------
    //enables files under 16mb - if ever over 16mb, use GridFS
    fileBinaryData: {
    type: Buffer,
    required: true
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
      enum: {
        values: ['application/pdf', 'image/png', 'image/jpeg'],
        message: (props) => `${props.value} is not a supported file type!`
      }
    },
    fileSize: {
      type: Number,
      required: true,
      immutable: true,
      min: [1, 'File size must be greater than 0 bytes']
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // deterministic hashes for dedup and indexing (do not index raw Buffer)
    titleHash: {
      type: String,
    },
    fileHash: {
      type: String,
    },
    ocrDate: {
      type: Date,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    // ------ Dynamic OCR/User fields ------
    extractedFields: {
      type: ExtractedFieldsSchema,
      default: {},
    },

    // ------ Optional tagging system ------
    tags: {
      type: [String],
      default: [],
    },
    // ------ Optional reminder system with required fields (if reminder exists) ------
    reminders: [
        {
          date: {
            type: Date,
            required: true,
            validate: {
              validator: function(value) {
                return value >= new Date();
              },
              message: "Reminder date cannot be in the past, bruh"
            },
          },
          message: {
            type: String,
            required: true,
            trim: true,
          },
          sent: {
            type: Boolean,
            default: false,
          },
        },
    ],

    // ------ Ownership & workflow ------
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "review", "completed"],
      default: "uploaded",
    },
    // First-class folder reference (optional). Prefer this for lookups and integrity.
    folderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null, // if null, write "documents" in display or whatever bruh
      index: true,
    },

    // ------ Multi-page support ------
    // Array of per-page metadata for multi-page documents (PDFs with multiple pages)
    // For single-page documents (images), this array will be empty or have 1 entry
    pages: {
      type: [PageMetadataSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);
    // ------ Indexes ------
DocumentSchema.index({
  title: "text",
  tags: "text",
  originalFileName: "text",
});
DocumentSchema.index({ ocrDate: -1 });
DocumentSchema.index({ fileType: 1 });
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ userId: 1 });

// ------ Unique constraints ------
// user cannot upload documents with the same title twice (per-user)
DocumentSchema.index(
  { userId: 1, titleHash: 1},
  { unique: true, name: "unique_title_per_user"}
);

// user cannot upload the same FILE (even with different titles) twice (per-user)
DocumentSchema.index(
  { userId: 1, fileHash: 1 },
  { unique: true, name: "unique_file_per_user" }
)


// export the model (avoid double registration when hot-reloading in dev)
const Document = mongoose.models.Document || mongoose.model("Document", DocumentSchema);
export default Document;
