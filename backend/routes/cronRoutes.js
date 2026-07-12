const express = require("express");
const router = express.Router();
const { runReminders } = require("../controllers/reminderController");

// Hit by an external cron (cron-job.org). Auth via x-cron-secret header
// or ?secret= query. See setup guide.
router.get("/run-reminders", runReminders);
router.post("/run-reminders", runReminders);

module.exports = router;
