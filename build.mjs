// node build.mjs → template.html 로 index.html, 과목별 {slug}/index.html, sitemap.xml 생성 (생성물도 커밋, GitHub Pages 가 그대로 서빙)
import fs from 'node:fs';
import assert from 'node:assert';

const SITE = 'https://leeyejunzero.github.io/MuanTutor/';

// 무안군 3읍 6면 법정리 (출처: 한국어 위키백과 각 읍·면 문서 '법정리', 2026-11 확인)
const REGIONS = [
  ['무안읍', ['교촌리', '성내리', '고절리', '성남리', '성암리', '성동리', '매곡리', '신학리', '용월리', '평용리']],
  ['일로읍', ['청호리', '망월리', '죽산리', '구정리', '의산리', '월암리', '용산리', '산정리', '광암리', '상신기리', '복룡리', '감돈리', '지장리', '오룡리'], ['오룡지구']],
  ['삼향읍', ['임성리', '남악리', '용포리', '맥포리', '유교리', '왕산리', '지산리'], ['남악신도시']],
  ['몽탄면', ['구산리', '귀학리', '내리', '다산리', '달산리', '당호리', '대치리', '명산리', '몽강리', '봉명리', '봉산리', '사창리', '사천리', '약곡리', '양장리', '이산리', '청용리', '학산리']],
  ['청계면', ['강정리', '구로리', '남성리', '남안리', '도대리', '도림리', '복길리', '복룡리', '사마리', '상마리', '서호리', '송현리', '월선리', '청계리', '청수리', '청천리', '태봉리']],
  ['현경면', ['가입리', '동산리', '마산리', '송정리', '수양리', '양학리', '오류리', '외반리', '용정리', '평산리', '해운리', '현화리']],
  ['망운면', ['목동리', '목서리', '송현리', '탄도리', '피서리']],
  ['해제면', ['광산리', '대사리', '덕산리', '만풍리', '산길리', '석룡리', '송석리', '신정리', '양매리', '양월리', '용학리', '유월리', '임수리', '창매리', '천장리', '학송리']],
  ['운남면', ['하묘리', '동암리', '연리', '내리', '성내리']]
];
assert.equal(REGIONS.reduce((n, [, ri]) => n + ri.length, 0), 104, '법정리 개수');

const SUBJECTS = [
  ['math', '수학', '초등 연산부터 중등 수학, 고등 수학·수Ⅰ·수Ⅱ·확률과 통계·미적분까지 학생 수준에 맞춰 수업합니다.', ['개념 이해 → 유형 풀이 → 오답 정리 순서의 1:1 수업', '남악고·무안고·남악중·오룡중 내신 기출 대비', '수능 수학·모의고사 대비']],
  ['english', '영어', '중·고등 내신 영어와 수능 영어, 문법·독해·어휘를 학생 약점에 맞춰 잡아드립니다.', ['학교 교과서 본문·문법 내신 대비', '수능 독해·듣기 유형별 풀이', '초등 영어 기초·파닉스']],
  ['korean', '국어', '문학·비문학 독해와 문법, 중·고등 내신 국어와 수능 국어를 함께 준비합니다.', ['교과서 작품 분석 내신 대비', '비문학 독해 훈련', '수능 국어·언어와 매체·화법과 작문']],
  ['science', '과학', '중학 과학과 고1 통합과학을 개념부터 차근차근 설명하고 내신 시험까지 대비합니다.', ['중1~중3 과학 내신', '고1 통합과학', '실험·탐구 서술형 대비']],
  ['social', '사회', '중학 사회와 고1 통합사회, 지리·일반사회 과목을 내신 위주로 정리합니다.', ['중학 사회·역사 내신', '고1 통합사회', '사회탐구 선택과목']],
  ['history', '한국사', '중·고등 역사와 한국사 내신, 한국사능력검정시험 대비를 함께 합니다.', ['시대 흐름 중심 개념 정리', '학교 내신·수행평가 대비', '한능검 심화·기본 대비']],
  ['physics', '물리', '물리학Ⅰ·Ⅱ 개념과 계산 문제를 1:1로 풀어주며 내신과 수능을 대비합니다.', ['역학·전자기·파동 개념 정리', '고2·고3 내신 물리', '수능 물리학Ⅰ']],
  ['chemistry', '화학', '화학Ⅰ·Ⅱ의 몰 계산, 화학 반응, 평형까지 개념과 문제풀이를 함께 합니다.', ['양적 관계·몰 계산 집중', '고2·고3 내신 화학', '수능 화학Ⅰ']],
  ['biology', '생명과학', '생명과학Ⅰ·Ⅱ 개념 정리와 유전 문제 풀이를 체계적으로 지도합니다.', ['세포·유전·항상성 개념 정리', '유전 고난도 문항 풀이', '내신·수능 생명과학Ⅰ']],
  ['earth-science', '지구과학', '지구과학Ⅰ·Ⅱ의 지질·대기·천체 단원을 그림과 자료 해석 위주로 수업합니다.', ['자료 해석형 문제 훈련', '내신 지구과학', '수능 지구과학Ⅰ']],
  ['coding', '코딩', '스크래치·엔트리부터 파이썬·C언어까지 화면 공유로 직접 코드를 짜며 배웁니다.', ['초등 블록 코딩', '중·고등 파이썬·C언어', '정보 과목 내신·자격증 대비']],
  ['english-conversation', '영어회화', '매 수업 직접 말하며 스피킹 자신감을 키우는 1:1 화상 영어회화 수업입니다.', ['초등·중등 스피킹', '프리토킹·발음 교정', '성인 영어회화']],
  ['essay', '논술', '독서논술과 대입 논술을 글쓰기·첨삭 중심으로 1:1 지도합니다.', ['초등·중등 독서논술', '서술형·수행평가 글쓰기', '대입 논술 첨삭']],
  ['self-study', '자기주도학습', '공부 계획 세우기, 플래너 관리, 공부법 코칭으로 혼자 공부하는 힘을 기릅니다.', ['주간 학습 계획·플래너 점검', '과목별 공부법 코칭', '시험 기간 일정 관리']],
  ['foreign-language', '제2외국어', '중국어·일본어를 회화와 시험 대비로 나눠 1:1 화상 수업합니다.', ['중국어·일본어 기초 회화', '학교 제2외국어 내신', 'HSK·JLPT 대비']]
];

