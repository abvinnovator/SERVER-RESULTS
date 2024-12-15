const puppeteer = require("puppeteer");
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ResultScraper {
  constructor() {
    // Create a persistent cache directory
    this.cacheDir = path.join(__dirname, 'result_cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
  }

  // Generate a secure, deterministic cache key
  generateCacheKey(regdNo, semester) {
    return crypto
      .createHash('md5')
      .update(`${regdNo}_${semester}_v1`)
      .digest('hex');
  }

  // Cache results with some intelligence
  cacheResults(key, data) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    const cacheData = {
      timestamp: Date.now(),
      data: data
    };
    
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData));
  }

  // Retrieve cached results with expiration check
  getCachedResults(key) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    
    // Check if cache exists
    if (!fs.existsSync(cacheFile)) {
      return null;
    }

    const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    // Cache expires after 30 days
    const CACHE_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - cachedData.timestamp > CACHE_EXPIRATION) {
      // Remove expired cache
      fs.unlinkSync(cacheFile);
      return null;
    }

    return cachedData.data;
  }

  // Performance Trend Analysis
  analyzePerformanceTrend(allSemesterResults) {
    // Simplified trend analysis
    const performanceTrend = {
      gradeTrend: [],
      overallPerformance: null
    };

    // Extract CGPA for trend
    performanceTrend.gradeTrend = allSemesterResults.map(sem => {
      const cgpa = parseFloat(sem.cgpa);
      return isNaN(cgpa) ? null : cgpa;
    }).filter(cgpa => cgpa !== null);

    // Calculate overall performance
    if (performanceTrend.gradeTrend.length > 0) {
      const avgCGPA = performanceTrend.gradeTrend.reduce((a, b) => a + b, 0) / performanceTrend.gradeTrend.length;
      
      performanceTrend.overallPerformance = 
        avgCGPA >= 8.5 ? 'Excellent' :
        avgCGPA >= 7.5 ? 'Very Good' :
        avgCGPA >= 6.5 ? 'Good' :
        avgCGPA >= 5.5 ? 'Average' : 'Below Average';
    }

    return performanceTrend;
  }

  // Main scraping method with enhanced features
  async scrapeStudentHistory(regdNo, semester) {
    // Generate unique cache key
    const cacheKey = this.generateCacheKey(regdNo, semester);
    
    // Check cache first
    const cachedResults = this.getCachedResults(cacheKey);
    if (cachedResults) {
      console.log('Returning cached results');
      return cachedResults;
    }

    // Original scraping logic from previous implementation
    const browser = await puppeteer.launch({ 
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    try {
      await page.setDefaultTimeout(60000);

      const loginUrl = "https://www.srkrexams.in/Login.aspx";
      await page.goto(loginUrl, { waitUntil: 'networkidle0' });

      await page.type("#ContentPlaceHolder1_txtUsername", regdNo);
      await page.type("#ContentPlaceHolder1_txtPassword", regdNo);
      await page.click("#ContentPlaceHolder1_btnLogin");
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      const historyUrl = "https://www.srkrexams.in/StudentHistory.aspx";
      await page.goto(historyUrl, { waitUntil: 'networkidle0' });
      await page.waitForSelector("#cBody_upl");

      // Existing semester details extraction logic
      const semesterDetails = await page.evaluate((semester) => {
      // Detailed logging function
      const logElementInfo = (selector, type) => {
        const element = document.querySelector(selector);
        console.log(`[DOM] ${type} Selector: ${selector}`);
        console.log(`[DOM] ${type} Element: `, element);
        console.log(`[DOM] ${type} innerText: `, element ? element.innerText : 'No Element');
        console.log(`[DOM] ${type} textContent: `, element ? element.textContent : 'No Element');
        return element;
      };

      // Semester mapping with detailed configurations
      const semesterConfig = {
        "Semester-I":   { 
          startIndex: 0,   
          subjectCount: 8,
          gradeStart: 1,
          nameStart: 2
        },
        "Semester-II":  { 
          startIndex: 9,   
          subjectCount: 10,
          gradeStart: 10,
          nameStart: 10
        },
        "Semester-III": { 
          startIndex: 20,  
          subjectCount: 12,
          gradeStart: 21,
          nameStart: 21
        },
        "Semester-IV":  { 
          startIndex: 33,  
          subjectCount: 9,
          gradeStart: 34,
          nameStart: 34
        },
        "Semester-V":   { 
          startIndex: 44,  
          subjectCount: 10,
          gradeStart: 45,
          nameStart: 45
        },
        "Semester-VI":  { 
          startIndex: 56,  
          subjectCount: 10,
          gradeStart: 57,
          nameStart: 57
        },
        "Semester-VII": { 
          startIndex: 68,  
          subjectCount: 10,
          gradeStart: 69,
          nameStart: 69
        },
        "Semester-VIII":{ 
          startIndex: 80,  
          subjectCount: 10,
          gradeStart: 81,
          nameStart: 81
        }
      };

      // Check if semester exists in configuration
      const semConfig = semesterConfig[semester];
      if (!semConfig) {
        return null;
      }

      // Extract subjects and grades
      const subjects = [];
      const { startIndex, subjectCount, gradeStart, nameStart } = semConfig;

      // Always attempt to extract subjects with extensive logging
      for (let i = 0; i < subjectCount; i++) {
        const subjectNameSelector = `#cBody_dgvStudentHistory_lblPName_${nameStart + i}`;
        const gradeSelector = `#cBody_dgvStudentHistory_lblGrade_${gradeStart + i}`;

        console.log(`[DOM] Iteration ${i}:`);
        
        // Log subject name details
        const subjectNameElement = logElementInfo(subjectNameSelector, 'Subject Name');
        const subjectName = subjectNameElement ? 
          (subjectNameElement.innerText || subjectNameElement.textContent || '').trim() 
          : '';

        // Log grade details
        const gradeElement = document.querySelector(gradeSelector);
        const grade = gradeElement ? gradeElement.value : 'N/A';
        

        // Filter out semester header rows
        if (subjectName && 
            !subjectName.toLowerCase().includes('semester') && 
            subjectName.trim() !== '') {
          subjects.push({ 
            subject: subjectName, 
            grade: grade || 'N/A'
          });
        }
      }

      // Extract SGPA and CGPA 
      const sgpaSelector = `#cBody_gvSGPA_CGPA_lblSgap_${Object.keys(semesterConfig).indexOf(semester)}`;
      const cgpaSelector = `#cBody_gvSGPA_CGPA_lblCGPA_${Object.keys(semesterConfig).indexOf(semester)}`;

      const sgpa = document.querySelector(sgpaSelector)?.innerText || 'Results Not Yet Released';
      const cgpa = document.querySelector(cgpaSelector)?.innerText || 'Results Not Yet Released';

      return {
        subjects,
        sgpa,
        cgpa
      };
    }, semester);
    await browser.close();

    // Cache the results
    this.cacheResults(cacheKey, semesterDetails);

    return semesterDetails;
  } catch (error) {
    console.error("Error scraping student history:", error);
    await browser.close();
    throw error;
  }
}

// New feature: Bulk semester result retrieval
async retrieveAllSemesterResults(regdNo) {
  const allSemesters = [
    "Semester-I", "Semester-II", "Semester-III", "Semester-IV", 
    "Semester-V", "Semester-VI", "Semester-VII", "Semester-VIII"
  ];

  const results = [];
  for (const semester of allSemesters) {
    try {
      const semResult = await this.scrapeStudentHistory(regdNo, semester);
      if (semResult) results.push(semResult);
    } catch (error) {
      console.error(`Error fetching ${semester} results`, error);
    }
  }

  // Analyze performance trend
  const performanceTrend = this.analyzePerformanceTrend(results);

  return {
    semesterResults: results,
    performanceTrend
  };
}
}

module.exports = ResultScraper;