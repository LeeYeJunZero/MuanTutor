// node build.mjs → template.html 틀로 메인·과목(15)·지역(9)·학교(39) 페이지와 sitemap.xml 생성
// 생성물도 커밋 (GitHub Pages 가 그대로 서빙). 학교 정보는 node fetch-schools.mjs 로 data/schools.json 갱신
import fs from 'node:fs';
import assert from 'node:assert';

const SITE = 'https://leeyejunzero.github.io/MuanTutor/';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// 무안군 3읍 6면 법정리 (출처: 한국어 위키백과 각 읍·면 문서 '법정리', 2026-11 확인)
const REGIONS = [
  ['무안읍', ['교촌리', '성내리', '고절리', '성남리', '성암리', '성동리', '매곡리', '신학리', '용월리', '평용리'], [], '무안군청이 있는 무안군의 중심 읍입니다.'],
  ['일로읍', ['청호리', '망월리', '죽산리', '구정리', '의산리', '월암리', '용산리', '산정리', '광암리', '상신기리', '복룡리', '감돈리', '지장리', '오룡리'], ['오룡지구'], '남악신도시와 이어진 오룡지구(오룡리 일대)가 들어서며 학생 수가 늘고 있는 지역입니다.'],
  ['삼향읍', ['임성리', '남악리', '용포리', '맥포리', '유교리', '왕산리', '지산리'], ['남악신도시'], '전남도청이 있는 남악신도시(남악리)가 속한 지역으로, 무안군에서 학생이 가장 많이 사는 곳입니다.'],
  ['몽탄면', ['구산리', '귀학리', '내리', '다산리', '달산리', '당호리', '대치리', '명산리', '몽강리', '봉명리', '봉산리', '사창리', '사천리', '약곡리', '양장리', '이산리', '청용리', '학산리'], [], '영산강을 끼고 있는 지역으로, 명산리의 명산장어로 알려져 있습니다.'],
  ['청계면', ['강정리', '구로리', '남성리', '남안리', '도대리', '도림리', '복길리', '복룡리', '사마리', '상마리', '서호리', '송현리', '월선리', '청계리', '청수리', '청천리', '태봉리'], [], '무안군 남서쪽, 목포와 가까운 지역입니다.'],
  ['현경면', ['가입리', '동산리', '마산리', '송정리', '수양리', '양학리', '오류리', '외반리', '용정리', '평산리', '해운리', '현화리'], [], '무안 북서쪽 해안에 접한 지역입니다.'],
  ['망운면', ['목동리', '목서리', '송현리', '탄도리', '피서리'], [], '무안국제공항이 있는 지역입니다.'],
  ['해제면', ['광산리', '대사리', '덕산리', '만풍리', '산길리', '석룡리', '송석리', '신정리', '양매리', '양월리', '용학리', '유월리', '임수리', '창매리', '천장리', '학송리'], [], '무안 북쪽 반도 끝에 있는 지역입니다.'],
  ['운남면', ['하묘리', '동암리', '연리', '내리', '성내리'], [], '무안 서쪽 반도에 있는 지역입니다.']
];
assert.equal(REGIONS.reduce((n, [, ri]) => n + ri.length, 0), 104, '법정리 개수');