const places = (name) => REGIONS.flatMap(([eup, ri, extra = []]) => [`무안 ${eup} ${name}`, ...extra.map((x) => `무안 ${x} ${name}`), ...ri.map((r) => `무안 ${eup} ${r} ${name}`)]);

const regionsHtml = (name) => REGIONS.map(([eup, ri, extra = []]) => `<details><summary>무안 ${eup} ${name} (${ri.length}개 리)</summary><ul>${
  [...extra.map((x) => `무안 ${x} ${name}`), ...ri.map((r) => `무안 ${eup} ${r} ${name}`)].map((k) => `<li>${k}</li>`).join('')}</ul></details>`).join('\n');

const subjectLinks = SUBJECTS.map(([slug, n]) => `<a href="${slug}/">무안 ${n}과외</a>`).join('');
const areaOptions = REGIONS.flatMap(([eup, , extra = []]) => [eup, ...extra]).map((a) => `<option>${a}</option>`).join('');
const areaServed = JSON.stringify(['무안군', ...REGIONS.flatMap(([eup, , extra = []]) => [eup, ...extra])]);

const tpl = fs.readFileSync('template.html', 'utf8');
function page(v) {
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => { assert.ok(k in v, `빠진 값: ${k}`); return v[k]; });
  assert.ok(!html.includes('{{'));
  return html;
}
const common = { SITE, SUBJECT_LINKS: subjectLinks, AREA_OPTIONS: areaOptions, AREA_SERVED: areaServed };

fs.writeFileSync('index.html', page({
  ...common, BASE: '', PRESET: '', INTRO: '', URL: SITE,
  TITLE: '무안 과외 · 남악 과외 · 오룡 과외 | 무안 화상과외 전문, 30분 무료수업',
  DESC: '무안과외·남악과외·오룡과외 찾으세요? 전남 무안군 화상과외 전문, 선생님 500명 이상. 수학·영어·국어·과학·사회·물리·화학·코딩·영어회화 1:1 과외, 30분 무료수업. 무안읍·일로읍·삼향읍·몽탄·청계·현경·망운·해제·운남 전 지역. ☎ 010-2224-4713',
  KEYWORDS: ['무안과외', '무안 과외', '남악과외', '남악 과외', '남악신도시 과외', '오룡과외', '오룡지구 과외', '무안 화상과외', '전남 무안 과외', '무안 중등과외', '무안 고등과외', '무안 초등과외',
    ...SUBJECTS.flatMap(([, n]) => [`무안 ${n}과외`, `남악 ${n}과외`]), ...places('과외')].join(','),
  OG_TITLE: '무안 과외 · 남악 과외 | 무안 화상과외 전문',
  H1: '무안 과외 · 남악 과외<br><span>1:1 화상과외</span>',
  REGIONS: regionsHtml('과외')
}));

for (const [slug, n, desc, points] of SUBJECTS) {
  fs.mkdirSync(slug, { recursive: true });
  fs.writeFileSync(`${slug}/index.html`, page({
    ...common, BASE: '<base href="../">\n', PRESET: n, URL: `${SITE}${slug}/`,
    TITLE: `무안 ${n}과외 · 남악 ${n}과외 | 1:1 화상 ${n} 과외, 30분 무료수업`,
    DESC: `무안${n}과외·남악${n}과외 찾으세요? 선생님 500명 이상 중 맞춤 매칭, 1:1 화상 ${n} 과외. 무안읍·남악·오룡 등 무안군 전 지역, 30분 무료수업. ☎ 010-2224-4713`,
    KEYWORDS: [`무안${n}과외`, `무안 ${n}과외`, `남악${n}과외`, `남악 ${n}과외`, `오룡 ${n}과외`, `무안 ${n} 화상과외`, ...places(`${n}과외`)].join(','),
    OG_TITLE: `무안 ${n}과외 · 남악 ${n}과외`,
    H1: `무안 ${n}과외 · 남악 ${n}과외<br><span>1:1 화상 ${n} 과외</span>`,
    INTRO: `<section class="intro"><div class="wrap">
  <h2>무안·남악 ${n}과외 안내</h2>
  <p>${desc} 무안읍·남악신도시·오룡지구 등 무안군 어디서든 집에서 1:1 화상으로 수업합니다.</p>
  <ul>${points.map((p) => `<li>${p}</li>`).join('')}<li>30분 무료수업 후 결정</li></ul>
</div></section>`,
    REGIONS: regionsHtml(`${n}과외`)
  }));
}

const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['', ...SUBJECTS.map(([s]) => `${s}/`)].map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`built index + ${SUBJECTS.length} subject pages`);
