import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const xlsxPath = path.join(__dirname, 'DubaiPrivateSchoolsOpenData.xlsx');
const dirHtmlPath = path.join(__dirname, 'khda-dir.html');
const outPath = path.join(__dirname, 'schools-data.json');

const XLSX_URL = 'https://web.khda.gov.ae/KHDA/media/KHDA/DubaiPrivateSchoolsOpenData.xlsx';
const DIR_URL = 'https://web.khda.gov.ae/en/Education-Directory/schools';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function decodeHtml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(s) {
  return decodeHtml(s)
    .toLowerCase()
    .replace(/\bl\.?\s*l\.?\s*c\.?\b/g, '')
    .replace(/\bllc\b/g, '')
    .replace(/\bfzco\b/g, '')
    .replace(/\bfze\b/g, '')
    .replace(/\bfz\b/g, '')
    .replace(/\bdubai branch\b/g, '')
    .replace(/\bbr of\b/g, ' ')
    .replace(/\bbranch of\b/g, ' ')
    .replace(/\bprivate school\b/g, ' school')
    .replace(/\binternational school\b/g, ' school')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NAME_STOP = new Set([
  'school', 'private', 'international', 'academy', 'college', 'dubai',
  'the', 'and', 'for', 'high', 'primary', 'secondary', 'community',
  'english', 'national', 'llc',
]);

function distinctiveTokens(s) {
  return new Set(
    normalizeName(s)
      .split(' ')
      .filter((w) => w.length > 2 && !NAME_STOP.has(w)),
  );
}

function uniqueParts(s) {
  return [...new Set(String(s || '').replace(/\\/g, '/').split(',').map((x) => x.trim()).filter(Boolean))].join(', ');
}

function coreName(s) {
  return normalizeName(
    String(s || '').replace(/\(\s*brs?\s+of\s+[^)]+\)/gi, '').replace(/\(\s*branch\s+of\s+[^)]+\)/gi, ''),
  );
}

function nameJaccard(a, b) {
  const ta = distinctiveTokens(a);
  const tb = distinctiveTokens(b);
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / new Set([...ta, ...tb]).size;
}

async function ensureFile(url, dest, binary) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return dest;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download failed ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

