const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");
const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production" ? undefined : "jsk_secret_2024");

// Configure multer for image uploads
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "admin-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const generateToken = (id) => {
  if (!JWT_SECRET)
    throw new Error("JWT_SECRET environment variable is not configured");
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
};

const toAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  image: user.image,
  token: generateToken(user._id),
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists)
      return res.status(400).json({ message: "Email already registered" });

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "customer",
    });

    res.status(201).json(toAuthResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    // Compare the submitted password with the stored hash.
    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    res.json(toAuthResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/admin/password
router.put("/admin/password", protect, adminOnly, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user)
      return res.status(404).json({ message: "Admin account not found" });

    const match = await user.comparePassword(currentPassword);
    if (!match)
      return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/admin/profile
router.put("/admin/profile", protect, adminOnly, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ message: "Admin account not found" });

    // Check if email is already used by another user
    if (normalizedEmail !== user.email) {
      const exists = await User.findOne({ email: normalizedEmail });
      if (exists)
        return res.status(400).json({ message: "Email already in use" });
    }

    user.name = name.trim();
    user.email = normalizedEmail;
    await user.save();

    res.json(toAuthResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/admin/upload-image
router.post(
  "/admin/upload-image",
  protect,
  adminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const user = await User.findById(req.user._id);
      if (!user)
        return res.status(404).json({ message: "Admin account not found" });

      // Delete old image if it exists
      if (user.image) {
        const oldImagePath = path.join(uploadDir, path.basename(user.image));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save the new image path
      user.image = `/uploads/${req.file.filename}`;
      await user.save();

      res.json({ message: "Image uploaded successfully", image: user.image });
    } catch (err) {
      if (req.file) {
        fs.unlinkSync(req.file.path); // Delete uploaded file on error
      }
      res.status(500).json({ message: err.message });
    }
  },
);

module.exports = router;
