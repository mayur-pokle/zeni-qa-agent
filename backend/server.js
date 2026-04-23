const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("QA Agent Backend Running 🚀");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

// ✅ ADD THIS
app.get("/api/run-tests", (req, res) => {
  res.json({
    status: "success",
    message: "Backend API working 🚀"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});