function parseDirectory(html) {
  const start = html.indexOf('id="divSchoolList"');
  if (start < 0) throw new Error('KHDA directory list not found');
  const pager = html.indexOf('id="p_lt_ctl22_plcContent_p_lt_updPager"', start);
  const chunk = html.slice(start, pager > 0 ? pager : html.length);
  const rows = chunk.split(/<tr[\s>]/i).slice(1);
  const seen = new Set();
  const schools = [];

  for (const row of rows) {
    const idM = row.match(/data-schoolid=['"](\d+)['"]/i);
    const centerM = row.match(/data-educationcenterid=['"](\d+)['"]/i);
    const nameM = row.match(/id="lnkName"[^>]*>([^<]+)</i);
    if (!idM || !centerM || !nameM) continue;
    const schoolId = Number(idM[1]);
    if (seen.has(schoolId)) continue;
    seen.add(schoolId);

    const ratingRaw = decodeHtml((row.match(/class="rating-text">([^<]*)</i) || [])[1]);
    const ratingYearRaw = decodeHtml((row.match(/class="rating-sub-text">([^<]*)</i) || [])[1]);
    const rating = /not applicable|n\/a|^$|not inspected/i.test(ratingRaw) ? '' : ratingRaw;
    const ratingYear = (ratingYearRaw.match(/(\d{4}\s*-\s*\d{4})/) || [])[1]?.replace(/\s+/g, '') || '';

    schools.push({
      id: schoolId,
      centerId: Number(centerM[1]),
      name: decodeHtml(nameM[1]),
      location: decodeHtml((row.match(/id="lblArea">([^<]*)</i) || [])[1]),
      phone: decodeHtml((row.match(/id="lblTelephone">([^<]*)</i) || [])[1]),
      curriculum: decodeHtml((row.match(/id="lblCurriculums">([^<]*)</i) || [])[1]),
      grades: decodeHtml((row.match(/id="lblgradeRange">([^<]*)</i) || [])[1]),
      rating,
      ratingYear,
      khdaUrl: `https://web.khda.gov.ae/en/Education-Directory/Schools/School-Details?Id=${schoolId}&CenterID=${centerM[1]}`,
    });
  }
  return schools;
}

function loadOpenData() {
  const wb = XLSX.readFile(xlsxPath);
  const mainWs = wb.Sheets['Main information 2024-2025'];
  const feesWs = wb.Sheets['Fees 2024-2025'];
  if (!mainWs || !feesWs) throw new Error('Expected 2024-2025 sheets missing');

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
  return schools;
}

function findOpenMatch(dirSchool, openSchools, used) {
  const nDir = coreName(dirSchool.name);
  for (const s of openSchools) {
    if (used.has(s.name)) continue;
    if (coreName(s.name) === nDir) return s;
  }
  let best = null;
  let bestScore = 0;
  for (const s of openSchools) {
    if (used.has(s.name)) continue;
    const score = nameJaccard(dirSchool.name, s.name);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  if (best && bestScore >= 0.8) return best;
  return null;
}

async function main() {
  await ensureFile(XLSX_URL, xlsxPath, true);
  try {
    await ensureFile(DIR_URL, dirHtmlPath, false);
  } catch (err) {
    if (!fs.existsSync(dirHtmlPath)) throw err;
    console.warn('Using cached KHDA directory HTML:', err.message);
  }

  const dirSchools = parseDirectory(fs.readFileSync(dirHtmlPath, 'utf8'));
  const openSchools = loadOpenData();
  const used = new Set();
  const unmatchedDir = [];
  const merged = [];

  for (const d of dirSchools) {
    const o = findOpenMatch(d, openSchools, used);
    if (o) used.add(o.name);
    else unmatchedDir.push(d.name);

    merged.push({
      id: d.id,
      centerId: d.centerId,
      khdaUrl: d.khdaUrl,
      name: d.name,
      nameAr: o?.nameAr || '',
      location: d.location || o?.location || '',
      curriculum: uniqueParts(d.curriculum || o?.curriculum || ''),
      grades: uniqueParts(d.grades || o?.grades || ''),
      rating: d.rating || '',
      ratingYear: d.ratingYear || '',
      ratingOpenData: o?.rating || '',
      rating2022: o?.rating2022 || '',
      students: o?.students ?? null,
      phone: d.phone || o?.phone || '',
      website: o?.website || '',
      email: o?.email || '',
      established: o?.established ?? null,
      feeMin: o?.feeMin ?? null,
      feeMax: o?.feeMax ?? null,
      fees: o?.fees || {},
      lat: o?.lat ?? null,
      lng: o?.lng ?? null,
    });
  }

  const unmatchedOpen = openSchools.filter((s) => !used.has(s.name)).map((s) => s.name);
  const curricula = [...new Set(merged.flatMap((s) => s.curriculum.split(',').map((x) => x.trim()).filter(Boolean)))].sort();
  const locations = [...new Set(merged.map((s) => s.location).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const ratings = [...new Set(merged.map((s) => s.rating).filter(Boolean))].sort();
  const ratingYears = [...new Set(merged.map((s) => s.ratingYear).filter(Boolean))];

  const meta = {
    source: 'KHDA Education Directory + Dubai Private Schools Open Data',
    sourceUrl: DIR_URL,
    dataDownloadUrl: XLSX_URL,
    academicYear: ratingYears[0] || '2025-2026',
    feesYear: '2024-2025',
    enrollmentsYear: '2024-2025',
    extractedAt: new Date().toISOString().slice(0, 10),
    totalSchools: merged.length,
    matchedOpenData: used.size,
    note: 'School names, ratings, locations and KHDA profile links from the live KHDA directory. Tuition bands and 2024/25 enrollments from KHDA open data. Verify on KHDA before enrollment decisions.',
  };

  fs.writeFileSync(outPath, JSON.stringify({ meta, filters: { curricula, locations, ratings }, schools: merged }, null, 2), 'utf8');
  console.log(`Wrote ${merged.length} schools (${used.size} matched to open-data fees)`);
  if (unmatchedDir.length) {
    console.log(`Directory-only (no fees yet): ${unmatchedDir.length}`);
    unmatchedDir.forEach((n) => console.log('  +', n));
  }
  if (unmatchedOpen.length) {
    console.log(`Open-data unmatched: ${unmatchedOpen.length}`);
    unmatchedOpen.forEach((n) => console.log('  -', n));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
