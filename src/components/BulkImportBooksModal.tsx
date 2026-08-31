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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from './Modal';
import { bookService } from '../services/api';

interface BulkImportBooksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedBookRow {
  id: number;
  accessionNumber?: string;
  title: string;
  author: string;
  category: string;
  subCategory?: string;
  language: string;
  publisher: string;
  publisherNumber: string;
  pages?: number;
  publicationYear?: string;
  price?: number;
  supplier?: string;
  shelfLocation?: string;
  totalCopies: number;
  isValid: boolean;
  error?: string;
  selected: boolean;
}

export const BulkImportBooksModal: React.FC<BulkImportBooksModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedBookRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
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
    const templateData = [
      {
        'Accession No (Optional)': 'ACC-1001',
        'Book Title *': 'Panchatantra Stories',
        'Author Name *': 'Vishnu Sharma',
        'Category Name': 'Moral Stories',
        'Sub Category': 'Folk Tales',
        Language: 'Hindi',
        'Total Copies': 5,
        'Price (Rs)': 250,
        'Supplier Name': 'Standard Book Depot',
        'Shelf Location': 'Shelf A-1',
        Publisher: 'National Book Trust',
        'Book ISBN / No': '978-812370001',
        'No of Pages (Optional)': 180,
        'Publication Year (Optional)': '2022',
      },
      {
        'Accession No (Optional)': 'ACC-1002',
        'Book Title *': 'NCERT Mathematics Class 10',
        'Author Name *': 'NCERT Editorial',
        'Category Name': 'Textbook',
        'Sub Category': 'Mathematics',
        Language: 'English',
        'Total Copies': 10,
        'Price (Rs)': 180,
        'Supplier Name': 'Academic Book World',
        'Shelf Location': 'Shelf B-2',
        Publisher: 'NCERT',
        'Book ISBN / No': '978-817450002',
        'No of Pages (Optional)': 320,
        'Publication Year (Optional)': '2024',
      },
      {
        'Accession No (Optional)': '',
        'Book Title *': 'Wings of Fire',
        'Author Name *': 'A.P.J. Abdul Kalam',
        'Category Name': 'Biography',
        'Sub Category': 'Autobiography',
        Language: 'English',
        'Total Copies': 4,
        'Price (Rs)': 395,
        'Supplier Name': 'Standard Book Depot',
        'Shelf Location': 'Shelf C-1',
        Publisher: 'Universities Press',
        'Book ISBN / No': '978-817371146',
        'No of Pages (Optional)': 200,
        'Publication Year (Optional)': '2021',
      },
      {
        'Accession No (Optional)': '',
        'Book Title *': 'Godan',
        'Author Name *': 'Munshi Premchand',
        'Category Name': 'Literature',
        'Sub Category': 'Novel',
        Language: 'Hindi',
        'Total Copies': 6,
        'Price (Rs)': 220,
        'Supplier Name': 'Prakash Books India',
        'Shelf Location': 'Shelf A-2',
        Publisher: 'Lokbharti Prakashan',
        'Book ISBN / No': '978-818534001',
        'No of Pages (Optional)': 280,
        'Publication Year (Optional)': '2020',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Auto fit column widths
    const colWidths = [
      { wch: 22 }, // Accession No
      { wch: 32 }, // Title
      { wch: 24 }, // Author
      { wch: 20 }, // Category
      { wch: 20 }, // Sub Category
      { wch: 14 }, // Language
      { wch: 14 }, // Total Copies
      { wch: 14 }, // Price
      { wch: 24 }, // Supplier
      { wch: 18 }, // Shelf Location
      { wch: 24 }, // Publisher
      { wch: 20 }, // ISBN
      { wch: 20 }, // Pages
      { wch: 22 }, // Publication Year
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Books_Template');
    XLSX.writeFile(workbook, 'School_Library_Books_Import_Template.xlsx');
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
          setErrorMsg('The uploaded sheet is empty. Please add book data.');
          setLoading(false);
          return;
        }

        const rows: ParsedBookRow[] = rawJson.map((row, idx) => {
          const accessionNumber = (
            row['Accession No (Optional)'] ||
            row['Accession No'] ||
            row['Accession Number'] ||
            row['accessionNumber'] ||
            row['Serial No'] ||
            row['Book Serial'] ||
            ''
          )
            .toString()
            .trim();

          const title = (
            row['Book Title *'] ||
            row['Book Title'] ||
            row['title'] ||
            row['Title'] ||
            row['Kitab'] ||
            row['book_title'] ||
            ''
          )
            .toString()
            .trim();

          const author = (
            row['Author Name *'] ||
            row['Author Name'] ||
            row['author'] ||
            row['Author'] ||
            row['Lekhak'] ||
            row['author_name'] ||
            ''
          )
            .toString()
            .trim();

          const category = (
            row['Category Name'] ||
            row['Category'] ||
            row['category'] ||
            row['Genre'] ||
            'General'
          )
            .toString()
            .trim();

          let language = (
            row['Language'] ||
            row['language'] ||
            row['Bhasha'] ||
            'English'
          )
            .toString()
            .trim();

          if (!['Hindi', 'English', 'Other'].includes(language)) {
            const l = language.toLowerCase();
            if (l.includes('hin')) language = 'Hindi';
            else if (l.includes('eng')) language = 'English';
            else language = 'Other';
          }

          const rawCopies =
            row['Total Copies'] ||
            row['Copies'] ||
            row['copies'] ||
            row['Quantity'] ||
            row['Qty'] ||
            5;
          let totalCopies = parseInt(rawCopies, 10);
          if (isNaN(totalCopies) || totalCopies < 1) totalCopies = 1;

          const publisher = (
            row['Publisher'] ||
            row['publisher'] ||
            row['Publisher Name'] ||
            ''
          )
            .toString()
            .trim();

          const publisherNumber = (
            row['Book ISBN / No'] ||
            row['ISBN'] ||
            row['isbn'] ||
            row['Publisher Number'] ||
            row['Book No'] ||
            ''
          )
            .toString()
            .trim();

          const subCategory = (
            row['Sub Category (Optional)'] ||
            row['Sub Category'] ||
            row['subCategory'] ||
            row['SubCategory'] ||
            row['Sub-Category'] ||
            ''
          )
            .toString()
            .trim();

          const rawPages =
            row['No of Pages (Optional)'] ||
            row['No of Pages'] ||
            row['Pages'] ||
            row['pages'] ||
            row['Total Pages'] ||
            row['Page Count'] ||
            0;
          let pages = parseInt(rawPages, 10);
          if (isNaN(pages) || pages <= 0) pages = 0;

          const publicationYear = (
            row['Publication Year (Optional)'] ||
            row['Publication Year'] ||
            row['Year of Publication'] ||
            row['publicationYear'] ||
            row['Year'] ||
            row['year'] ||
            ''
          )
            .toString()
            .trim();

          const rawPrice =
            row['Price (Rs)'] ||
            row['Price'] ||
            row['price'] ||
            row['MRP'] ||
            row['Rate'] ||
            row['Book Price'] ||
            row['Amount'] ||
            0;
          let price = parseFloat(rawPrice);
          if (isNaN(price) || price < 0) price = 0;

          const supplier = (
            row['Supplier Name'] ||
            row['Supplier'] ||
            row['supplier'] ||
            row['Vendor'] ||
            row['Distributor'] ||
            ''
          )
            .toString()
            .trim();

          const shelfLocation = (
            row['Shelf Location'] ||
            row['Shelf'] ||
            row['shelf'] ||
            row['shelfLocation'] ||
            row['Rack'] ||
            row['Location'] ||
            ''
          )
            .toString()
            .trim();

          let isValid = true;
          let error = '';

          if (!title) {
            isValid = false;
            error = 'Missing Title';
          } else if (!author) {
            isValid = false;
            error = 'Missing Author';
          }

          return {
            id: idx + 1,
            accessionNumber: accessionNumber || undefined,
            title,
            author,
            category: category || 'General',
            subCategory: subCategory || undefined,
            language,
            publisher,
            publisherNumber,
            pages: pages > 0 ? pages : undefined,
            publicationYear: publicationYear || undefined,
            price: price > 0 ? price : undefined,
            supplier: supplier || undefined,
            shelfLocation: shelfLocation || undefined,
            totalCopies,
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
        accessionNumber: r.accessionNumber,
        title: r.title,
        author: r.author,
        category: r.category,
        subCategory: r.subCategory,
        language: r.language,
        publisher: r.publisher,
        publisherNumber: r.publisherNumber,
        pages: r.pages,
        publicationYear: r.publicationYear,
        price: r.price,
        supplier: r.supplier,
        shelfLocation: r.shelfLocation,
        totalCopies: r.totalCopies,
        isActive: true,
      }));

      const res = await bookService.bulkImport(payload);
      setImportResult(res);
      onSuccess(res.importedCount);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete book import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Import Books from Excel"
      subtitle="Import book catalog entries with auto or custom accession numbers"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Step 1 & Instructions banner */}
        {!importResult && (
          <div className="bg-blue-50/60 border border-blue-200/70 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Upload Book Catalog Spreadsheet</h4>
                <p className="text-slate-600 mt-0.5">
                  Import hundreds of books in seconds. Auto-generates sequential Accession Numbers (ACC-XXXX) if left empty.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer text-xs"
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
                Books Import Processed Successfully!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {importResult.importedCount} book(s) imported into catalog.
              </p>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="text-left bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs max-h-32 overflow-y-auto">
                <span className="font-semibold text-amber-800 block mb-1">
                  Import Notices:
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
                Done & View Catalog
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
                className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
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
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                        <th className="py-2.5 px-3">Accession No</th>
                        <th className="py-2.5 px-3">Title & Author</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Language</th>
                        <th className="py-2.5 px-3">Copies</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {parsedRows.map((row) => (
                        <tr
                          key={row.id}
                          className={!row.isValid ? 'bg-rose-50/50' : row.selected ? 'bg-blue-50/20' : ''}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              disabled={!row.isValid}
                              checked={row.selected}
                              onChange={() => handleToggleRow(row.id)}
                              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-blue-700">
                            {row.accessionNumber || '(Auto ACC-XXXX)'}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {row.title} <span className="text-slate-500 font-normal">by {row.author}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            <div>{row.category}</div>
                            {row.subCategory && (
                              <div className="text-[10px] text-blue-600 font-medium">{row.subCategory}</div>
                            )}
                          </td>
                          <td className="py-2 px-3">{row.language}</td>
                          <td className="py-2 px-3 font-bold">{row.totalCopies}</td>
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
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {importing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{importing ? 'Importing Books...' : `Import ${validSelectedCount} Books`}</span>
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
