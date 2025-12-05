import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import { UAParser } from "ua-parser-js";
import Visitor from "./models/Visitor.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",   // local dev
      "https://devaseesh.netlify.app"  // your deployed portfolio
    ],
    methods: ["GET", "POST"],
  })
);


// MongoDB connect
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// TRACK endpoint
app.post("/track", async (req, res) => {
  try {
    let ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;

    // Replace localhost IP for testing
    if (ip === "::1" || ip === "127.0.0.1") {
      ip = "8.8.8.8"; 
    }

    const parser = new UAParser(req.body.userAgent);
    const browser = parser.getBrowser().name + " " + parser.getBrowser().version;
    const deviceType = parser.getDevice().type || "Desktop";

    const entry = new Visitor({
      ip,
      browser,
      device: deviceType,
      page: req.body.page,
      userAgent: req.body.userAgent,
      isNewVisit: req.body.isNewVisit
    });

    await entry.save();
    res.json({ success: true });

    console.log("Tracked visit:", {
      ip,
      browser,
      device: deviceType,
      page: req.body.page,
      isNewVisit: req.body.isNewVisit
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// GET ALL VISITS
app.get("/api/visits", async (req, res) => {
  try {
    const visits = await Visitor.find().sort({ timestamp: -1 });
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET UNIQUE VISITS
app.get("/api/visits/unique", async (req, res) => {
  try {
    const visits = await Visitor.find({ isNewVisit: true }).sort({ timestamp: -1 });
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// SUMMARY ANALYTICS
app.get("/api/visits/summary", async (req, res) => {
  try {
    const totalUnique = await Visitor.countDocuments({ isNewVisit: true });
    const totalVisits = await Visitor.countDocuments();

    const byDevice = await Visitor.aggregate([
      { $group: { _id: "$device", count: { $sum: 1 } } },
      { $project: { device: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    const byBrowser = await Visitor.aggregate([
      { $group: { _id: "$browser", count: { $sum: 1 } } },
      { $project: { browser: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    const coordinates = await Visitor.find(
      { latitude: { $ne: null }, longitude: { $ne: null } },
      { latitude: 1, longitude: 1, timestamp: 1 }
    );

    res.json({
      totalUnique,
      totalVisits,
      byDevice,
      byBrowser,
      coordinates,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(5000, () =>
  console.log("Tracking server running on port 5000")
);
