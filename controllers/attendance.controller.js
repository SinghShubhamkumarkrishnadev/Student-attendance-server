// controllers/attendance.controller.js
const mongoose = require('mongoose');
const Attendance = require('../models/attendance.model');
const Class = require('../models/class.model');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * Verify professor access to a class.
 *  - Class must exist and belong to the same HOD (createdBy = req.user.hodId)
 *  - If class has assigned professors list, ensure membership
 */
async function verifyProfessorAccessToClass(professorId, hodId, classId) {
  const cls = await Class.findOne({ _id: classId, createdBy: hodId }).lean();
  if (!cls) return { ok: false, code: 404, msg: 'Class not found' };

  const profList = cls.professors || cls.assignedProfessors;
  if (Array.isArray(profList) && profList.length > 0) {
    const isAssigned = profList.some((p) => String(p) === String(professorId));
    if (!isAssigned) return { ok: false, code: 403, msg: 'Not assigned to this class' };
  }

  return { ok: true };
}

/**
 * Normalize date from either dateMs (number) or date (YYYY-MM-DD).
 */
function resolveDateMs({ dateMs, date }) {
  if (dateMs !== undefined && dateMs !== null && dateMs !== '') return Number(dateMs);
  if (date) {
    const d = new Date(date);
    const time = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return Number.isNaN(time) ? null : time; // ✅ NaN guard
  }
  return null;
}

// ========== BULK ATTENDANCE ==========
exports.markBulkAttendance = async (req, res, next) => {
  try {
    const { classId, slotNumber, records, dateMs, date } = req.body;
    const professorId = req.user.id;
    const hodId = req.user.hodId;

    if (!classId || slotNumber == null || !Array.isArray(records)) {
      return errorResponse(res, 'classId, slotNumber, and records[] are required', 400);
    }
    if (records.length === 0) {
      return errorResponse(res, 'records[] cannot be empty', 400);
    }

    const normalizedDateMs = resolveDateMs({ dateMs, date });
    if (!normalizedDateMs) {
      return errorResponse(res, 'Provide dateMs or date (YYYY-MM-DD)', 400);
    }

    const access = await verifyProfessorAccessToClass(professorId, hodId, classId);
    if (!access.ok) return errorResponse(res, access.msg, access.code);

    // ✅ Deduplicate by studentId (last record wins)
    const dedupedMap = new Map();
    const skippedStudentIds = [];

    for (const rec of records) {
      if (!mongoose.Types.ObjectId.isValid(rec.studentId)) {
        skippedStudentIds.push(rec.studentId); // invalid ObjectId
        continue;
      }
      if (dedupedMap.has(rec.studentId)) {
        skippedStudentIds.push(rec.studentId); // duplicate in request
      }
      dedupedMap.set(rec.studentId, rec); // keep last one
    }

    const dedupedRecords = Array.from(dedupedMap.values());

    const ops = dedupedRecords.map((rec) => ({
      updateOne: {
        filter: {
          studentId: rec.studentId,
          classId,
          dateMs: normalizedDateMs,
          slotNumber: Number(slotNumber),
        },
        update: {
          $set: { isPresent: !!rec.isPresent, markedBy: professorId },
          $setOnInsert: {
            studentId: rec.studentId,
            classId,
            dateMs: normalizedDateMs,
            slotNumber: Number(slotNumber),
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await Attendance.bulkWrite(ops);
    }

    return successResponse(
      res,
      {
        message: 'Attendance processed',
        savedCount: dedupedRecords.length,
        skippedCount: skippedStudentIds.length,
        skippedStudentIds,
      },
      200
    );
  } catch (err) {
    next(err);
  }
};


// ========== CLASS ATTENDANCE BY DATE ==========
exports.getAttendanceByDate = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { slotNumber, dateMs, date } = req.query;

    if (!classId) return errorResponse(res, 'classId is required', 400);

    const normalizedDateMs = resolveDateMs({ dateMs, date });
    if (!normalizedDateMs) return errorResponse(res, 'Provide dateMs or date (YYYY-MM-DD)', 400);

    const filter = { classId, dateMs: normalizedDateMs };
    if (slotNumber != null) filter.slotNumber = Number(slotNumber); // ✅ allow 0

    const records = await Attendance.find(filter)
      .populate('studentId', 'enrollmentNumber name')
      .populate('classId', 'className division') // ✅ optional helpful context
      .populate('markedBy', 'name username') // ✅ prefer name, fallback username
      .lean();

    // ✅ Strip Mongo internals & flatten for frontend
    const cleaned = records.map((r) => ({
      id: String(r._id),
      date: new Date(r.dateMs).toISOString(),
      slotNumber: r.slotNumber,
      isPresent: !!r.isPresent,
      studentName: r.studentId?.name || '',
      enrollmentNumber: r.studentId?.enrollmentNumber || '',
      className: r.classId?.className || '',
      division: r.classId?.division || '',
      markedBy: r.markedBy?.name || r.markedBy?.username || '',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    }));

    return successResponse(res, { records: cleaned });
  } catch (err) {
    next(err);
  }
};

// ========== FLEXIBLE CLASS ATTENDANCE ==========
exports.getClassAttendance = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { dateMs, slotNumber } = req.query;

    if (!classId) return errorResponse(res, 'classId is required', 400);

    const filter = { classId };
    if (dateMs != null) filter.dateMs = Number(dateMs); // ✅ allow 0
    if (slotNumber != null) filter.slotNumber = Number(slotNumber);

    const records = await Attendance.find(filter)
      .populate('studentId', 'enrollmentNumber name')
      .populate('classId', 'className division')
      .populate('markedBy', 'name username')
      .lean();

    const cleaned = records.map((r) => ({
      id: String(r._id),
      date: new Date(r.dateMs).toISOString(),
      slotNumber: r.slotNumber,
      isPresent: !!r.isPresent,
      studentName: r.studentId?.name || '',
      enrollmentNumber: r.studentId?.enrollmentNumber || '',
      className: r.classId?.className || '',
      division: r.classId?.division || '',
      markedBy: r.markedBy?.name || r.markedBy?.username || '',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    }));

    return successResponse(res, { records: cleaned });
  } catch (err) {
    next(err);
  }
};

// ========== STUDENT ATTENDANCE ==========
exports.getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    let { month, year } = req.query;

    if (!studentId) return errorResponse(res, 'studentId is required', 400);

    const filter = { studentId };

    if (month && year) {
      month = Number(month);
      year = Number(year);
      if (!Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12) {
        return errorResponse(res, 'Invalid month/year', 400);
      }
      const start = new Date(year, month - 1, 1).getTime();
      const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
      filter.dateMs = { $gte: start, $lte: end };
    }

    const records = await Attendance.find(filter)
      .populate('classId', 'className division')
      .populate('markedBy', 'name username')
      .lean();

    const cleaned = records.map((r) => ({
      id: String(r._id),
      date: new Date(r.dateMs).toISOString(),
      slotNumber: r.slotNumber,
      isPresent: !!r.isPresent,
      className: r.classId?.className || '',
      division: r.classId?.division || '',
      markedBy: r.markedBy?.name || r.markedBy?.username || '',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    }));

    return successResponse(res, { records: cleaned });
  } catch (err) {
    next(err);
  }
};