// 과목 안내 (고등 과목명·수능 내용은 2022 개정 교육과정, 2028학년도 수능 개편안 기준)
const SUBJECTS = [
  { slug: 'math', n: '수학', lv: '초중고',
    about: '학생이 어디서 막히는지 먼저 찾고, 개념 설명 → 유형 연습 → 오답 정리 순서로 1:1 화상 수업을 합니다. 화면 공유 판서로 풀이 과정을 그대로 보여주고, 학생이 푼 과정을 보며 바로 짚어줍니다.',
    levels: [['초등', '연산 정확도와 분수·소수·도형 개념을 잡고, 서술형 풀이 습관을 만듭니다.'], ['중등', '방정식·함수·도형 단원을 학교 진도에 맞춰 내신 대비합니다. 고등 선행은 이해도를 확인한 뒤 정합니다.'], ['고등', '공통수학1·2부터 대수·미적분Ⅰ·확률과 통계까지 내신과 모의고사를 함께 준비합니다.']],
    courses: ['공통수학1·2 (고1)', '대수', '미적분Ⅰ', '확률과 통계', '기하 (진로선택)', '미적분Ⅱ (진로선택)'],
    exam: ['2028학년도 수능부터 수학은 선택과목 없이 대수·미적분Ⅰ·확률과 통계에서 공통으로 출제됩니다.', '2025년 고1부터 고등학교 내신은 5등급 상대평가(성취도 A~E 함께 표기)로 바뀌었습니다.'],
    lesson: ['지난 수업 복습 퀴즈', '새 개념 설명 (판서)', '유형별 문제 풀이', '오답 원인 정리와 과제'],
    tips: ['개념을 말로 설명할 수 있을 때 다음 단원으로 넘어가기', '오답노트에는 풀이보다 "왜 틀렸는지"를 한 줄로 적기', '시험 3주 전부터 학교 부교재·기출 유형을 반복하기'],
    faq: [['수학 선행은 어디까지 하나요?', '현재 학교 진도와 이해도를 먼저 확인한 뒤 정합니다. 현행 내용이 흔들리면 선행보다 복습을 먼저 권합니다.'], ['화상으로 수학 풀이를 봐줄 수 있나요?', '학생이 푼 풀이를 화면에 띄워 함께 보며 어디서 틀렸는지 바로 짚어줍니다. 태블릿이 있으면 같은 화면에 같이 쓰며 풀 수 있습니다.']] },
  { slug: 'english', n: '영어', lv: '초중고',
    about: '학교 교과서 본문과 문법, 수능형 독해를 학생 수준에 맞춰 1:1로 잡아드립니다. 단어 → 문장 구조 → 지문 독해 순서로 쌓아 내신과 모의고사를 함께 대비합니다.',
    levels: [['초등', '파닉스와 기초 어휘, 짧은 문장 읽기·말하기로 영어에 익숙해지게 합니다.'], ['중등', '교과서 본문과 문법(시제·관계사·분사 등), 서술형 영작까지 학교 시험에 맞춰 준비합니다.'], ['고등', '공통영어1·2 내신과 모의고사 독해 유형(빈칸·순서·삽입·요약)을 훈련합니다.']],
    courses: ['공통영어1·2 (고1)', '영어Ⅰ', '영어Ⅱ', '영어 독해와 작문', '심화 영어 (진로선택)', '영어 발표와 토론 (진로선택)'],
    exam: ['수능 영어는 절대평가로, 90점 이상이면 1등급입니다.', '2028학년도 수능 영어는 영어Ⅰ·영어Ⅱ 범위에서 출제됩니다.', '2025년 고1부터 고등학교 내신은 5등급 상대평가로 바뀌었습니다.'],
    lesson: ['단어 테스트', '본문·지문 문장 구조 분석', '문법 포인트 정리', '서술형·영작 연습'],
    tips: ['단어는 한 번에 많이보다 매일 같은 시간에 조금씩 반복하기', '본문은 해석을 외우지 말고 문장 구조로 이해하기', '모의고사는 유형별로 시간을 재고 풀기'],
    faq: [['문법만 따로 배울 수 있나요?', '가능합니다. 학교 시험 범위 문법이나 약한 단원만 골라 집중 수업할 수 있습니다.'], ['말하기 위주 수업도 있나요?', '말하기 중심 수업은 영어회화 과외로 따로 상담해 드립니다.']] },
  { slug: 'korean', n: '국어', lv: '초중고',
    about: '문학·비문학 독해와 문법을 지문 근거 중심으로 가르칩니다. "느낌"이 아니라 지문에서 근거를 찾아 답을 고르는 습관을 1:1로 만들어 드립니다.',
    levels: [['초등', '독서 습관과 어휘력, 글의 중심 생각 찾기를 연습합니다.'], ['중등', '교과서 문학 작품 분석과 문법(품사·문장 성분·음운), 서술형을 학교 시험에 맞춰 준비합니다.'], ['고등', '공통국어1·2 내신과 독서(비문학)·문학 지문 독해를 함께 훈련합니다.']],
    courses: ['공통국어1·2 (고1)', '화법과 언어', '독서와 작문', '문학', '주제 탐구 독서 (진로선택)', '문학과 영상 (진로선택)'],
    exam: ['2028학년도 수능부터 국어는 선택과목 없이 화법과 언어·독서와 작문·문학에서 공통으로 출제됩니다.', '2025년 고1부터 고등학교 내신은 5등급 상대평가로 바뀌었습니다.'],
    lesson: ['어휘·개념어 점검', '지문 구조 분석', '문제 풀이와 정답 근거 찾기', '요약·서술형 쓰기'],
    tips: ['지문을 읽고 문단마다 한 줄 요약하기', '정답의 근거를 지문에서 밑줄로 찾아 확인하기', '교과서 작품은 갈래별로 특징을 정리하기'],
    faq: [['책을 안 읽는 아이도 가능한가요?', '짧은 글부터 읽고 요약하는 연습으로 시작해 독해량을 조금씩 늘립니다.'], ['문법만 따로 할 수 있나요?', '가능합니다. 학교 시험 범위 문법 단원만 집중해서 수업할 수 있습니다.']] },
  { slug: 'science', n: '과학', lv: '초중고',
    about: '그림과 실험 과정으로 개념을 먼저 이해시키고, 용어 정리와 계산·서술형 문제까지 이어서 연습합니다.',
    levels: [['초등', '실험·관찰 중심으로 개념을 이해하고 교과서 탐구 활동을 정리합니다.'], ['중등', '물질·에너지·생명·지구 단원 개념과 밀도·속력·전류 같은 계산 문제를 내신에 맞춰 준비합니다.'], ['고등', '고1 통합과학1·2와 과학탐구실험, 2학년부터 선택하는 물리학·화학·생명과학·지구과학을 대비합니다.']],
    courses: ['통합과학1·2 (고1)', '과학탐구실험1·2 (고1)', '물리학', '화학', '생명과학', '지구과학'],
    exam: ['2028학년도 수능부터 탐구 영역은 사회·과학 구분 없이 통합사회와 통합과학을 모두 치릅니다.', '고2부터 듣는 물리학·화학·생명과학·지구과학은 학교 내신과 진로(전공) 준비 중심으로 공부합니다.'],
    lesson: ['개념 그림 설명', '핵심 용어·공식 정리', '문제 풀이', '서술형 답안 쓰기'],
    tips: ['개념을 그림이나 그래프로 그려서 설명해 보기', '용어 정의는 카드로 만들어 반복하기', '실험은 과정·결과·결론 순서로 적어 보기'],
    faq: [['통합과학은 어떻게 준비하나요?', '물리·화학·생명·지구 내용이 섞여 있어, 단원별로 약한 분야를 먼저 찾고 개념부터 채웁니다.'], ['중학 과학 선행이 필요한가요?', '학교 진도에 맞춘 현행 복습을 먼저 하고, 여유가 있으면 다음 학기 내용을 미리 봅니다.']] },
  { slug: 'social', n: '사회', lv: '초중고',
    about: '개념의 흐름을 먼저 잡고, 지도·그래프·통계 자료를 읽는 법과 서술형 답안 쓰기를 함께 연습합니다.',
    levels: [['초등', '지도 읽기, 우리 지역(무안·전남) 이해, 사회 교과서 개념을 정리합니다.'], ['중등', '사회①②(지리·일반사회) 개념과 자료 해석 문제를 내신에 맞춰 준비합니다.'], ['고등', '고1 통합사회1·2와 2학년부터 선택하는 사회 과목 내신을 대비합니다.']],
    courses: ['통합사회1·2 (고1)', '세계시민과 지리', '사회와 문화', '현대사회와 윤리', '세계사', '정치·법과 사회·경제 (진로선택)'],
    exam: ['2028학년도 수능부터 탐구 영역은 통합사회와 통합과학을 모두 치릅니다.', '고등학교 사회 과목은 서술형·수행평가 비중이 커서 답안 쓰는 연습이 중요합니다.'],
    lesson: ['개념 흐름 정리', '지도·그래프 자료 해석', '문제 풀이', '서술형 답안 쓰기'],
    tips: ['단원마다 마인드맵으로 개념 연결하기', '뉴스 속 사례를 교과 개념과 연결해 보기', '자료 문제는 제목·단위·변화부터 읽기'],
    faq: [['통합사회는 외울 게 많은데요?', '흐름을 먼저 이해하고 핵심 개념만 추려서 외우게 해 부담을 줄입니다.'], ['서술형 대비도 하나요?', '학교 서술형 기출 형식에 맞춰 답안을 써 보고 첨삭합니다.']] },
  { slug: 'history', n: '한국사', lv: '초중고',
    about: '시대 흐름과 원인·결과를 중심으로 이야기처럼 설명해, 외우기만 하는 역사가 아니라 이해하는 역사로 만듭니다.',
    levels: [['초등', '5·6학년 사회 역사 단원의 인물과 사건을 이야기로 정리합니다.'], ['중등', '역사①②의 시대 흐름과 주요 사건을 내신에 맞춰 정리합니다.'], ['고등', '고1 한국사1·2 내신과 수능 한국사를 함께 대비합니다.']],
    courses: ['한국사1·2 (고1 공통)', '동아시아 역사 기행 (진로선택)', '세계사'],
    exam: ['수능 한국사는 모든 수험생이 반드시 응시하는 절대평가 과목으로, 50점 만점에 40점 이상이면 1등급입니다.', '한국사능력검정시험은 심화(1~3급)와 기본(4~6급)으로 나뉩니다.'],
    lesson: ['시대 흐름 복습', '사건 원인·결과 정리', '사료·자료 문제 풀이', '연표 정리'],
    tips: ['연표를 직접 그려 시대 순서 잡기', '사건은 원인 → 전개 → 결과로 묶어 외우기', '사료 문제는 핵심 단어로 시대 찾기'],
    faq: [['한국사능력검정시험도 준비할 수 있나요?', '심화·기본 급수에 맞춰 기출 위주로 준비합니다.'], ['역사를 너무 싫어하는데요?', '인물과 사건을 이야기로 풀어 흥미부터 붙이고 흐름을 잡습니다.']] },
  { slug: 'physics', n: '물리', lv: '고',
    about: '공식을 외우게 하지 않고 직접 유도하며 의미를 이해시킵니다. 그래프 해석과 계산 문제, 서술형까지 1:1로 연습합니다.',
    levels: [['고1', '통합과학의 힘과 운동·에너지 단원으로 물리 기초를 잡습니다.'], ['고2', '일반선택 물리학 내신을 대비합니다.'], ['고3·진로', '진로선택 역학과 에너지·전자기와 양자로 이공계 진학을 준비합니다.']],
    courses: ['물리학 (일반선택)', '역학과 에너지 (진로선택)', '전자기와 양자 (진로선택)'],
    exam: ['2028학년도 수능부터 과학탐구는 통합과학으로 치러, 물리학은 학교 내신과 이공계 전공 준비 중심으로 공부합니다.'],
    lesson: ['개념·공식 유도', '그래프 해석', '계산 문제 풀이', '서술형 정리'],
    tips: ['공식은 직접 유도해 보며 의미 이해하기', '계산할 때 단위를 끝까지 적기', '그래프는 기울기와 넓이가 뜻하는 것부터 찾기'],
    faq: [['수학이 약해도 물리를 할 수 있나요?', '필요한 수학(비례·벡터·그래프)을 함께 짚어가며 수업합니다.'], ['이공계 진학 준비도 되나요?', '진로선택 과목 내신과 탐구 주제 정리를 함께 도와드립니다.']] },
  { slug: 'chemistry', n: '화학', lv: '고',
    about: '몰 계산과 화학 반응식처럼 막히기 쉬운 부분을 단계별로 풀어 설명하고, 내신 서술형까지 대비합니다.',
    levels: [['고1', '통합과학의 물질 단원으로 화학 기초를 잡습니다.'], ['고2', '일반선택 화학 내신을 대비합니다.'], ['고3·진로', '진로선택 물질과 에너지·화학 반응의 세계로 이공계·보건계열 진학을 준비합니다.']],
    courses: ['화학 (일반선택)', '물질과 에너지 (진로선택)', '화학 반응의 세계 (진로선택)'],
    exam: ['2028학년도 수능부터 과학탐구는 통합과학으로 치러, 화학은 학교 내신과 전공 준비 중심으로 공부합니다.'],
    lesson: ['개념 설명', '반응식·몰 계산 연습', '문제 풀이', '서술형 정리'],
    tips: ['몰 계산은 단위를 따라가며 단계별로 풀기', '반응식 계수는 원자 수 세기로 확인하기', '주기율표 경향은 표로 정리하기'],
    faq: [['몰 계산이 너무 어려워요.', '비례식부터 단계를 나눠 반복하면 대부분 해결됩니다. 기초부터 차근차근 잡습니다.'], ['보건·의약 계열 준비도 되나요?', '관련 진로선택 과목 내신과 탐구 주제 정리를 함께 도와드립니다.']] },
  { slug: 'biology', n: '생명과학', lv: '고',
    about: '세포·유전·항상성 과정을 그림으로 정리하고, 어려운 유전 문제는 단계별 풀이로 접근법을 익히게 합니다.',
    levels: [['고1', '통합과학의 생명 단원으로 기초를 잡습니다.'], ['고2', '일반선택 생명과학 내신을 대비합니다.'], ['고3·진로', '진로선택 세포와 물질대사·생물의 유전으로 보건·의약 계열 진학을 준비합니다.']],
    courses: ['생명과학 (일반선택)', '세포와 물질대사 (진로선택)', '생물의 유전 (진로선택)'],
    exam: ['2028학년도 수능부터 과학탐구는 통합과학으로 치러, 생명과학은 학교 내신과 전공 준비 중심으로 공부합니다.'],
    lesson: ['과정 그림 정리', '핵심 용어 점검', '유전·자료 문제 풀이', '서술형 정리'],
    tips: ['생명 현상은 과정 그림을 직접 그리며 외우기', '유전 문제는 가계도를 단계별로 표시하며 풀기', '비슷한 용어는 표로 비교하기'],
    faq: [['유전 문제가 제일 어려워요.', '유형별 풀이 순서를 정해 두고 같은 순서로 반복하면 익숙해집니다.'], ['외울 게 너무 많아요.', '과정 그림으로 묶어 외우면 양이 줄어듭니다.']] },
  { slug: 'earth-science', n: '지구과학', lv: '고',
    about: '지질·대기·해양·천체 단원을 그림과 자료 해석 위주로 설명해, 자료형 문제에 강해지도록 수업합니다.',
    levels: [['고1', '통합과학의 지구 단원으로 기초를 잡습니다.'], ['고2', '일반선택 지구과학 내신을 대비합니다.'], ['고3·진로', '진로선택 지구시스템과학·행성우주과학을 준비합니다.']],
    courses: ['지구과학 (일반선택)', '지구시스템과학 (진로선택)', '행성우주과학 (진로선택)'],
    exam: ['2028학년도 수능부터 과학탐구는 통합과학으로 치러, 지구과학은 학교 내신과 전공 준비 중심으로 공부합니다.'],
    lesson: ['개념 그림 설명', '자료·그래프 해석', '문제 풀이', '서술형 정리'],
    tips: ['자료 문제는 축·단위·변화 방향부터 읽기', '천체 단원은 그림을 직접 그려 위치 관계 이해하기', '단원별 핵심 그래프를 모아 정리하기'],
    faq: [['자료 해석이 약해요.', '그래프 읽는 순서를 정해 반복 연습하면 금방 나아집니다.'], ['내신만 따로 대비할 수 있나요?', '학교 시험 범위와 기출 형식에 맞춰 준비합니다.']] },
  { slug: 'coding', n: '코딩', lv: '초중고',
    about: '화면 공유로 선생님과 같은 코드를 보며 직접 짜 봅니다. 블록 코딩부터 파이썬·C언어까지 학생 수준에 맞춰 진행합니다.',
    levels: [['초등', '엔트리·스크래치 블록 코딩으로 순서·반복·조건을 익힙니다.'], ['중등', '파이썬 기초 문법과 간단한 프로그램 만들기로 정보 수업을 대비합니다.'], ['고등', '정보 과목 내신, 파이썬·C언어 알고리즘, 공모전·자격증을 준비합니다.']],
    courses: ['정보 (고교 일반선택)', '인공지능 기초 (진로선택)', '데이터 과학 (진로선택)'],
    exam: ['2022 개정 교육과정으로 초등 정보 교육은 34시간, 중학교 정보 수업은 68시간으로 늘었습니다.'],
    lesson: ['오늘 배울 개념 설명', '예제 코드 따라 짜기', '스스로 문제 해결 코드 작성', '코드 리뷰와 과제'],
    tips: ['매일 짧게라도 직접 타이핑해 보기', '오류 메시지를 먼저 읽고 원인 찾기', '작은 프로젝트를 끝까지 완성해 보기'],
    faq: [['컴퓨터를 처음 하는 아이도 되나요?', '블록 코딩부터 시작해 마우스·키보드 사용에 익숙해지게 합니다.'], ['준비물이 있나요?', '노트북이나 데스크톱이 필요합니다. 프로그램 설치는 첫 수업에서 함께 합니다.']] },
  { slug: 'english-conversation', n: '영어회화', lv: '초중고', topics: true,
    about: '매 수업 직접 말하는 시간을 가장 길게 잡습니다. 틀려도 괜찮은 분위기에서 표현을 익히고 바로 써 보게 합니다.',
    levels: [['초등', '노래·게임·짧은 대화로 영어로 말하는 데 익숙해지게 합니다.'], ['중고등', '수행평가 말하기·발표와 자기 생각 말하기를 연습합니다.'], ['성인', '여행·업무·면접 영어 등 필요한 상황 위주로 수업합니다.']],
    courses: ['자기소개·일상 대화', '학교생활 표현', '여행 영어', '발표·토론', '면접 영어'],
    exam: ['고등학교 진로선택 "영어 발표와 토론"과 학교 말하기 수행평가 대비에도 도움이 됩니다.'],
    lesson: ['워밍업 대화', '오늘의 표현 익히기', '상황 롤플레이', '발음·표현 피드백'],
    tips: ['틀려도 끝까지 말해 보기', '내 말을 녹음해서 다시 들어 보기', '매일 영어로 세 문장 일기 쓰기'],
    faq: [['영어를 거의 못 해도 되나요?', '아주 쉬운 표현부터 시작해 말하는 양을 조금씩 늘립니다.'], ['성인도 신청할 수 있나요?', '가능합니다. 목적(여행·업무·면접)에 맞춰 수업합니다.']] },
  { slug: 'essay', n: '논술', lv: '초중고',
    about: '읽고, 생각을 정리하고, 쓰고, 고쳐 쓰는 과정을 1:1 첨삭으로 반복해 논리적으로 쓰는 힘을 기릅니다.',
    levels: [['초등', '책을 읽고 생각을 글로 쓰는 독서논술로 시작합니다.'], ['중등', '서술형·수행평가 글쓰기와 주장-근거 구성 연습을 합니다.'], ['고등', '수행평가·서술형과 대입 논술(인문·자연)을 준비합니다.']],
    courses: ['독서와 작문', '주제 탐구 독서 (진로선택)', '독서 토론과 글쓰기 (융합선택)'],
    exam: ['고교학점제에서는 과목마다 서술형·논술형 평가와 수행평가 글쓰기가 중요합니다.'],
    lesson: ['제시문·책 읽기', '개요 짜기', '글쓰기', '1:1 첨삭과 고쳐 쓰기'],
    tips: ['주장 → 근거 → 예시 순서로 쓰기', '정해진 분량을 지켜 쓰는 연습하기', '첨삭받은 글은 반드시 다시 고쳐 쓰기'],
    faq: [['글쓰기를 너무 싫어하는데요?', '짧은 글부터 쓰고 칭찬과 첨삭을 함께 해 부담을 줄입니다.'], ['대입 논술도 되나요?', '지원 대학 기출 유형에 맞춰 준비합니다.']] },
  { slug: 'self-study', n: '자기주도학습', lv: '초중고', topics: true,
    about: '공부 계획을 세우고 지키는 힘을 기르는 코칭 수업입니다. 매주 계획과 실천을 함께 점검해 혼자서도 공부하는 습관을 만듭니다.',
    levels: [['초등', '매일 공부 시간 정하기와 숙제 습관을 만듭니다.'], ['중등', '과목별 공부법과 시험 기간 계획 세우기를 익힙니다.'], ['고등', '내신·수능 일정에 맞춘 장기 계획과 플래너 관리를 합니다.']],
    courses: ['학습 습관 진단', '주간 계획표 세우기', '플래너 점검', '시험 대비 일정 관리', '과목별 공부법'],
    exam: ['고교학점제에서는 스스로 과목을 고르고 계획하는 힘이 더 중요해졌습니다.'],
    lesson: ['지난주 실천 점검', '계획 수정', '과목별 공부법 코칭', '다음 주 목표 정하기'],
    tips: ['계획은 시간보다 분량으로 세우기', '매일 저녁 실천 여부를 체크하기', '주말에 한 주를 돌아보고 다음 주 계획 고치기'],
    faq: [['과목 수업과 같이 할 수 있나요?', '가능합니다. 과목 수업에 계획 점검을 더하는 방식도 있습니다.'], ['효과가 언제 보이나요?', '보통 4~8주 꾸준히 점검하면 공부 습관이 자리 잡기 시작합니다.']] },
  { slug: 'foreign-language', n: '제2외국어', lv: '중고',
    about: '중국어·일본어를 기초 회화와 학교 내신, 자격증 대비로 나눠 1:1 화상으로 수업합니다.',
    levels: [['중등', '중학교 선택 과목 중국어·일본어 기초를 다집니다.'], ['고등', '고교 중국어·일본어 내신과 수능 제2외국어를 준비합니다.'], ['자격증', 'HSK(1~6급), JLPT(N5~N1) 급수에 맞춰 준비합니다.']],
    courses: ['중국어·일본어 (고교 일반선택)', '중국어 회화·일본어 회화 (진로선택)', 'HSK', 'JLPT'],
    exam: ['수능 제2외국어/한문 영역은 선택 응시이며 절대평가로 등급이 정해집니다.'],
    lesson: ['발음·문자 점검', '오늘의 표현', '회화·독해 연습', '단어·문법 복습'],
    tips: ['문자(한자·가나)는 매일 조금씩 써 보기', '짧은 문장을 소리 내어 반복하기', '자격증은 기출 유형으로 시간 맞춰 연습하기'],
    faq: [['완전 처음인데 괜찮나요?', '발음과 문자부터 차근차근 시작합니다.'], ['자격증만 준비할 수 있나요?', '목표 급수와 시험일에 맞춰 일정을 잡아 준비합니다.']] }
];

