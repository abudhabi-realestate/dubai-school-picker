import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const slim = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'slim-for-canvas.json'), 'utf8'),
);
const dataStr = JSON.stringify(slim, null, 2);

const canvas = `import {
  BarChart,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  Link,
  Select,
  Stack,
  Stat,
  Table,
  Text,
  TextInput,
  useCanvasState,
} from 'cursor/canvas';

const DATA = ${dataStr} as const;

type School = (typeof DATA)['schools'][number];

interface Filters {
  q: string;
  curriculum: string;
  location: string;
  rating: string;
  sort: string;
  feeMax: string;
}

interface CanvasState {
  filters: Filters;
  compare: number[];
}

const RATING_ORDER: Record<string, number> = {
  Outstanding: 5,
  'Very good': 4,
  Good: 3,
  Acceptable: 2,
  Weak: 1,
  'Very weak': 0,
};

const RATING_LABEL: Record<string, string> = {
  Outstanding: 'Outstanding',
  'Very good': 'Very good',
  Good: 'Good',
  Acceptable: 'Acceptable',
};

function formatFee(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en-AE');
}

function formatFeeRange(s: School) {
  if (s.feeMin == null && s.feeMax == null) return '—';
  if (s.feeMin === s.feeMax) return formatFee(s.feeMin);
  return \`\${formatFee(s.feeMin)} – \${formatFee(s.feeMax)}\`;
}

function filterSchools(filters: Filters): School[] {
  const feeMax = filters.feeMax ? Number(filters.feeMax) : Infinity;
  const q = filters.q.trim().toLowerCase();
  let list = DATA.schools.filter((s) => {
    if (q && !s.name.toLowerCase().includes(q) && !s.location.toLowerCase().includes(q)) return false;
    if (filters.curriculum && s.curriculum !== filters.curriculum) return false;
    if (filters.location && s.location !== filters.location) return false;
    if (filters.rating === '__none__' && s.rating) return false;
    if (filters.rating && filters.rating !== '__none__' && s.rating !== filters.rating) return false;
    if (s.feeMax != null && s.feeMax > feeMax) return false;
    return true;
  });
  list = [...list].sort((a, b) => {
    switch (filters.sort) {
      case 'fee-asc':
        return (a.feeMin ?? 1e9) - (b.feeMin ?? 1e9);
      case 'fee-desc':
        return (b.feeMax ?? -1) - (a.feeMax ?? -1);
      case 'students-desc':
        return (b.students ?? -1) - (a.students ?? -1);
      case 'name-asc':
        return a.name.localeCompare(b.name);
      default:
        return (RATING_ORDER[b.rating ?? ''] ?? -1) - (RATING_ORDER[a.rating ?? ''] ?? -1) || a.name.localeCompare(b.name);
    }
  });
  return list;
}

export default function DubaiSchoolPicker() {
  const [state, setState] = useCanvasState<CanvasState>({
    filters: { q: '', curriculum: '', location: '', rating: '', sort: 'rating-desc', feeMax: '150000' },
    compare: [],
  });
  const { filters, compare } = state;
  const list = filterSchools(filters);

  const ratingCounts = ['Outstanding', 'Very good', 'Good', 'Acceptable'].map((r) => ({
    label: r,
    value: list.filter((s) => s.rating === r).length,
  }));

  const setFilter = (key: keyof Filters, value: string) =>
    setState({ ...state, filters: { ...filters, [key]: value } });

  const curriculumOptions = [{ value: '', label: '全部课程体系' }, ...DATA.filters.curricula.map((c) => ({ value: c, label: c }))];
  const locationOptions = [{ value: '', label: '全部区域' }, ...DATA.filters.locations.map((l) => ({ value: l, label: l }))];

  const compareRows = compare
    .map((id) => DATA.schools.find((x) => x.id === id))
    .filter(Boolean)
    .map((s) => ({
      name: s!.name,
      location: s!.location,
      curriculum: s!.curriculum,
      rating: s!.rating || '暂无',
      fees: formatFeeRange(s!),
      students: s!.students != null ? String(s!.students) : '—',
    }));

  const tableRows = list.slice(0, 80).map((s) => ({
    name: s.name,
    location: s.location,
    curriculum: s.curriculum,
    grades: s.grades,
    rating: s.rating || '暂无',
    fees: formatFeeRange(s),
    students: s.students != null ? s.students.toLocaleString('en-AE') : '—',
  }));

  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <H1>迪拜私立学校选校</H1>
        <Text tone="muted" size="sm">
          数据来源：KHDA 开放数据 · {DATA.meta.academicYear} · {DATA.meta.totalSchools} 所学校 · 更新 {DATA.meta.extractedAt}
        </Text>
        <Link href={DATA.meta.sourceUrl}>KHDA 教育目录（官网核实）</Link>
      </Stack>

      <Callout tone="info">{DATA.meta.note}</Callout>

      <Grid columns={4} gap={12}>
        <Stat label="符合筛选" value={String(list.length)} />
        <Stat label="Outstanding" value={String(ratingCounts[0].value)} tone="success" />
        <Stat label="Very good" value={String(ratingCounts[1].value)} tone="success" />
        <Stat label="Good" value={String(ratingCounts[2].value)} />
      </Grid>

      <Card>
        <CardHeader title="筛选" />
        <CardBody>
          <Grid columns={3} gap={12}>
            <TextInput label="校名 / 区域" value={filters.q} onChange={(v) => setFilter('q', v)} placeholder="搜索…" />
            <Select label="课程体系" value={filters.curriculum} options={curriculumOptions} onChange={(v) => setFilter('curriculum', v)} />
            <Select label="区域" value={filters.location} options={locationOptions} onChange={(v) => setFilter('location', v)} />
            <Select
              label="DSIB 评级"
              value={filters.rating}
              options={[
                { value: '', label: '全部' },
                { value: 'Outstanding', label: 'Outstanding' },
                { value: 'Very good', label: 'Very good' },
                { value: 'Good', label: 'Good' },
                { value: 'Acceptable', label: 'Acceptable' },
                { value: '__none__', label: '暂无评级' },
              ]}
              onChange={(v) => setFilter('rating', v)}
            />
            <Select
              label="排序"
              value={filters.sort}
              options={[
                { value: 'rating-desc', label: '评级（高→低）' },
                { value: 'fee-asc', label: '学费（低→高）' },
                { value: 'fee-desc', label: '学费（高→低）' },
                { value: 'students-desc', label: '在校生（多→少）' },
                { value: 'name-asc', label: '校名 A→Z' },
              ]}
              onChange={(v) => setFilter('sort', v)}
            />
            <TextInput label="学费上限 AED" value={filters.feeMax} onChange={(v) => setFilter('feeMax', v)} />
          </Grid>
        </CardBody>
      </Card>

      <BarChart
        title="筛选结果 DSIB 评级分布"
        caption={\`Source: KHDA Open Data · \${DATA.meta.academicYear}\`}
        data={ratingCounts}
        xKey="label"
        series={[{ key: 'value', label: '学校数量', tone: 'accent' }]}
        yLabel="学校数量（所）"
        xLabel="DSIB 评级"
      />

      {compare.length > 0 && (
        <Card>
          <CardHeader title={\`对比清单 (\${compare.length}/4)\`} trailing={<Button onClick={() => setState({ ...state, compare: [] })}>清空</Button>} />
          <CardBody>
            <Table
              columns={[
                { key: 'name', header: '学校' },
                { key: 'location', header: '区域' },
                { key: 'curriculum', header: '课程体系' },
                { key: 'rating', header: '评级' },
                { key: 'fees', header: '学费 AED' },
                { key: 'students', header: '在校生' },
              ]}
              rows={compareRows}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title={\`学校列表 · \${list.length} 所\`} />
        <CardBody padding={0}>
          <Table
            columns={[
              { key: 'name', header: '学校' },
              { key: 'location', header: '区域' },
              { key: 'curriculum', header: '课程体系' },
              { key: 'grades', header: '年级' },
              { key: 'rating', header: 'DSIB' },
              { key: 'fees', header: '学费 AED' },
              { key: 'students', header: '在校生' },
            ]}
            rows={tableRows}
          />
          {list.length > 80 && (
            <Text tone="muted" size="sm" style={{ padding: 12 }}>
              显示前 80 条。完整功能请打开 dubai-school-picker/index.html
            </Text>
          )}
        </CardBody>
      </Card>
    </Stack>
  );
}
`;

const outPath = 'C:/Users/nothi/.cursor/projects/d/canvases/dubai-school-picker.canvas.tsx';
fs.writeFileSync(outPath, canvas, 'utf8');
console.log('Wrote canvas', outPath, canvas.length);
