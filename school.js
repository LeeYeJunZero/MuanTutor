// 학교 페이지: NEIS 급식(주간)·학사일정(월간)을 브라우저에서 바로 조회
// 키 없이 부르면 한 번에 5건까지만 주므로 하루 단위로 나눠 부름 (하루 급식은 조·중·석식 최대 3건)
(() => {
  const box = document.querySelector('[data-neis]');
  if (!box) return;
  const { atpt, code } = box.dataset;
  const DAY = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const label = (d) => `${d.getMonth() + 1}/${d.getDate()} (${DAY[d.getDay()]})`;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const today = ymd(new Date());

  const neis = async (service, params) => {
    const r = await fetch('https://open.neis.go.kr/hub/' + service + '?' + new URLSearchParams({ Type: 'json', pIndex: 1, pSize: 5, ATPT_OFCDC_SC_CODE: atpt, SD_SCHUL_CODE: code, ...params }));
    const j = await r.json();
    if (j.RESULT?.CODE === 'INFO-200') return [];
    if (!j[service]) throw new Error(j.RESULT?.MESSAGE || 'NEIS');
    return j[service][1].row;
  };
  // 7개씩 끊어서 동시에 요청 (NEIS 과부하 방지)
  const byDays = async (days, fn) => {
    const out = [];
    for (let i = 0; i < days.length; i += 7) out.push(...await Promise.all(days.slice(i, i + 7).map(fn)));
    return out;
  };
  // '혼합곡밥 (5)<br/>수제비국 (5.6.9.)' → ['혼합곡밥', '수제비국']
  const dishes = (s) => String(s || '').split(/<br\s*\/?>/i).map((x) => x.replace(/\s*\([\d.\s]+\)\s*$/, '').trim()).filter(Boolean);

  // 급식: 월~금
  const mealsBox = document.getElementById('meals'), weekLabel = document.getElementById('weekLabel');
  let week = [0, 6].includes(new Date().getDay()) ? 1 : 0, mealReq = 0;
  const showMeals = async () => {
    const req = ++mealReq;
    const mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) + week * 7);
    const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return d; });
    weekLabel.textContent = `${label(days[0])} – ${label(days[4])}`;
    mealsBox.textContent = '불러오는 중…';
    let rows;
    try { rows = await byDays(days, (d) => neis('mealServiceDietInfo', { MLSV_YMD: ymd(d) })); } catch {
      if (req === mealReq) mealsBox.textContent = '급식 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      return;
    }
    if (req !== mealReq) return;
    mealsBox.textContent = '';
    days.forEach((d, i) => {
      const card = el('article', 'meal' + (ymd(d) === today ? ' today' : ''));
      card.append(el('h4', '', label(d) + (ymd(d) === today ? ' 오늘' : '')));
      const meals = rows[i].sort((a, b) => a.MMEAL_SC_CODE - b.MMEAL_SC_CODE);
      if (!meals.length) card.append(el('p', 'none', '급식 없음'));
      for (const m of meals) {
        const h = el('p', 'mn', m.MMEAL_SC_NM);
        if (m.CAL_INFO) h.append(el('small', '', ' ' + m.CAL_INFO));
        const ul = el('ul');
        for (const x of dishes(m.DDISH_NM)) ul.append(el('li', '', x));
        card.append(h, ul);
      }
      mealsBox.append(card);
    });
  };

  // 학사일정: 한 달
  const evBox = document.getElementById('events'), monthLabel = document.getElementById('monthLabel');
  let month = 0, evReq = 0;
  const showEvents = async () => {
    const req = ++evReq;
    const now = new Date(), first = new Date(now.getFullYear(), now.getMonth() + month, 1);
    const n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: n }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1));
    monthLabel.textContent = `${first.getFullYear()}년 ${first.getMonth() + 1}월`;
    evBox.textContent = ''; evBox.append(el('li', '', '불러오는 중…'));
    let rows;
    try { rows = await byDays(days, (d) => neis('SchoolSchedule', { AA_YMD: ymd(d) })); } catch {
      if (req === evReq) evBox.firstChild.textContent = '학사일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      return;
    }
    if (req !== evReq) return;
    evBox.textContent = '';
    days.forEach((d, i) => {
      const names = [...new Set(rows[i].filter((r) => r.EVENT_NM.trim() !== '토요휴업일').map((r) => r.EVENT_NM.trim()))];
      if (!names.length) return;
      const off = rows[i].some((r) => r.SBTR_DD_SC_NM === '휴업일');
      const li = el('li');
      li.append(el('time', '', label(d)));
      const t = el('span', '', names.join(', '));
      if (off) t.append(el('span', 'off', '휴업일'));
      li.append(t);
      evBox.append(li);
    });
    if (!evBox.children.length) evBox.append(el('li', '', '이 달에 등록된 학사일정이 없습니다.'));
  };

  document.querySelectorAll('[data-week]').forEach((b) => b.addEventListener('click', () => { week += +b.dataset.week; showMeals(); }));
  document.querySelectorAll('[data-month]').forEach((b) => b.addEventListener('click', () => { month += +b.dataset.month; showEvents(); }));
  showMeals(); showEvents();
})();
