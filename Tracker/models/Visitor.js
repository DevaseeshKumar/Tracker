import mongoose from "mongoose";

const VisitorSchema = new mongoose.Schema({
  ip: String,
  browser: String,
  device: String,
  page: String,
  userAgent: String,
  isNewVisit: Boolean,
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Visitor", VisitorSchema);
