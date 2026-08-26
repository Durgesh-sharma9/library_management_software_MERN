import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  HelpCircle,
  RefreshCw,
  Trash2,
  Users,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from './Modal';
import { memberService } from '../services/api';

interface BulkImportMembersModalProps {
  isOpen: boolean;
  memberType?: 'student' | 'teacher';
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedMemberRow {
  id: number;
  memberId: string;
  admissionNo?: string;
  name: string;
  whatsapp: string;
  email: string;
  className: string;
  section: string;
  designation?: string;
  department?: string;
  status: string;
  isValid: boolean;
  error?: string;
  selected: boolean;
}

export const BulkImportMembersModal: React.FC<BulkImportMembersModalProps> = ({
  isOpen,
  memberType = 'student',
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedMemberRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    updatedCount?: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Generate and Download Excel Template
  const handleDownloadTemplate = () => {
    if (memberType === 'teacher') {
      const templateData = [
        {
          'Staff ID (Optional)': 'LIB-T001',
          'Teacher Name *': 'Dr. Rajesh Sharma',
          'Designation *': 'PGT Physics',
          'Department *': 'Science',
          'WhatsApp Number *': '9876543210',
          Email: 'rajesh.sharma@school.edu',
          Status: 'Active',
        },
        {
          'Staff ID (Optional)': 'LIB-T002',
          'Teacher Name *': 'Priya Malhotra',
          'Designation *': 'TGT Mathematics',
          'Department *': 'Mathematics',
          'WhatsApp Number *': '9812345678',
          Email: 'priya.m@school.edu',
          Status: 'Active',
        },
        {
          'Staff ID (Optional)': '',
          'Teacher Name *': 'Anil Deshmukh',
          'Designation *': 'PRT English',
          'Department *': 'Languages',
          'WhatsApp Number *': '9988776655',
          Email: 'anil.d@school.edu',
          Status: 'Active',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      worksheet['!cols'] = [
        { wch: 22 }, // Staff ID
        { wch: 26 }, // Name
        { wch: 20 }, // Designation
        { wch: 20 }, // Department
        { wch: 20 }, // WhatsApp
        { wch: 28 }, // Email
        { wch: 14 }, // Status
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers_Staff');
      XLSX.writeFile(workbook, 'School_Library_Teachers_Template.xlsx');
    } else {
      const templateData = [
        {
          'Student ID (Optional)': 'LIB-0010',
          'Admission No (Optional)': 'ADM-2024-101',
          'Student Name *': 'Aarav Sharma',
          Class: 'Class 10',
          Section: 'A',
          'WhatsApp Number *': '9876543210',
          Email: 'aarav.sharma@example.com',
          Status: 'Active',
        },
        {
          'Student ID (Optional)': 'LIB-0011',
          'Admission No (Optional)': 'ADM-2024-102',
          'Student Name *': 'Priya Patel',
          Class: 'Class 9',
          Section: 'B',
          'WhatsApp Number *': '9812345678',
          Email: 'priya.patel@example.com',
          Status: 'Active',
        },
        {
          'Student ID (Optional)': '',
          'Admission No (Optional)': '',
          'Student Name *': 'Rohan Verma',
          Class: 'Class 11',
          Section: 'A',
          'WhatsApp Number *': '9988776655',
          Email: 'rohan.v@example.com',
          Status: 'Active',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      worksheet['!cols'] = [
        { wch: 22 }, // Student ID
        { wch: 22 }, // Admission No
        { wch: 26 }, // Name
        { wch: 14 }, // Class
        { wch: 12 }, // Section
        { wch: 20 }, // WhatsApp
        { wch: 28 }, // Email
        { wch: 14 }, // Status
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, 'School_Library_Students_Template.xlsx');
    }
  };

  // Parse Excel / CSV File
  const handleProcessFile = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg('');
    setLoading(true);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setErrorMsg('The uploaded Excel file has no readable sheets.');
          setLoading(false);
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawJson.length === 0) {
          setErrorMsg('The uploaded sheet is empty.');
          setLoading(false);
          return;
        }

        const rows: ParsedMemberRow[] = rawJson.map((row, idx) => {
          const name = (
            row['Teacher Name *'] ||
            row['Student Name *'] ||
            row['Name *'] ||
            row['Student Name'] ||
            row['Teacher Name'] ||
            row['Name'] ||
            row['name'] ||
            row['Member Name'] ||
            row['Full Name'] ||
            ''
          )
            .toString()
            .trim();

          const whatsapp = (
            row['WhatsApp Number *'] ||
            row['WhatsApp Number'] ||
            row['WhatsApp'] ||
            row['whatsapp'] ||
            row['Phone'] ||
            row['phone'] ||
            row['Mobile'] ||
            row['Contact'] ||
            ''
          )
            .toString()
            .trim();

          const memberId = (
            row['Staff ID (Optional)'] ||
            row['Student ID (Optional)'] ||
            row['Member ID (Optional)'] ||
            row['Member ID'] ||
            row['memberId'] ||
            row['Staff ID'] ||
            row['Student ID'] ||
            row['ID'] ||
            ''
          )
            .toString()
            .trim();

          const admissionNo = (
            row['Admission No (Optional)'] ||
            row['Admission No'] ||
            row['admissionNo'] ||
            row['Roll No'] ||
            ''
          )
            .toString()
            .trim();

          const className = (
            row['Class'] ||
            row['className'] ||
            row['Class Name'] ||
            row['Grade'] ||
            (memberType === 'teacher' ? 'Staff' : '')
          )
            .toString()
            .trim();

          const section = (
            row['Section'] ||
            row['section'] ||
            row['Sec'] ||
            ''
          )
            .toString()
            .trim();

          const designation = (
            row['Designation *'] ||
            row['Designation'] ||
            row['Role'] ||
            (memberType === 'teacher' ? 'Teacher' : '')
          )
            .toString()
            .trim();

          const department = (
            row['Department *'] ||
            row['Department'] ||
            row['Dept'] ||
            (memberType === 'teacher' ? 'Academics' : '')
          )
            .toString()
            .trim();

          const email = (
            row['Email'] ||
            row['email'] ||
            row['Email Address'] ||
            ''
          )
            .toString()
            .trim();

          let status = (
            row['Status'] ||
            row['status'] ||
            'Active'
          )
            .toString()
            .toLowerCase()
            .trim();
          if (status !== 'inactive') status = 'active';

          let isValid = true;
          let error = '';

          if (!name) {
            isValid = false;
            error = 'Missing Name';
          }

          return {
            id: idx + 1,
            memberId: memberId || '(Auto ID)',
            admissionNo,
            name,
            whatsapp: whatsapp || '9876543210',
            email,
            className: className || (memberType === 'teacher' ? 'Staff' : 'Class 10'),
            section: section || (memberType === 'teacher' ? department : 'A'),
            designation,
            department,
            status,
            isValid,
            error,
            selected: isValid,
          };
        });

        setParsedRows(rows);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setErrorMsg('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading file.');
      setLoading(false);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleProcessFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleProcessFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Toggle selection
  const handleToggleRow = (id: number) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleToggleAll = (checked: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.isValid ? { ...r, selected: checked } : r))
    );
  };

  const validSelectedCount = parsedRows.filter((r) => r.isValid && r.selected).length;

  // Execute Import
  const handleExecuteImport = async () => {
    const selectedToImport = parsedRows.filter((r) => r.isValid && r.selected);
    if (selectedToImport.length === 0) {
      setErrorMsg('No valid rows selected for import.');
      return;
    }

    try {
      setImporting(true);
      setErrorMsg('');

      const payload = selectedToImport.map((r) => ({
        memberType,
        memberId: r.memberId === '(Auto ID)' ? '' : r.memberId,
        admissionNo: r.admissionNo || '',
        name: r.name,
        whatsapp: r.whatsapp,
        email: r.email,
        className: r.className,
        section: r.section,
        designation: r.designation,
        department: r.department,
        status: r.status,
      }));

      const res = await memberService.bulkImport(payload);
      setImportResult(res);
      onSuccess(res.importedCount + (res.updatedCount || 0));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete member import.');
    } finally {
      setImporting(false);
    }
  };

  const isTeacher = memberType === 'teacher';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isTeacher ? 'Bulk Import Teachers / Staff from Excel' : 'Bulk Import Students from Excel'}
      subtitle={isTeacher ? 'Upload faculty directory spreadsheet' : 'Upload student class directory spreadsheet'}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Step 1 & Instructions banner */}
        {!importResult && (
          <div className="bg-indigo-50/60 border border-indigo-200/70 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                {isTeacher ? <Briefcase className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="font-bold text-slate-900">
                  {isTeacher ? 'Faculty & Staff Spreadsheet' : 'Class Students Spreadsheet'}
                </h4>
                <p className="text-slate-600 mt-0.5">
                  Import multiple records at once. Auto-generates sequential IDs if left blank.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Template</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Import Success Dialog */}
        {importResult ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Import Processed Successfully!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {importResult.importedCount} new {isTeacher ? 'teacher(s)' : 'student(s)'} added
                {importResult.updatedCount ? `, and ${importResult.updatedCount} existing record(s) updated` : ''}.
              </p>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="text-left bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs max-h-32 overflow-y-auto">
                <span className="font-semibold text-amber-800 block mb-1">
                  Import Notices / Skipped Rows:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-700">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Done & Return to Directory
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Drag and Drop Zone */}
            {parsedRows.length === 0 && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    Click to upload or drag & drop Excel / CSV file
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Supports .xlsx, .xls, .csv files
                  </span>
                </div>
              </div>
            )}

            {/* Parsed Rows Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={validSelectedCount === parsedRows.filter((r) => r.isValid).length && validSelectedCount > 0}
                      onChange={(e) => handleToggleAll(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700">
                      Selected {validSelectedCount} of {parsedRows.length} rows to import
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-slate-400 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear File</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 sticky top-0 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">{isTeacher ? 'Staff ID' : 'ID / Adm'}</th>
                        <th className="py-2.5 px-3">{isTeacher ? 'Designation / Dept' : 'Class / Sec'}</th>
                        <th className="py-2.5 px-3">WhatsApp</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {parsedRows.map((row) => (
                        <tr
                          key={row.id}
                          className={!row.isValid ? 'bg-rose-50/50' : row.selected ? 'bg-indigo-50/20' : ''}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              disabled={!row.isValid}
                              checked={row.selected}
                              onChange={() => handleToggleRow(row.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {row.name || <span className="text-rose-500">Missing Name</span>}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-blue-700">
                            {row.memberId} {row.admissionNo ? `(${row.admissionNo})` : ''}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {isTeacher
                              ? `${row.designation || 'Teacher'} • ${row.department || 'Academics'}`
                              : `${row.className || 'Class 10'} (${row.section || 'A'})`}
                          </td>
                          <td className="py-2 px-3">{row.whatsapp}</td>
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="text-emerald-600 font-semibold">Ready</span>
                            ) : (
                              <span className="text-rose-600 font-bold">{row.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    File: <strong>{file?.name}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={importing || validSelectedCount === 0}
                      onClick={handleExecuteImport}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {importing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{importing ? 'Importing Records...' : `Import ${validSelectedCount} Records`}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
