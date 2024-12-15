const express = require("express");
const cors = require("cors");
const ResultScraper = require('./scrapper'); 

const app = express();
const PORT = 5000;

app.use(cors({
  origin: 'https://srkrresults.netlify.app/', // Replace with your actual frontend domain
}));
app.use(express.json());

app.post('/getResults', async (req, res) => {
    const { regdNo, semester } = req.body;
    try {
      const scraper = new ResultScraper();
      const results = await scraper.scrapeStudentHistory(regdNo, semester);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
app.post('/getAllResults', async (req, res) => {
    const { regdNo } = req.body;
    try {
      const scraper = new ResultScraper();
      const results = await scraper.retrieveAllSemesterResults(regdNo);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
