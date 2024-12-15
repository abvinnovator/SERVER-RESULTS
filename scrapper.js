const puppeteer = require("puppeteer");

const scrapeStudentHistory = async (regdNo, semester) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Login URL
    const loginUrl = "https://www.srkrexams.in/Login.aspx";
    await page.goto(loginUrl);

    // Perform login
    await page.type("#ContentPlaceHolder1_txtUsername", regdNo);
    await page.type("#ContentPlaceHolder1_txtPassword", regdNo);
    await page.click("#ContentPlaceHolder1_btnLogin");
    await page.waitForNavigation(); // Wait for redirection after login

    // Navigate to Student History page
    const historyUrl = "https://www.srkrexams.in/StudentHistory.aspx";
    await page.goto(historyUrl);
    await page.waitForSelector("#cBody_upl");

    // Extract semester details
    const semesterDetails = await page.evaluate((semester) => {
      // Semester mapping with start indices and subject counts
      const semesterConfig = {
        "Semester-I":   { startIndex: 0,   subjectCount: 8 },
        "Semester-II":  { startIndex: 9,   subjectCount: 10 },
        "Semester-III": { startIndex: 20,  subjectCount: 12 },
        "Semester-IV":  { startIndex: 33,  subjectCount: 9 },
        "Semester-V":   { startIndex: 44,  subjectCount: 0 },
        "Semester-VI":  { startIndex: 56,  subjectCount: 0 },
        "Semester-VII": { startIndex: 68,  subjectCount: 0 },
        "Semester-VIII":{ startIndex: 80,  subjectCount: 0 }
      };

      // Check if semester exists in configuration
      const semConfig = semesterConfig[semester];
      if (!semConfig) {
        return null;
      }

      // Check if results are available
      const semesterNameSelector = `#cBody_gvSGPA_CGPA_lblSemester_${Object.keys(semesterConfig).indexOf(semester)}`;
      const semesterNameElement = document.querySelector(semesterNameSelector);
      
      // If no semester name found or results not released
      if (!semesterNameElement || semConfig.subjectCount === 0) {
        return { 
          subjects: [],
          sgpa: "Results Not Yet Released",
          cgpa: "Results Not Yet Released"
        };
      }

      // Extract subjects and grades
      const subjects = [];
      const { startIndex, subjectCount } = semConfig;

      for (let i = 0; i < subjectCount; i++) {
        const subjectNameSelector = `#cBody_dgvStudentHistory_lblPName_${startIndex + i}`;
        const gradeSelector = `#cBody_dgvStudentHistory_lblGrade_${startIndex + i}`;

        const subjectName = document.querySelector(subjectNameSelector)?.innerText || '';
        const grade = document.querySelector(gradeSelector)?.innerText || '';

        // Filter out semester header rows
        if (subjectName && 
            !subjectName.toLowerCase().includes('semester') && 
            subjectName.trim() !== '') {
          subjects.push({ 
            subject: subjectName.trim(), 
            grade: grade.trim() || 'N/A'
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
    return semesterDetails;
  } catch (error) {
    console.error("Error scraping student history:", error);
    await browser.close();
    throw error;
  }
};

module.exports = scrapeStudentHistory;