// 학교 (NEIS)
const SCHOOLS = JSON.parse(fs.readFileSync('data/schools.json', 'utf8')).map((s) => ({
  ...s, short: s.name.replace('고등학교', '고').replace('중학교', '중').replace('초등학교', '초'),
  eup: (s.addr.match(/무안군\s+(\S+?[읍면])/) || [])[1], lv: s.kind[0]
}));
for (const s of SCHOOLS) assert.ok(REGIONS.some(([e]) => e === s.eup), `${s.name} 읍면 못 찾음: ${s.addr}`);
const KIND_ORDER = ['고등학교', '중학교', '초등학교'];
const fmtDate = (d) => (d && d.length === 8 ? `${+d.slice(0, 4)}년 ${+d.slice(4, 6)}월 ${+d.slice(6)}일` : '');

// ───── 공통 조각 ─────
const tpl = fs.readFileSync('template.html', 'utf8');
const areaOptions = REGIONS.flatMap(([e, , ex]) => [e, ...ex]).map((a) => `<option>${a}</option>`).join('');
const pages = [];
const foot = `<div class="cols"><div><a class="logo" href="./"><span>무안 <b>화상과외</b></span></a><a class="tel" href="tel:01022244713">010-2224-4713</a><p style="margin:0">전남 무안군 1:1 화상과외 · 상담 접수 후 순차 연락</p></div>
<div><h4>과목별 과외</h4><ul>${SUBJECTS.map((s) => `<li><a href="${s.slug}/">${s.n}과외</a></li>`).join('')}</ul></div>
<div><h4>지역별 과외</h4><ul>${REGIONS.map(([e]) => `<li><a href="area/${e}/">${e}</a></li>`).join('')}</ul></div></div>
<p class="copy">© ${new Date().getFullYear()} 무안 화상과외 · 학교 정보 출처: 교육부 나이스(NEIS) 교육정보 개방 포털</p>`;
const orgLd = (extra = []) => JSON.stringify({ '@context': 'https://schema.org', '@graph': [{
  '@type': 'EducationalOrganization', name: '무안 화상과외', url: SITE, telephone: '+82-10-2224-4713',
  description: '전남 무안군 1:1 화상과외 전문. 선생님 500명 이상, 30분 무료수업.',
  address: { '@type': 'PostalAddress', addressRegion: '전라남도', addressLocality: '무안군', addressCountry: 'KR' },
  areaServed: ['무안군', ...REGIONS.flatMap(([e, , ex]) => [e, ...ex])], knowsAbout: SUBJECTS.map((s) => s.n)
}, ...extra] }).replace(/</g, '\\u003c');
const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
function page(path, v) {
  const depth = path.split('/').filter(Boolean).length;
  const all = { BASE: depth ? `<base href="${'../'.repeat(depth)}">\n` : '', PRESET: '', SCHOOL: '', EXTRA: '', AREA_OPTIONS: areaOptions, FOOT: foot, URL: SITE + encodeURI(path), JSONLD: orgLd(), ...v };
  all.OG_TITLE ??= all.TITLE.split(' | ')[0];
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => { assert.ok(k in all, `빠진 값: ${k} (${path})`); return all[k]; });
  if (path) fs.mkdirSync(path, { recursive: true });
  fs.writeFileSync(path + 'index.html', html);
  pages.push(path);
}

