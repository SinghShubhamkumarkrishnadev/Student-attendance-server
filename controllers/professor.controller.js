const Professor = require('../models/professor.model');
const Class = require('../models/class.model');
const mongoose = require('mongoose');
const { generateToken } = require('../config/jwt.config');
const { successResponse, errorResponse } = require('../utils/response.utils');
const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Parse Excel file for professors
 * Expected columns (case-insensitive / fuzzy): name, username, password (password optional)
 * If password missing, a default temporary password will be generated ("Temp@1234")
 * @param {String} filePath
 * @returns {Array} Array of { name, username, password }
 */
const parseProfessorExcel = async (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Build header normalization map
  const normalizeHeader = (h) => String(h || '').trim().toLowerCase().replace(/[\s_]+/g, '');
  const headerMap = {};
  Object.keys(raw[0] || {}).forEach((k) => {
    headerMap[normalizeHeader(k)] = k;
  });

  const nameHeader = headerMap['name'] || headerMap['professorname'] || headerMap['profname'];
  const usernameHeader = headerMap['username'] || headerMap['user'] || headerMap['login'];
  const passwordHeader = headerMap['password'] || headerMap['pass'] || null;

  if (!nameHeader || !usernameHeader) return [];

  const DEFAULT_PASSWORD = 'Temp@1234';

  const rows = raw.map((row) => ({
    name: String(row[nameHeader] || '').trim(),
    username: String(row[usernameHeader] || '').trim(),
    password: String((passwordHeader && row[passwordHeader]) || DEFAULT_PASSWORD).trim(),
  })).filter(r => r.name && r.username);

  // delete temp file
  fs.unlink(filePath, () => { });

  return rows;
};

/**
 * @desc    Bulk upload professors via Excel
 * @route   POST /api/professors/bulk-upload
 * @access  Private (HOD only)
 */
// Replace your existing bulkUploadProfessors with this improved version
const bulkUploadProfessors = async (req, res) => {
  let filePath;
  try {
    if (!req.file) return errorResponse(res, 'Please upload an Excel file', 400);

    const hodId = req.user.id;
    filePath = req.file.path;

    const rows = await parseProfessorExcel(filePath);
    if (!rows || rows.length === 0) return errorResponse(res, 'No valid professor data found', 400);

    // Normalize usernames and remove empty/name-missing rows (parseProfessorExcel already filters, but be safe)
    const normalizedRows = rows.map(r => ({
      name: String(r.name || '').trim(),
      username: String(r.username || '').trim(),
      // if password blank -> generate a default per-row
      password: (r.password && String(r.password).trim()) || null
    })).filter(r => r.name && r.username);

    if (normalizedRows.length === 0) {
      return successResponse(res, {
        message: 'No valid professor rows after normalization',
        totalProcessed: rows.length,
        inserted: 0,
        skipped: 0,
        skippedDetails: []
      });
    }

    // 1) Gather existing usernames for this HOD (case-insensitive)
    const existing = await Professor.find({ createdBy: hodId }).select('username');
    const existingSet = new Set(existing.map(e => String(e.username).toLowerCase()));

    // 2) Track usernames seen in this file to avoid inserting duplicates from same file
    const seenInFile = new Set();

    const toInsert = [];
    const skipped = []; // { username, reason }
    normalizedRows.forEach((r, idx) => {
      const uname = r.username.trim();
      const unameLower = uname.toLowerCase();
      if (existingSet.has(unameLower)) {
        skipped.push({ username: uname, reason: 'already exists (DB)', row: idx + 2 }); // +2 for header + 0-based
        return;
      }
      if (seenInFile.has(unameLower)) {
        skipped.push({ username: uname, reason: 'duplicate in uploaded file', row: idx + 2 });
        return;
      }
      // mark seen in file and prepare insert doc
      seenInFile.add(unameLower);

      // generate a default password when none provided (random but deterministic enough)
      const password = r.password || `Temp@${Math.floor(1000 + Math.random() * 9000)}`;

      toInsert.push({
        name: r.name,
        username: uname,
        password,
        createdBy: hodId,
        _tempPasswordForReturn: r.password ? null : password // keep to return to HOD if generated
      });
    });

    if (toInsert.length === 0) {
      return successResponse(res, {
        message: 'No new professors to add',
        totalProcessed: normalizedRows.length,
        inserted: 0,
        skipped: skipped.length,
        skippedDetails: skipped
      });
    }

    // 3) Insert each row individually (so pre-save hooks run and we can continue on error)
    const inserted = [];
    const errors = [];
    for (const doc of toInsert) {
      try {
        // Create will trigger pre-save password hashing
        const prof = await Professor.create({
          name: doc.name,
          username: doc.username,
          password: doc.password,
          createdBy: doc.createdBy
        });

        inserted.push({
          id: prof._id,
          name: prof.name,
          username: prof.username,
          // return the generated temp password if we generated one
          tempPassword: doc._tempPasswordForReturn || null
        });
      } catch (err) {
        // If duplicate key error happens due to race, mark as skipped with reason
        const errMsg = (err && err.message) ? err.message : String(err);
        if (err.code === 11000 || /duplicate/i.test(errMsg)) {
          skipped.push({ username: doc.username, reason: 'duplicate key error on insert (race?)' });
        } else {
          errors.push({ username: doc.username, error: errMsg });
        }
      }
    }

    return successResponse(res, {
      message: `${inserted.length} professors uploaded`,
      totalProcessed: normalizedRows.length,
      inserted: inserted.length,
      insertedDetails: inserted,
      skipped: skipped.length,
      skippedDetails: skipped,
      errors
    }, 201);

  } catch (error) {
    console.error('bulkUploadProfessors error:', error);
    return errorResponse(res, 'Server error during bulk professor upload', 500);
  } finally {
    // ensure uploaded file is cleaned up
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, () => { });
      }
    } catch (e) {
      // ignore cleanup errors
    }
  }
};

