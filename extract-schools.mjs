import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const xlsxPath = path.join(__dirname, 'DubaiPrivateSchoolsOpenData.xlsx');
const outPath = path.join(__dirname, 'schools-data.json');

const wb = XLSX.readFile(xlsxPath);
const mainWs = wb.Sheets['Main information 2024-2025'];
const feesWs = wb.Sheets['Fees 2024-2025'];

const mainRows = XLSX.utils.sheet_to_json(mainWs, { header: 1, defval: '' });
const feesRows = XLSX.utils.sheet_to_json(feesWs, { header: 1, defval: '' });

const mainHeader = mainRows[1];
const feesHeader = feesRows[1];

const col = (name) => mainHeader.findIndex((h) => String(h).replace(/\r\n/g, ' ').trim() === name);

const IDX = {
  name: col('School Name'),
  nameAr: col('اسم المدرسة'),
  location: col('Location'),
  lat: col('Latitude'),
  lng: col('Longitude'),
  curriculum: col('Curriculum'),
  phone: col('Main Telephone'),
  website: col('School Website'),
  email: col('School Email Address'),
  grades: col('Grades'),
  established: col('Year Established in Dubai'),
  latestRating: col('Latest DSIB Rating'),
  rating2022: col('2022/23 DSIB Rating'),
  students: col('2024/25 Enrollments'),
};

const feeGradeCols = feesHeader
  .map((h, i) => ({ h: String(h).trim(), i }))
  .filter(({ h, i }) => i >= 3 && h && h !== '');

const feesByName = new Map();
for (let r = 2; r < feesRows.length; r++) {
  const row = feesRows[r];
  const name = row[1];
  if (!name) continue;
  const fees = {};
  const values = [];
  for (const { h, i } of feeGradeCols) {
    const v = row[i];
    if (v !== '' && v != null && !Number.isNaN(Number(v))) {
      fees[h] = Number(v);
      values.push(Number(v));
    }
  }
  feesByName.set(name, {
    fees,
    feeMin: values.length ? Math.min(...values) : null,
    feeMax: values.length ? Math.max(...values) : null,
  });
}

const normalizeRating = (r) => {
  const s = String(r || '').trim();
  if (!s) return '';
  if (/unsatisfactory/i.test(s)) return 'Weak';
  return s.replace(/\s*- FT$/i, '').trim();
};

const schools = [];
for (let r = 2; r < mainRows.length; r++) {
  const row = mainRows[r];
  const name = row[IDX.name];
  if (!name) continue;

  const feeInfo = feesByName.get(name) || { fees: {}, feeMin: null, feeMax: null };
  const lat = Number(row[IDX.lat]);
  const lng = Number(row[IDX.lng]);
  const students = row[IDX.students];

  schools.push({
    id: row[0] || r - 1,
    name,
    nameAr: row[IDX.nameAr] || '',
    location: row[IDX.location] || '',
    curriculum: row[IDX.curriculum] || '',
    grades: row[IDX.grades] || '',
    rating: normalizeRating(row[IDX.latestRating]),
    rating2022: normalizeRating(row[IDX.rating2022]),
    students: students === '' ? null : Number(students),
    phone: String(row[IDX.phone] || '').trim(),
    website: String(row[IDX.website] || '').trim(),
    email: String(row[IDX.email] || '').trim(),
    established: row[IDX.established] === '' ? null : Number(row[IDX.established]),
    feeMin: feeInfo.feeMin,
    feeMax: feeInfo.feeMax,
    fees: feeInfo.fees,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  });
}

const meta = {
  source: 'KHDA Dubai Private Schools Open Data',
  sourceUrl: 'https://web.khda.gov.ae/en/Education-Directory/schools',
  dataDownloadUrl: 'https://web.khda.gov.ae/KHDA/media/KHDA/DubaiPrivateSchoolsOpenData.xlsx',
  academicYear: '2024-2025',
  extractedAt: new Date().toISOString().slice(0, 10),
  totalSchools: schools.length,
  note: 'DSIB ratings and fees from KHDA open data. Verify on KHDA website before enrollment decisions.',
};

const curricula = [...new Set(schools.map((s) => s.curriculum).filter(Boolean))].sort();
const locations = [...new Set(schools.map((s) => s.location).filter(Boolean))].sort();
const ratings = [...new Set(schools.map((s) => s.rating).filter(Boolean))].sort();

const output = { meta, filters: { curricula, locations, ratings }, schools };
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`Wrote ${schools.length} schools to ${outPath}`);