const hero = (h1, desc, top = '<span class="tag">전남 무안 · 남악 · 오룡 화상과외 전문</span>') => `<section class="hero" aria-labelledby="heroTitle"><div class="wrap">
  <div>
    ${top}
    <h1 id="heroTitle">${h1}</h1>
    <p class="desc">${desc}</p>
    <ul class="facts"><li>검증된 선생님 500명 이상</li><li>통학 시간 없이 집에서 1:1 수업</li><li>30분 무료수업 · 상담·매칭 무료</li></ul>
    <div class="hero-cta"><button class="btn btn-pri" type="button" data-open>30분 무료수업 신청</button><a class="btn btn-ghost" href="tel:01022244713"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>010-2224-4713</a></div>
  </div>
  <div class="picker"><h2>어떤 도움이 필요하세요?</h2><p>과목만 고르시면 맞는 선생님을 찾아 연락드립니다</p><div class="subjects" data-tiles></div></div>
</div></section>`;
const crumb = (items) => `<nav class="crumbs" aria-label="현재 위치">${items.map(([t, h]) => (h ? `<a href="${h}">${t}</a>` : t)).join(' › ')}</nav>`;
const sec = (cls, h2, lead, body, id = '') => `<section class="doc ${cls}"${id ? ` id="${id}"` : ''}><div class="wrap"><h2>${h2}</h2>${lead ? `<p class="lead">${lead}</p>` : ''}${body}</div></section>`;
const final = (t = '30분 무료수업 받아보세요') => `<section class="final"><div class="wrap"><div><h2>${t}</h2><p>과목과 연락처만 남기시면 바로 연락드립니다</p><button class="btn btn-pri" type="button" data-open>무료 상담 신청</button> <a class="btn btn-ghost" href="tel:01022244713"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>010-2224-4713</a></div></div></section>`;
const faqHtml = (faq) => `<div class="faq" style="max-width:none">${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;
const subjLinks = (list, pre = '무안 ') => `<div class="subj-links">${list.map((s) => `<a href="${s.slug}/">${pre}${s.n}과외</a>`).join('')}</div>`;
const schoolLinks = (list) => KIND_ORDER.map((k) => list.filter((s) => s.kind === k)).filter((g) => g.length).map((g) =>
  `<div class="group"><h3>${g[0].kind}</h3><div class="chips-list links">${g.map((s) => `<a href="school/${s.name}/">${s.short}</a>`).join('')}</div></div>`).join('');
const areaCards = (suffix = '과외') => `<div class="areas-grid">${REGIONS.map(([e, ri, ex]) => `<a class="area-card" href="area/${e}/"><h3>무안 ${e} ${suffix}</h3><p>${[...ex, ...ri].join(' · ')}</p></a>`).join('')}</div>`;
const stats = `<div class="stats"><div class="wrap"><div><b>500<em>+</em></b><span>등록 선생님</span></div><div><b>${SUBJECTS.length}<em>개</em></b><span>수업 과목</span></div><div><b>${SCHOOLS.length}<em>곳</em></b><span>무안 학교 정보</span></div><div><b>30<em>분</em></b><span>무료 체험 수업</span></div></div></div>`;
const why = `<section><div class="wrap"><div class="sec-head"><span class="eyebrow">WHY ONLINE</span><h2>왜 화상과외인가요?</h2><p>무안 지역 학생들이 화상과외를 선택하는 이유</p></div><div class="cards">
  <div class="card"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg></span><h3>이동 시간 0분</h3><p>읍·면 어디서든 학원 오갈 필요 없이 집에서 바로 수업합니다.</p></div>
  <div class="card"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 9L12 4 2 9l10 5 10-5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg></span><h3>선생님 500명 이상</h3><p>지역에서 찾기 어려운 과목도 전문 선생님을 연결합니다.</p></div>
  <div class="card"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg></span><h3>내신·수능 맞춤</h3><p>학교 시험 범위에 맞춘 내신 대비와 수능 대비를 함께 합니다.</p></div>
  <div class="card"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg></span><h3>수업 내용 공유</h3><p>수업 후 학습 내용을 학부모님께 알려드립니다.</p></div>
