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
      index: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ocrDate: {
      type: Date,
      index: true,
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
      index: true,
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
            }
          },
          message: {
            type: String,
            required: true,
            trim: true,
          },
          sent: {
            type: Boolean,
            default: false,
          }
        }
    ],

    // ------ Ownership & workflow ------
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "review", "completed", "archived"],
      default: "uploaded",
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

DocumentSchema.index({
  title: "text",
  tags: "text",
  originalFileName: "text",
});
DocumentSchema.index({ uploadDate: -1 });
DocumentSchema.index({ ocrDate: -1 });
DocumentSchema.index({ fileType: 1 });
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ userId: 1 });

// export the schema
const Document = mongoose.model('Document', DocumentSchema);
export default Document;
