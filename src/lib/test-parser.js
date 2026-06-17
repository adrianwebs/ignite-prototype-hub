const MONTHS_MAP = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  ene: "01", abr: "04", ago: "08", dic: "12",
  january: "01", february: "02", march: "03", april: "04", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12"
};

function parseToIsoDate(raw) {
  if (!raw) return "";
  let trimmed = raw.trim();

  // Remove timezone name in parentheses at the end if present
  trimmed = trimmed.replace(/\s*\([^)]*\)\s*$/, "");

  // 1. Already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  // 2. dd/mm/yyyy or d/m/yyyy (with optional time)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // 3. Robust month-based parsing for verbose Spanish/English dates
  const yearMatch = trimmed.match(/\b(\d{4})\b/);
  if (yearMatch) {
    const yearStr = yearMatch[1];
    const words = trimmed.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .split(/[^a-z0-9]+/);
    
    let month = null;
    let monthWordIndex = -1;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (MONTHS_MAP[w]) {
        month = MONTHS_MAP[w];
        monthWordIndex = i;
        break;
      }
      const three = w.slice(0, 3);
      if (MONTHS_MAP[three]) {
        month = MONTHS_MAP[three];
        monthWordIndex = i;
        break;
      }
    }

    if (month) {
      const dayCandidates = words
        .map((w, idx) => ({ val: parseInt(w, 10), idx }))
        .filter(item => !isNaN(item.val) && item.val > 0 && item.val <= 31 && item.idx !== words.indexOf(yearStr));

      if (dayCandidates.length > 0) {
        const dayStr = String(dayCandidates[0].val).padStart(2, "0");
        return `${yearStr}-${month}-${dayStr}`;
      }
    }
  }

  // 4. Fallback: standard JavaScript Date parsing
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

const testCases = [
  "Mon Apr 06 2026 00:00:00 GMT+0200 (hora de verano de Europa central)",
  "Mon Apr 06 2026 00:00:00 GMT+0200",
  "17/6/2026 10:00:00",
  "2026-06-17",
  "17/06/2026",
  "6 de abril de 2026",
  "lun, 6 abr 2026",
  "2026/04/06"
];

for (const tc of testCases) {
  console.log(`Input: "${tc}" -> Output: "${parseToIsoDate(tc)}"`);
}