/**
 * @desc    Bulk delete professors (cleanup classes)
 * @route   DELETE /api/professors/bulk
 * @access  Private (HOD only)
 * @body    { professorIds: string[] } OR query ?professorIds=id1,id2
 */
const bulkDeleteProfessors = async (req, res) => {
  const hodId = req.user.id;

  try {
    let professorIds = req.body?.professorIds || req.query?.professorIds;

    if (typeof professorIds === 'string') {
      professorIds = professorIds.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (!Array.isArray(professorIds) || professorIds.length === 0) {
      return errorResponse(res, 'Please provide an array of professor IDs', 400);
    }

    // Validate ObjectIds and keep only valid ones
    const validIds = professorIds.filter(mongoose.Types.ObjectId.isValid);
    if (validIds.length === 0) {
      return errorResponse(res, 'No valid professor IDs provided', 400);
    }

    // Ensure professors belong to this HOD
    const professors = await Professor.find({
      _id: { $in: validIds },
      createdBy: hodId
    }).select('_id');

    if (!professors.length) {
      return errorResponse(res, 'No professors found for deletion', 404);
    }

    const profObjectIds = professors.map(p => p._id);

    // Use transaction for safety (if your Mongo deployment supports it)
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // 1) Pull professor references from classes
        await Class.updateMany(
          { professors: { $in: profObjectIds } },
          { $pull: { professors: { $in: profObjectIds } } },
          { session }
        );

        // 2) Delete professors
        await Professor.deleteMany(
          { _id: { $in: profObjectIds }, createdBy: hodId },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    const notFoundOrUnauthorized = validIds.filter(
      id => !profObjectIds.some(objId => objId.equals(id))
    );

    return successResponse(res, {
      message: `${profObjectIds.length} professors deleted successfully`,
      totalDeleted: profObjectIds.length,
      totalRequested: validIds.length,
      notDeleted: notFoundOrUnauthorized
    });

  } catch (error) {
    console.error('bulkDeleteProfessors error:', error);
    return errorResponse(res, 'Server error while bulk deleting professors', 500);
  }
};

/**
 * @desc    Add a new professor
 * @route   POST /api/professors
 * @access  Private (HOD only)
 */
const addProfessor = async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const hodId = req.user.id;

    // Check if professor with username already exists
    const professorExists = await Professor.findOne({ username });
    if (professorExists) {
      return errorResponse(res, 'Username already taken', 400);
    }

    // Create new professor
    const professor = await Professor.create({
      name,
      username,
      password,
      createdBy: hodId
    });

    return successResponse(res, {
      message: 'Professor added successfully',
      professor: {
        id: professor._id,
        name: professor.name,
        username: professor.username
      }
    }, 201);

  } catch (error) {
    return errorResponse(res, 'Server error while adding professor', 500);
  }
};

/**
 * @desc    Get all professors
 * @route   GET /api/professors
 * @access  Private (HOD only)
 */
const getProfessors = async (req, res) => {
  try {
    const hodId = req.user.id;

    // Include classes field too
    const professors = await Professor.find({ createdBy: hodId })
      .select('-password') // only exclude password, keep classes
      .sort({ createdAt: -1 });

    return successResponse(res, { professors });
  } catch (error) {
    return errorResponse(res, 'Server error while fetching professors', 500);
  }
};


