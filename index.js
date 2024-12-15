const express = require("express");
const cors = require("cors");
const scrapeResults = require("./scrapper");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post('/getResults', async (req, res) => {
    const { regdNo, semester } = req.body;
    try {
      const results = await scrapeResults(regdNo, semester);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