// ========== MONTHLY SUMMARY ==========
exports.getMonthlySummary = async (req, res, next) => {
  try {
    const { classId } = req.params;
    let { month, year } = req.query;

    if (!classId || !month || !year) {
      return errorResponse(res, 'classId, month, and year are required', 400);
    }

    month = Number(month);
    year = Number(year);
    if (!Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12) {
      return errorResponse(res, 'Invalid month/year', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return errorResponse(res, 'Invalid classId', 400);
    }

    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    const classObjId = new mongoose.Types.ObjectId(classId);

    const records = await Attendance.aggregate([
      {
        $match: {
          classId: classObjId,
          dateMs: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$studentId',
          totalClasses: { $sum: 1 },
          presents: { $sum: { $cond: ['$isPresent', 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $project: {
          studentId: '$_id',
          enrollmentNumber: '$student.enrollmentNumber',
          name: '$student.name',
          totalClasses: 1,
          presents: 1,
          absents: { $subtract: ['$totalClasses', '$presents'] },
          percentage: {
            $cond: [
              { $eq: ['$totalClasses', 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ['$presents', '$totalClasses'] }, 100] }, 2] },
            ],
          },
        },
      },
      { $sort: { enrollmentNumber: 1 } },
    ]);

    // ✅ Clean shape for frontend
    const cleaned = records.map((r) => ({
      enrollmentNumber: r.enrollmentNumber || '',
      name: r.name || '',
      totalClasses: r.totalClasses || 0,
      presents: r.presents || 0,
      absents: r.absents || 0,
      percentage: r.percentage || 0,
    }));

    return successResponse(res, { month, year, classId, summary: cleaned });
  } catch (err) {
    next(err);
  }
};



exports.getStudentAttendanceForSelf = async (req, res, next) => {
  try {
    const studentId = req.student._id;
    let { month, year } = req.query;

    const filter = { studentId };

    if (month && year) {
      month = Number(month);
      year = Number(year);
      if (!Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12) {
        return errorResponse(res, 'Invalid month/year', 400);
      }
      const start = new Date(year, month - 1, 1).getTime();
      const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
      filter.dateMs = { $gte: start, $lte: end };
    }

    const records = await Attendance.find(filter)
      .populate('classId', 'className division')
      .populate('markedBy', 'name username')
      .lean();

    const cleaned = records.map((r) => ({
      id: String(r._id),
      date: new Date(r.dateMs).toISOString(),
      slotNumber: r.slotNumber,
      isPresent: !!r.isPresent,
      className: r.classId?.className || '',
      division: r.classId?.division || '',
      markedBy: r.markedBy?.name || r.markedBy?.username || '',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    }));

    return successResponse(res, { records: cleaned });
  } catch (err) {
    next(err);
  }
};

