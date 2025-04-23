const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const mongoose = require("mongoose");
const { mockAuth, canViewImage, canDeleteImage } = require("./middleware/auth");
// MongoDB connection
mongoose
  .connect(
    "mongodb+srv://fam:WnT3zkO37JsB4jWE@cluster0.68xxtv0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads")); // Serve static files
app.use(mockAuth); // Add mock authentication to all requests

// Root test route
app.get("/", (req, res) => {
  res.send("Wedding Image Backend is running 🎉");
});

// Upload route
const Image = require("./models/Image");

// Updated upload endpoint with auth
app.post("/upload", mockAuth, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;

  try {
    const newImage = new Image({
      url: imageUrl,
      uploaderName: req.body.uploaderName || "Anonymous",
      weddingId: req.body.weddingId || "default",
      uploadedBy: req.user.id, // Store the user ID from auth
    });

    const savedImage = await newImage.save();

    res.json({ url: savedImage.url, id: savedImage._id });
  } catch (err) {
    console.error("❌ Error saving image to DB:", err);
    res.status(500).json({ error: "Failed to save image metadata" });
  }
});

// Delete route already has auth middleware
app.delete("/image/:id", mockAuth, canDeleteImage, async (req, res) => {
  const { id } = req.params;

  try {
    const image = await Image.findById(id);
    if (!image) return res.status(404).json({ error: "Image not found" });

    // Get the filename from the URL
    const filePath = path.join(__dirname, "uploads", path.basename(image.url));

    // Delete file from server
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.error("❌ Error deleting file:", err);
        return res.status(500).json({ error: "Failed to delete image file" });
      }
    });

    // Delete from MongoDB
    await Image.findByIdAndDelete(id);

    res.json({ message: "✅ Image deleted successfully" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Updated to filter based on user role
app.get("/images", mockAuth, async (req, res) => {
  try {
    let images;
    // Admin can see all images
    if (req.user.role == 'admin' || req.user.role == 'fam' || req.user.role == 'monica') {
      images = await Image.find().sort({ createdAt: -1 });
    } else {
      // Regular users can only see their own images
      images = await Image.find({ uploaderName: req.user.id }).sort({
        createdAt: -1,
      });
    }
    res.json(images);
  } catch (err) {
    console.error("❌ Error fetching images:", err);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Add auth to wedding images route with role-based filtering
app.get("/images/:weddingId", mockAuth, async (req, res) => {
  const { weddingId } = req.params;

  try {
    let images;
    if (req.user.role === 'admin') {
      // Admin can see all images in a wedding
      images = await Image.find({ weddingId }).sort({ createdAt: -1 });
    } else {
      // Regular users only see their uploaded images in this wedding
      images = await Image.find({ 
        weddingId, 
        uploadedBy: req.user.id 
      }).sort({ createdAt: -1 });
    }
    res.json(images);
  } catch (err) {
    console.error("❌ Error fetching images:", err);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Get by ID route already has auth middleware
app.get("/image/:id", mockAuth, canViewImage, async (req, res) => {
  const { id } = req.params;

  try {
    const image = await Image.findById(id);
    if (!image) return res.status(404).json({ error: "Image not found" });
    
    // Attach image to request for the canViewImage middleware to check permissions
    req.image = image;
    
    res.json(image);
  } catch (err) {
    console.error("❌ Error fetching image:", err);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
