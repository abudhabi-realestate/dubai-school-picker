import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'schools-data.json'), 'utf8'));

const slim = {
  meta: data.meta,
  filters: data.filters,
  schools: data.schools.map((s) => ({
    id: s.id,
    name: s.name,
    nameAr: s.nameAr,
    location: s.location,
    curriculum: s.curriculum,
    grades: s.grades,
    rating: s.rating,
    ratingYear: s.ratingYear,
    rating2022: s.rating2022,
    students: s.students,
    phone: s.phone,
    website: s.website,
    email: s.email,
    established: s.established,
    feeMin: s.feeMin,
    feeMax: s.feeMax,
    lat: s.lat,
    lng: s.lng,
    khdaUrl: s.khdaUrl,
    centerId: s.centerId,
  })),
};

const faq = JSON.parse(fs.readFileSync(path.join(__dirname, 'khda-parent-faq.json'), 'utf8'));

const template = fs.readFileSync(path.join(__dirname, '选校助手-template.html'), 'utf8');
const html = template
  .replace('__SCHOOL_DATA__', JSON.stringify(slim))
  .replace('__FAQ_DATA__', JSON.stringify(faq));
fs.writeFileSync(path.join(__dirname, '迪拜选校助手.html'), html, 'utf8');
fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');
console.log(`Generated 迪拜选校助手.html + index.html (${slim.schools.length} schools)`);
