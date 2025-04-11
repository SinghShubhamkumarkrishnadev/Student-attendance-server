const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Parse Excel file and extract student data
 * @param {String} filePath - Path to the Excel file
 * @returns {Array} Array of student objects
 */
const parseExcel = async (filePath) => {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Clean up the temporary file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
    });
    
    // Map and validate the data
    const students = data.map(row => {
      // Try to handle different possible column names
      const enrollmentNumber = row.EnrollmentNumber || row.Enrollment || row.Roll || row.RollNumber || row.ID || '';
      const name = row.Name || row.StudentName || row.FullName || '';
      const semester = parseInt(row.Semester || row.Sem || 0);
      
      return {
        enrollmentNumber: String(enrollmentNumber).trim(),
        name: String(name).trim(),
        semester: isNaN(semester) ? 1 : semester
      };
    });
    
    // Filter out invalid entries
    return students.filter(student => 
      student.enrollmentNumber && 
      student.name && 
      student.semester > 0
    );
    
  } catch (error) {
    console.error('Excel Parsing Error:', error);
    throw new Error('Failed to parse Excel file: ' + error.message);
  }
};

/**
 * Generate Excel file with student data
 * @param {Array} students - Array of student objects
 * @returns {String} Path to the generated Excel file
 */
const generateExcel = async (students) => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert students array to worksheet
    const worksheet = XLSX.utils.json_to_sheet(students);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    // Generate a unique filename
    const filename = `students_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Write to file
    XLSX.writeFile(workbook, filePath);
    
    return filePath;
    
  } catch (error) {
    console.error('Excel Generation Error:', error);
    throw new Error('Failed to generate Excel file: ' + error.message);
  }
};

module.exports = {
  parseExcel,
  generateExcel
};