</div></div></section>`;
const steps = `<section class="white"><div class="wrap"><div class="sec-head"><span class="eyebrow">PROCESS</span><h2>상담부터 첫 수업까지</h2><p>신청만 하시면 나머지는 저희가 진행합니다</p></div><ol class="steps">
  <li><b>상담 신청</b><span>과목과 연락처만 남겨주세요</span></li><li><b>30분 무료수업</b><span>선생님과 먼저 수업해 보세요</span></li>
  <li><b>선생님 매칭</b><span>맞는 선생님을 추천해 드려요</span></li><li><b>화상 수업 시작</b><span>노트북·태블릿만 있으면 OK</span></li>
</ol></div></section>`;
const MAIN_FAQ = [
  ['무안에서 화상과외는 어떻게 진행되나요?', '노트북·태블릿으로 선생님과 1:1 화상으로 수업합니다. 무안읍·남악신도시·오룡지구 등 무안군 어디서든 집에서 받을 수 있습니다.'],
  ['30분 무료수업은 어떻게 신청하나요?', '상담 신청에 과목과 연락처를 남기시거나 010-2224-4713으로 전화하시면 30분 무료수업 일정을 잡아드립니다.'],
  ['남악고·무안고·남악중·오룡중 내신 대비도 되나요?', '학교별 시험 범위와 교과서에 맞춰 내신 대비 수업을 진행합니다. 학교 페이지에서 급식표·학사일정도 확인할 수 있습니다.'],
  ['과외비는 얼마인가요?', '학년·과목·주 수업 횟수에 따라 달라 상담 때 정확히 안내해 드립니다. 상담과 선생님 매칭은 무료입니다.']
];

// ───── 메인 ─────
page('', {
  TITLE: '무안 과외 · 남악 과외 · 오룡 과외 | 무안 화상과외 전문, 30분 무료수업',
  DESC: '무안과외·남악과외·오룡과외 찾으세요? 전남 무안군 화상과외 전문, 선생님 500명 이상. 수학·영어·국어·과학·사회·물리·화학·코딩·영어회화 1:1 과외, 30분 무료수업. 무안 학교별 급식표·학사일정 안내. ☎ 010-2224-4713',
  KEYWORDS: ['무안과외', '남악과외', '오룡과외', '남악신도시 과외', '무안 화상과외', ...SUBJECTS.map((s) => `무안 ${s.n}과외`), ...REGIONS.map(([e]) => `무안 ${e} 과외`)].join(','),
  JSONLD: orgLd([faqLd(MAIN_FAQ)]),
  MAIN: [hero('무안 과외 · 남악 과외<br><span>1:1 화상과외</span>', '선생님 500명 이상 중에서 우리 아이에게 맞는 선생님을 무료로 찾아드립니다.'), stats, why, steps,
    sec('', '무안·남악 과목별 과외', '과목을 누르면 학년별 수업 내용, 교육과정, 공부법을 볼 수 있습니다', subjLinks(SUBJECTS), 'subjects'),
    sec('white', '무안 학교별 과외 · 급식표 · 학사일정', '학교를 누르면 학교 소개와 이번 주 급식표, 이번 달 학사일정을 볼 수 있습니다', schoolLinks(SCHOOLS), 'schools'),
    sec('', '무안군 지역별 과외', '3읍 6면 어디서든 화상으로 같은 수업을 받을 수 있습니다', areaCards(), 'areas'),
    sec('white', '자주 묻는 질문', '', faqHtml(MAIN_FAQ), 'faq'), final()].join('\n')
});

// ───── 과목 ─────
for (const s of SUBJECTS) {
  const lvSchools = SCHOOLS.filter((x) => s.lv.includes(x.lv));
  page(`${s.slug}/`, {
    PRESET: s.n,
    TITLE: `무안 ${s.n}과외 · 남악 ${s.n}과외 | 1:1 화상 ${s.n} 과외, 30분 무료수업`,
    DESC: `무안${s.n}과외·남악${s.n}과외. ${s.about.split('. ')[0]}. 학년별 수업·교육과정·공부법 안내, 무안군 전 지역 1:1 화상 수업, 30분 무료수업 ☎ 010-2224-4713`,
    KEYWORDS: [`무안 ${s.n}과외`, `남악 ${s.n}과외`, `오룡 ${s.n}과외`, `무안 ${s.n} 화상과외`, ...REGIONS.map(([e]) => `무안 ${e} ${s.n}과외`), ...lvSchools.slice(0, 12).map((x) => `${x.short} ${s.n}과외`)].join(','),
    JSONLD: orgLd([faqLd(s.faq)]),
    MAIN: [hero(`무안 ${s.n}과외 · 남악 ${s.n}과외<br><span>1:1 화상 ${s.n} 과외</span>`, s.about, crumb([['무안 화상과외', './'], [`${s.n}과외`]])),
      sec('', `무안 ${s.n}과외 학년별 수업`, '학년과 목표에 맞춰 수업 내용을 정합니다',
        `<div class="grid3">${s.levels.map(([k, t]) => `<div class="box"><span class="k">${k}</span><p>${t}</p></div>`).join('')}</div>`),
      sec('white', s.topics ? `${s.n} 수업 주제` : `${s.n} 교육과정과 시험`, '',
        `<div class="grid2"><div class="box"><h3>${s.topics ? '이런 내용을 배워요' : '고등학교 과목 (2022 개정 교육과정)'}</h3><ul>${s.courses.map((c) => `<li>${c}</li>`).join('')}</ul></div><div class="box"><h3>알아두면 좋은 점</h3><ul>${s.exam.map((c) => `<li>${c}</li>`).join('')}</ul></div></div>`),
      sec('', `${s.n} 수업은 이렇게 진행돼요`, '1:1 화상 수업 한 번의 흐름', `<ol class="steps">${s.lesson.map((t) => `<li><b>${t}</b></li>`).join('')}</ol>`),
      sec('white', `${s.n} 공부법`, '선생님들이 공통으로 강조하는 습관', `<div class="grid3">${s.tips.map((t, i) => `<div class="box"><span class="k">TIP ${i + 1}</span><p>${t}</p></div>`).join('')}</div>`),
      sec('', `무안 학교별 ${s.n}과외`, '학교를 누르면 학교 정보와 급식표·학사일정을 볼 수 있습니다', schoolLinks(lvSchools)),
      sec('white', `무안군 지역별 ${s.n}과외`, '', areaCards(`${s.n}과외`)),
      sec('', `${s.n}과외 자주 묻는 질문`, '', faqHtml(s.faq)),
      sec('white', '다른 과목도 찾으세요?', '', subjLinks(SUBJECTS.filter((x) => x !== s))), final(`${s.n} 30분 무료수업 받아보세요`)].join('\n')
  });
}

// ───── 지역 ─────
for (const [e, ri, ex, note] of REGIONS) {
  const local = SCHOOLS.filter((s) => s.eup === e);
  page(`area/${e}/`, {
    TITLE: `무안 ${e} 과외 | ${[...ex, ...ri.slice(0, 3)].join('·')} 1:1 화상과외, 30분 무료수업`,
    DESC: `전남 무안군 ${e}(${[...ex, ...ri].join('·')}) 과외. ${local.length ? local.map((s) => s.short).join('·') + ' 내신 대비, ' : ''}수학·영어·국어·과학 등 1:1 화상과외, 30분 무료수업 ☎ 010-2224-4713`,
    KEYWORDS: [`무안 ${e} 과외`, `${e} 과외`, ...ex.map((x) => `${x} 과외`), ...SUBJECTS.map((s) => `${e} ${s.n}과외`), ...ri.map((r) => `${e} ${r} 과외`)].join(','),
    MAIN: [hero(`무안 ${e} 과외<br><span>1:1 화상과외</span>`, `${e} 어디서든 집에서 받는 1:1 화상과외. 선생님 500명 이상 중 맞는 선생님을 무료로 찾아드립니다.`, crumb([['무안 화상과외', './'], [e]])),
      sec('', `${e}은 어떤 곳인가요?`, '', `<p>${note} ${e}은 ${ri.join(', ')} 등 ${ri.length}개 법정리로 이루어져 있습니다${ex.length ? ` (${ex.join('·')} 포함)` : ''}.</p><p>화상 수업이라 ${e} 어느 마을에 살아도 남악·목포 학원까지 오가지 않고 집에서 같은 수업을 받을 수 있습니다.</p>`),
      local.length ? sec('white', `${e} 학교 과외 · 급식표 · 학사일정`, `${e}에 있는 학교 ${local.length}곳`, schoolLinks(local)) : '',
      sec('', `${e} 과목별 과외`, '', subjLinks(SUBJECTS, `${e} `)),
      sec('white', '무안군 다른 지역', '', areaCards()), final(`${e} 30분 무료수업 받아보세요`)].join('\n')
  });
}

// ───── 학교 ─────
for (const s of SCHOOLS) {
  const subj = SUBJECTS.filter((x) => x.lv.includes(s.lv));
  const cls = Object.entries(s.classes);
  const total = cls.reduce((n, [, c]) => n + c, 0);
  const type = [s.hsType, s.special].filter(Boolean).join(' · ');
  const intro = `${s.name}(${s.eng})은 전남 무안군 ${s.eup}에 있는 ${s.found} ${s.coedu} ${s.kind}${type ? `(${type})` : ''}입니다. ${fmtDate(s.fondYmd)} 개교했으며${total ? `, ${s.ay}학년도 기준 ${cls.map(([g, c]) => `${g}학년 ${c}학급`).join(' · ')}으로 모두 ${total}학급입니다` : ''}.`;
  const rows = [['학교명', s.name], ['영문명', s.eng], ['학교급', s.kind], ['설립 구분', s.found], ['남녀공학', s.coedu], ...(type ? [['학교 유형', type]] : []),
    ['개교일', fmtDate(s.fondYmd)], ['개교기념일', fmtDate(s.memorial)], ...(total ? [['학급 수', `${total}학급 (${cls.map(([g, c]) => `${g}학년 ${c}`).join(', ')}) · ${s.ay}학년도`]] : []),
    ['주소', `(${s.zip}) ${s.addr}`], ['전화', `<a href="tel:${s.tel.replace(/\D/g, '')}">${s.tel}</a>`], ['팩스', s.fax],
    ...(s.home ? [['홈페이지', `<a href="${esc(s.home)}" target="_blank" rel="nofollow noopener">${esc(s.home)}</a>`]] : []), ['관할 교육청', s.office]];
  const others = SCHOOLS.filter((x) => x !== s && (x.eup === s.eup || x.kind === s.kind));
  page(`school/${s.name}/`, {
    SCHOOL: s.name,
    TITLE: `${s.name} 과외 · 급식표 · 학사일정 | ${s.short} 내신 1:1 화상과외`,
    DESC: `${s.name}(무안군 ${s.eup}) 학교 정보, 이번 주 급식표, 이번 달 학사일정. ${fmtDate(s.fondYmd)} 개교 ${s.found} ${s.kind}. ${s.short} 수학·영어·국어 등 내신 1:1 화상과외, 30분 무료수업 ☎ 010-2224-4713`,
    KEYWORDS: [`${s.name} 과외`, `${s.short} 과외`, `${s.short} 급식`, `${s.name} 급식표`, `${s.short} 학사일정`, `${s.short} 내신`, ...subj.slice(0, 8).map((x) => `${s.short} ${x.n}과외`)].join(','),
    JSONLD: orgLd([{ '@type': { 고: 'HighSchool', 중: 'MiddleSchool', 초: 'ElementarySchool' }[s.lv], name: s.name, alternateName: s.eng,
      foundingDate: `${s.fondYmd.slice(0, 4)}-${s.fondYmd.slice(4, 6)}-${s.fondYmd.slice(6)}`, telephone: s.tel, faxNumber: s.fax, ...(s.home ? { sameAs: s.home } : {}),
      address: { '@type': 'PostalAddress', postalCode: s.zip, streetAddress: s.addr, addressLocality: '무안군', addressRegion: '전라남도', addressCountry: 'KR' } }]),
    EXTRA: '<script src="school.js" defer></script>',
    MAIN: [hero(`${s.name} 과외<br><span>급식표 · 학사일정</span>`, intro, crumb([['무안 화상과외', './'], [`무안 ${s.eup}`, `area/${s.eup}/`], [s.short]])),
      sec('', `${s.short} 학교 정보`, '자료: 교육부 나이스(NEIS) 교육정보 개방 포털', `<table class="info"><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>`),
      `<section class="doc white" data-neis data-atpt="${s.atpt}" data-code="${s.code}"><div class="wrap">
  <h2>${s.short} 급식표</h2><p class="lead">${s.name} 주간 급식 식단 (나이스 실시간 조회)</p>
  <div class="nav-row"><button type="button" data-week="-1">‹ 지난주</button><b id="weekLabel"></b><button type="button" data-week="1">다음 주 ›</button></div>
  <div class="meals" id="meals">불러오는 중…</div>
  <h2 style="margin-top:48px">${s.short} 학사일정</h2><p class="lead">시험·방학·행사 일정 (나이스 실시간 조회)</p>
  <div class="nav-row"><button type="button" data-month="-1">‹ 이전 달</button><b id="monthLabel"></b><button type="button" data-month="1">다음 달 ›</button></div>
  <ul class="events" id="events"></ul>
</div></section>`,
      sec('', `${s.short} 과외 · 내신 대비`, `${s.short} 시험 범위와 교과서에 맞춰 1:1 화상으로 수업합니다. 과목을 누르면 자세한 안내를 볼 수 있습니다.`, subjLinks(subj, `${s.short} `)),
      others.length ? sec('white', `무안 ${s.eup}·${s.kind} 다른 학교`, '', schoolLinks(others)) : '', final(`${s.short} 30분 무료수업 받아보세요`)].join('\n')
  });
}

const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${encodeURI(p)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`built ${pages.length} pages`);