/**
 * @desc    Get professor by ID
 * @route   GET /api/professors/:id
 * @access  Private (HOD only)
 */
const getProfessorById = async (req, res) => {
  try {
    const professorId = req.params.id;
    const hodId = req.user.id;

    // Find professor by ID and created by this HOD
    const professor = await Professor.findOne({
      _id: professorId,
      createdBy: hodId
    }).select('-password');

    if (!professor) {
      return errorResponse(res, 'Professor not found', 404);
    }

    return successResponse(res, { professor });

  } catch (error) {
    return errorResponse(res, 'Server error while fetching professor', 500);
  }
};

/**
 * @desc    Update professor
 * @route   PUT /api/professors/:id
 * @access  Private (HOD only)
 */
const updateProfessor = async (req, res) => {
  try {
    const professorId = req.params.id;
    const hodId = req.user.id;
    const { name, username, password } = req.body;

    // Find professor by ID and created by this HOD
    let professor = await Professor.findOne({
      _id: professorId,
      createdBy: hodId
    });

    if (!professor) {
      return errorResponse(res, 'Professor not found', 404);
    }

    // Check if username is being changed and already exists
    if (username && username !== professor.username) {
      const usernameExists = await Professor.findOne({ username });
      if (usernameExists) {
        return errorResponse(res, 'Username already taken', 400);
      }
    }

    // Update professor fields
    if (name) professor.name = name;
    if (username) professor.username = username;
    if (password) professor.password = password;

    // Save updated professor
    await professor.save();

    return successResponse(res, {
      message: 'Professor updated successfully',
      professor: {
        id: professor._id,
        name: professor.name,
        username: professor.username
      }
    });

  } catch (error) {
    return errorResponse(res, 'Server error while updating professor', 500);
  }
};

/**
 * @desc    Delete professor
 * @route   DELETE /api/professors/:id
 * @access  Private (HOD only)
 */
const deleteProfessor = async (req, res) => {
  try {
    const professorId = req.params.id;
    const hodId = req.user.id;

    // Find professor by ID and created by this HOD
    const professor = await Professor.findOne({
      _id: professorId,
      createdBy: hodId
    });

    if (!professor) {
      return errorResponse(res, 'Professor not found', 404);
    }

    // Remove professor from all classes
    await Class.updateMany(
      { professors: professorId },
      { $pull: { professors: professorId } }
    );

    // Delete professor
    await professor.deleteOne();

    return successResponse(res, {
      message: 'Professor deleted successfully'
    });

  } catch (error) {
    return errorResponse(res, 'Server error while deleting professor', 500);
  }
};

/**
 * @desc    Professor login
 * @route   POST /api/professors/login
 * @access  Public
 */
const loginProfessor = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find professor by username
    const professor = await Professor.findOne({ username });
    if (!professor) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check password
    const isMatch = await professor.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({
      id: professor._id,
      role: 'professor'
    });

    return successResponse(res, {
      message: 'Login successful',
      token,
      professor: {
        id: professor._id,
        name: professor.name,
        username: professor.username
      }
    });

  } catch (error) {
    return errorResponse(res, 'Server error during login', 500);
  }
};

/**
 * @desc    Get professor's assigned classes
 * @route   GET /api/professors/classes
 * @access  Private (Professor only)
 */
const getProfessorClasses = async (req, res) => {
  try {
    const professorId = req.user.id;

    // Find professor to get assigned classes
    const professor = await Professor.findById(professorId);
    if (!professor) {
      return errorResponse(res, 'Professor not found', 404);
    }

    // Find all classes assigned to this professor with students
    const classes = await Class.find({
      professors: professorId
    }).populate('students', 'enrollmentNumber name');

    // Format response
    const formattedClasses = classes.map(cls => ({
      classId: cls.classId,
      className: cls.className,
      division: cls.division,
      students: cls.students.map(student => ({
        id: student._id,
        enrollment: student.enrollmentNumber,
        name: student.name
      }))
    }));

    return successResponse(res, { classes: formattedClasses });

  } catch (error) {
    return errorResponse(res, 'Server error while fetching classes', 500);
  }
};

module.exports = {
  addProfessor,
  getProfessors,
  getProfessorById,
  updateProfessor,
  deleteProfessor,
  loginProfessor,
  getProfessorClasses,
  bulkUploadProfessors,
  bulkDeleteProfessors,
};
