import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Folder model
 *
 * - Represent user-owned folders that can exist without documents (bleh Andreas =(( )
 * - Provide stable identifiers (slug) for UI routing and linking
 * - Support nesting via parentId
 *
 * - `metadata` is left flexible for future extension (strict: false)
 */
const FolderSchema = new Schema(
  {
    // Owner of the folder
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Human-facing name for the folder
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // URL-safe short id for link/routing. Should be unique per user.
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // Optional human description
    description: {
      type: String,
      trim: true,
    },

    // Optional UI hint color (hex or token)
    color: {
      type: String,
      trim: true,
    },

    // Parent folder for nesting (null for root folders)
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
      index: true,
    },

    // Soft-archive flag
    archived: {
      type: Boolean,
      default: false,
    },

    // Freeform metadata for future use (keeps schema flexible)
    metadata: {
      type: new Schema({}, { strict: false, _id: false }),
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Simple slug generator for fallback when slug is not provided.
// Keeps only ascii letters/numbers/dash/underscore and truncates to 100 chars.
function makeSlug(input) {
  if (!input) return "";
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 100);
}

// Pre-save hook: generate slug from name when missing, and prevent self-parenting
FolderSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = makeSlug(this.name);
  }

  // Prevent a folder from being its own parent
  if (this.parentId && this._id && this.parentId.toString() === this._id.toString()) {
    return next(new Error("Folder cannot be its own parent"));
  }

  next();
});

// Indexes
// - unique slug per user for stable routing and to prevent collisions
FolderSchema.index({ userId: 1, slug: 1 }, { unique: true, name: "unique_folder_slug_per_user" });
// - help listing children or folders by name
FolderSchema.index({ userId: 1, parentId: 1, name: 1 });
// - text search on name/description for quick folder lookup
FolderSchema.index({ name: "text", description: "text" });

// Export the model (safe for hot-reload)
const Folder = mongoose.models.Folder || mongoose.model("Folder", FolderSchema);
export default Folder;
