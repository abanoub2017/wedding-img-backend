const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    uploadedBy: { type: String}, // user ID who uploaded the image
    uploaderName: { type: String }, // optional: user input
    weddingId: { type: String, default: "default" }, // wedding reference
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Image", imageSchema);
