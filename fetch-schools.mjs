// node fetch-schools.mjs → data/schools.json (NEIS 학교기본정보 + 학년별 학급 수). 학교 정보가 바뀌면 다시 실행 후 node build.mjs
import fs from 'node:fs';

// 무안군 학교 NEIS 학교코드 (분교 포함)
const CODES = ['7140272', '8662009', '8662029', '8662010', '8662013', '8662023', '7140200', '8662007', '8662004', '8662059', '8662003', '8662006', '8662012', '8662053', '8662052', '8662005', '8662058', '8662060', '7140248', '8662021', '8662022', '8662020', '8662048', '8662046', '8662026', '8662016', '8662014', '8662015', '7140235', '7140209', '8662008', '8662018', '8662019', '8662017', '8662028', '8662011', '8662027', '8662025', '8662024'];
const AY = new Date().getFullYear();

// 키 없이 호출하면 쪽 번호와 상관없이 처음 5건만 줌 → 행은 5건까지만 믿고, 개수는 list_total_count 로 셈
async function neis(service, params) {
  const j = await (await fetch(`https://open.neis.go.kr/hub/${service}?` + new URLSearchParams({ Type: 'json', pIndex: 1, pSize: 5, ...params }))).json();
  if (j.RESULT?.CODE === 'INFO-200') return { total: 0, rows: [] };
  const d = j[service];
  if (!d) throw new Error(`${service} ${JSON.stringify(params)}: ${j.RESULT?.MESSAGE}`);
  return { total: d[0].head[0].list_total_count, rows: d[1].row };
}

const out = [];
for (const code of CODES) {
  const { rows: [s] } = await neis('schoolInfo', { SD_SCHUL_CODE: code });
  const classes = {}; // 학년 → 학급 수
  for (let g = 1; g <= 6; g++) {
    const { total } = await neis('classInfo', { ATPT_OFCDC_SC_CODE: s.ATPT_OFCDC_SC_CODE, SD_SCHUL_CODE: code, AY, GRADE: g });
    if (total) classes[g] = total;
  }
  out.push({
    code, atpt: s.ATPT_OFCDC_SC_CODE, name: s.SCHUL_NM, eng: s.ENG_SCHUL_NM, kind: s.SCHUL_KND_SC_NM, found: s.FOND_SC_NM,
    coedu: s.COEDU_SC_NM, hsType: s.HS_SC_NM || '', hsTrack: s.HS_GNRL_BUSNS_SC_NM || '', special: s.SPCLY_PURPS_HS_ORD_NM || '',
    zip: (s.ORG_RDNZC || '').trim(), addr: s.ORG_RDNMA, tel: s.ORG_TELNO, fax: s.ORG_FAXNO, home: s.HMPG_ADRES || '',
    office: s.JU_ORG_NM, fondYmd: s.FOND_YMD, memorial: s.FOAS_MEMRD, ay: AY, classes
  });
  console.log(s.SCHUL_NM, s.FOND_YMD, JSON.stringify(classes));
}
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/schools.json', JSON.stringify(out, null, 1));
console.log(`${out.length}곳 저장`);
