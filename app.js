(() => {
  const app = document.getElementById('app');
  const toast = document.getElementById('toast');
  const dbStatus = document.getElementById('dbStatus');
  const KEY = 'skillio:session:v2';
  const QUIZ_SIZE = 12;

  let content = { topics: [], lessons: [], questions: [] };
  let db = { state: 'loading', message: 'Supabase wird verbunden', loadedAt: null, counts: { topics: 0, lessons: 0, questions: 0, options: 0 } };
  let state = { route: 'dashboard', topic: 'change-management', lesson: null, quiz: null, result: null, progress: [], attempts: [], xp: 0, level: 1, streak: 0 };

  try { state = { ...state, ...JSON.parse(sessionStorage.getItem(KEY) || '{}') }; } catch { sessionStorage.removeItem(KEY); }
  const hash = location.hash.replace('#', '');
  if (['dashboard', 'topics', 'topic', 'lesson', 'quiz', 'result', 'solutions', 'profile'].includes(hash)) state.route = hash;

  const save = () => sessionStorage.setItem(KEY, JSON.stringify(state));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const compact = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const by = (items, id) => items.find((item) => item.id === id);
  const tList = () => content.topics;
  const lList = (topic) => content.lessons.filter((lesson) => lesson.topic === topic);
  const qList = (topic) => content.questions.filter((question) => question.topic === topic);

  function notify(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function setDbButton() {
    if (!dbStatus) return;
    dbStatus.textContent = ({ loading: 'DB lädt', ready: 'DB live', empty: 'DB leer', error: 'DB Fehler', missing: 'DB fehlt' }[db.state] || 'DB prüfen');
  }

  function normalizeUrl(url) {
    return String(url || '').trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  }

  function getClient() {
    const cfg = window.SKILLIO_SUPABASE_CONFIG || {};
    const url = normalizeUrl(cfg.url);
    const key = cfg.publicKey || cfg.publishableKey || cfg.key;
    if (!url || !key || !window.supabase?.createClient) return null;
    return window.supabase.createClient(url, key, { db: { schema: 'skillio' } });
  }

  function from(client, table) {
    return typeof client.schema === 'function' ? client.schema('skillio').from(table) : client.from(table);
  }

  async function selectAll(client, table, columns, orderBy) {
    const rows = [];
    const size = 1000;
    for (let start = 0; ; start += size) {
      let query = from(client, table).select(columns).range(start, start + size - 1);
      if (orderBy) query = query.order(orderBy, { ascending: true });
      const { data, error } = await query;
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(data || []));
      if (!data || data.length < size) break;
    }
    return rows;
  }

  function mapTopic(row) {
    return { id: row.id, title: row.title, desc: row.description, tag: row.category || row.level || 'Skillio', position: Number(row.position || 0) };
  }

  function mapLesson(row) {
    const body = String(row.content_md || row.description || row.title).split(/\n{2,}|\n|(?<=\.)\s+(?=[A-ZÄÖÜ])/).map(compact).filter(Boolean);
    return { id: row.id, topic: row.topic_id, module: row.module_id || row.id, title: row.title, desc: row.description || row.learning_goal || '', body: body.length ? body : [row.title], rule: row.learning_goal || 'Wende das Gelernte in einer konkreten Entscheidungssituation an.', xp: Number(row.xp_reward || 30), position: Number(row.position || 0) };
  }

  function mapQuestions(questionRows, optionRows) {
    const grouped = new Map();
    optionRows.slice().sort((a, b) => String(a.question_id).localeCompare(String(b.question_id)) || Number(a.position || 0) - Number(b.position || 0)).forEach((option) => {
      const options = grouped.get(option.question_id) || [];
      options.push({ text: option.option_text, correct: option.is_correct === true });
      grouped.set(option.question_id, options);
    });
    return questionRows.map((row) => {
      const options = grouped.get(row.id) || [];
      return { id: row.id, topic: row.topic_id, module: row.module_id || '', q: row.question_text, o: options.map((option) => option.text), a: Math.max(0, options.findIndex((option) => option.correct)), ex: row.explanation || row.recommendation || 'Wiederhole die passende Lektion und prüfe die Begründung.', difficulty: row.difficulty || '', position: Number(row.position || 0) };
    }).filter((question) => question.o.length >= 2);
  }

  async function loadContent() {
    db = { ...db, state: 'loading', message: 'Supabase wird verbunden' };
    setDbButton();
    render();

    const client = getClient();
    if (!client) {
      content = { topics: [], lessons: [], questions: [] };
      db = { ...db, state: 'missing', message: 'Supabase Config oder Client fehlt. Prüfe URL, publicKey und CDN-Verbindung.' };
      setDbButton();
      render();
      return;
    }

    try {
      const [topics, lessons, questions, options] = await Promise.all([
        selectAll(client, 'topics', 'id,title,description,category,level,status,position', 'position'),
        selectAll(client, 'lessons', 'id,topic_id,module_id,title,description,content_md,learning_goal,xp_reward,status,position', 'position'),
        selectAll(client, 'quiz_questions', 'id,topic_id,module_id,question_text,explanation,recommendation,difficulty,status,position', 'position'),
        selectAll(client, 'quiz_options', 'question_id,option_text,is_correct,position', 'question_id')
      ]);

      content = {
        topics: topics.filter((row) => row.status !== 'archived').map(mapTopic).sort((a, b) => a.position - b.position),
        lessons: lessons.filter((row) => row.status !== 'archived').map(mapLesson).sort((a, b) => a.position - b.position),
        questions: mapQuestions(questions.filter((row) => row.status !== 'archived'), options)
      };

      if (!content.topics.some((topic) => topic.id === state.topic)) state.topic = content.topics[0]?.id || 'change-management';
      db = { state: content.questions.length ? 'ready' : 'empty', message: content.questions.length ? 'Supabase Content geladen' : 'Supabase ist verbunden, aber keine Fragen wurden gefunden.', loadedAt: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }), counts: { topics: content.topics.length, lessons: content.lessons.length, questions: content.questions.length, options: options.length } };
      save();
      notify(content.questions.length ? `${content.questions.length} Fragen aus Supabase geladen` : 'DB verbunden, aber keine Fragen gefunden');
    } catch (error) {
      content = { topics: [], lessons: [], questions: [] };
      db = { ...db, state: 'error', message: error.message || 'Supabase konnte nicht geladen werden.' };
    }
    setDbButton();
    render();
  }

  function modules(topicId) {
    const map = new Map();
    lList(topicId).forEach((lesson) => {
      if (!map.has(lesson.module)) map.set(lesson.module, { id: lesson.module, title: lesson.title.replace(/^Change Management:\s*|^IT Bullshit Bingo:\s*/i, ''), desc: lesson.desc, firstLesson: lesson.id, count: 0 });
      map.get(lesson.module).count += 1;
    });
    return [...map.values()];
  }

  function stats(topicId) {
    const lessons = lList(topicId);
    const questions = qList(topicId);
    const done = state.progress.filter((item) => item.topic === topicId).length;
    const best = Math.max(0, ...state.attempts.filter((item) => item.topic === topicId).map((item) => item.percentage || 0));
    const progress = Math.min(100, Math.round((lessons.length ? done / lessons.length * 65 : 0) + best * 0.35));
    return { lessons: lessons.length, questions: questions.length, done, best, progress, status: progress >= 100 ? 'Abgeschlossen' : progress > 0 ? 'In Bearbeitung' : 'Neu' };
  }

  function overall() {
    const list = tList();
    if (!list.length) return { progress: 0, open: 0 };
    return { progress: Math.round(list.reduce((sum, topic) => sum + stats(topic.id).progress, 0) / list.length), open: list.filter((topic) => stats(topic.id).best < 80).length };
  }

  function go(route, patch = {}) {
    Object.assign(state, patch, { route });
    save();
    history.replaceState(null, '', `#${route}`);
    render();
    app.focus();
  }

  function complete(id) {
    const lesson = by(content.lessons, id);
    if (!lesson) return;
    if (!state.progress.some((item) => item.lesson === id)) {
      state.progress.push({ lesson: id, topic: lesson.topic, status: 'completed', progress_percent: 100 });
      state.xp += lesson.xp;
      state.level = Math.floor(state.xp / 250) + 1;
      state.streak = Math.max(1, state.streak);
      notify(`Lektion abgeschlossen · +${lesson.xp} XP`);
      save();
    }
    render();
  }

  function sample(topicId) {
    const pool = qList(topicId).slice();
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(QUIZ_SIZE, pool.length)).map((q) => q.id);
  }

  function currentQuiz() {
    if (!state.quiz) return [];
    return (state.quiz.ids || []).map((id) => by(content.questions, id)).filter(Boolean);
  }

  function startQuiz(topicId) {
    const ids = sample(topicId);
    if (!ids.length) return notify('Für dieses Thema sind keine Fragen geladen.');
    state.quiz = { topic: topicId, i: 0, ids, answers: [] };
    state.result = null;
    go('quiz');
  }

  function nextQuestion() {
    const list = currentQuiz();
    if (!state.quiz || !list.length) return;
    if (state.quiz.i < list.length - 1) {
      state.quiz.i += 1;
      save();
      render();
      return;
    }
    const details = list.map((q, i) => {
      const selectedIndex = state.quiz.answers[i];
      return {
        id: q.id,
        correct: q.a === selectedIndex,
        question: q.q,
        options: q.o,
        selectedIndex,
        correctIndex: q.a,
        selectedAnswer: selectedIndex === undefined ? 'Keine Antwort' : q.o[selectedIndex],
        correctAnswer: q.o[q.a],
        recommendation: q.ex
      };
    });
    const score = details.filter((item) => item.correct).length;
    const percentage = Math.round(score / list.length * 100);
    state.xp += score * 12 + (percentage >= 80 ? 30 : 0);
    state.level = Math.floor(state.xp / 250) + 1;
    state.streak = Math.max(1, state.streak);
    state.result = { topic: state.quiz.topic, score, total: list.length, percentage, details, completedAt: new Date().toISOString() };
    state.attempts.unshift({ topic: state.quiz.topic, percentage, score, total: list.length, date: state.result.completedAt });
    state.quiz = null;
    save();
    go('result');
  }

  function statusPanel() {
    if (db.state === 'loading') return `<section class="panel"><p class="eyebrow">Datenbank</p><h2>Supabase wird geladen…</h2><p class="lead">Die App verbindet sich mit den Skillio-Content-Tabellen.</p></section>`;
    if (db.state === 'ready') return '';
    return `<section class="panel"><p class="eyebrow">Datenbankstatus</p><h2>${esc(db.state === 'empty' ? 'Keine Fragen gefunden' : 'Supabase prüfen')}</h2><p class="lead">${esc(db.message)}</p><div class="actions"><button class="btn primary" data-refresh>Erneut laden</button><button class="btn secondary" data-route="profile">Details anzeigen</button></div></section>`;
  }

  function card(topic) {
    const st = stats(topic.id);
    return `<article class="card topic-card"><div class="badges"><span class="badge info">${esc(topic.tag)}</span><span class="badge ${st.status === 'Abgeschlossen' ? 'ok' : st.status === 'Neu' ? '' : 'warn'}">${st.status}</span></div><h3>${esc(topic.title)}</h3><p>${esc(topic.desc)}</p><div class="progress"><i style="width:${st.progress}%"></i></div><div class="meta"><div class="row"><span>Fortschritt</span><strong>${st.progress}%</strong></div><div class="row"><span>Lektionen</span><strong>${st.done}/${st.lessons}</strong></div><div class="row"><span>Fragen in DB</span><strong>${st.questions}</strong></div></div><button class="btn primary" data-topic="${esc(topic.id)}">Öffnen</button></article>`;
  }

  function metrics() {
    const o = overall();
    return `<section class="metrics"><article class="metric"><small>Gesamtfortschritt</small><strong>${o.progress}%</strong><p>lokaler Testfortschritt</p></article><article class="metric"><small>XP & Level</small><strong>${state.xp || 0} XP</strong><p>Level ${state.level || 1}</p></article><article class="metric"><small>Fragen aus Supabase</small><strong>${db.counts.questions}</strong><p>${db.state === 'ready' ? 'live geladen' : esc(db.message)}</p></article><article class="metric"><small>Quizmodus</small><strong>${QUIZ_SIZE}</strong><p>Fragen pro Session</p></article></section>`;
  }

  function dashboard() {
    const list = tList();
    const first = list[0];
    return `${statusPanel()}<section class="panel hero"><div><p class="eyebrow">Skillio Learning Platform</p><h1>Professionell lernen. Fortschritt behalten. Entscheidungen besser treffen.</h1><p class="lead">Skillio lädt Lernbereiche, Lektionen und Quizfragen direkt aus Supabase. Fortschritt, XP und Quizversuche sind aktuell lokaler Testzustand in dieser Browser-Session.</p><div class="actions"><button class="btn primary" data-route="topics">Thema wählen</button>${first ? `<button class="btn secondary" data-topic="${esc(first.id)}">Weiterlernen</button>` : '<button class="btn secondary" data-refresh>DB erneut laden</button>'}</div></div><aside class="metric"><small>DB Status</small><strong>${esc(db.state === 'ready' ? 'Live' : db.state)}</strong><p>${esc(db.message)}${db.loadedAt ? ` · ${esc(db.loadedAt)}` : ''}</p></aside></section>${metrics()}<section class="panel"><div class="head"><div><p class="eyebrow">Themenauswahl</p><h2>Verfügbare Lernbereiche</h2></div></div><div class="grid two">${list.length ? list.map(card).join('') : '<article class="card"><h3>Noch keine Themen geladen</h3><p>Prüfe Supabase-Verbindung und Import.</p></article>'}</div></section>`;
  }

  function topicsView() {
    const list = tList();
    return `${statusPanel()}<section class="panel"><div class="head"><div><p class="eyebrow">Themenauswahl</p><h2>Wähle deinen Lernbereich</h2><p class="lead">Jedes Thema nutzt seine eigenen Supabase-Lektionen und Quizfragen.</p></div></div><div class="grid two">${list.length ? list.map(card).join('') : '<article class="card"><h3>Keine Themen vorhanden</h3><p>Der Import muss zuerst in Supabase vorhanden sein.</p></article>'}</div></section>`;
  }

  function topicView() {
    const topic = by(tList(), state.topic) || tList()[0];
    if (!topic) return dashboard();
    const st = stats(topic.id);
    const mods = modules(topic.id);
    return `<section class="panel"><div class="head"><div><p class="eyebrow">Themen-Detailseite</p><h2>${esc(topic.title)}</h2><p class="lead">${esc(topic.desc)}</p></div><div class="badges"><span class="badge info">${st.progress}% Fortschritt</span><span class="badge">${st.questions} Fragen</span></div></div><div class="progress"><i style="width:${st.progress}%"></i></div><div class="actions"><button class="btn primary" data-start="${esc(topic.id)}">Lektion starten</button><button class="btn secondary" data-quiz="${esc(topic.id)}">Quiz starten</button>${state.result?.topic === topic.id ? `<button class="btn secondary" data-route="solutions">Letzte Lösungen</button>` : ''}</div></section><section class="panel"><div class="head"><div><p class="eyebrow">Module aus Supabase</p><h2>Lernstruktur</h2></div></div><div class="grid">${mods.map((m) => `<article class="module"><div><h3>${esc(m.title)}</h3><p>${esc(m.desc)}</p><small>${m.count} Lerneinheit${m.count === 1 ? '' : 'en'}</small></div><button class="btn secondary" data-lesson="${esc(m.firstLesson)}">Öffnen</button></article>`).join('')}</div></section>`;
  }

  function lessonView() {
    const list = lList(state.topic);
    const lesson = by(list, state.lesson) || list[0];
    if (!lesson) return '<section class="empty">Keine Lektionen vorhanden.</section>';
    const done = state.progress.some((item) => item.lesson === lesson.id);
    return `<section class="learn"><aside class="side">${list.map((l) => `<button class="${l.id === lesson.id ? 'active' : ''}" data-lesson="${esc(l.id)}"><small>${state.progress.some((p) => p.lesson === l.id) ? 'Abgeschlossen' : 'Lektion'}</small><strong>${esc(l.title)}</strong><span>${esc(l.desc)}</span></button>`).join('')}</aside><article class="lesson"><p class="eyebrow">Lektion aus Supabase</p><h1>${esc(lesson.title)}</h1><div class="body">${lesson.body.map((p) => `<p>${esc(p)}</p>`).join('')}<blockquote>${esc(lesson.rule)}</blockquote></div><div class="actions"><button class="btn secondary" data-topic="${esc(lesson.topic)}">Zurück</button><button class="btn primary" data-complete="${esc(lesson.id)}" ${done ? 'disabled' : ''}>${done ? 'Abgeschlossen' : 'Als abgeschlossen markieren'}</button></div></article></section>`;
  }

  function quizView() {
    const list = currentQuiz();
    if (!state.quiz || !list.length) return '<section class="empty">Kein Quiz aktiv oder keine Fragen geladen.</section>';
    const q = list[state.quiz.i] || list[0];
    const selected = state.quiz.answers[state.quiz.i];
    return `<section class="quiz"><p class="eyebrow">Supabase Quiz · Frage ${state.quiz.i + 1} von ${list.length}</p><div class="question">${esc(q.q)}</div><div class="choices">${q.o.map((option, i) => `<button class="choice ${selected === i ? 'selected' : ''}" data-choice="${i}">${esc(option)}</button>`).join('')}</div><div class="actions"><button class="btn secondary" data-topic="${esc(state.quiz.topic)}">Abbrechen</button><button class="btn primary" data-next ${selected === undefined ? 'disabled' : ''}>${state.quiz.i === list.length - 1 ? 'Auswerten' : 'Weiter'}</button></div></section>`;
  }

  function resultView() {
    const r = state.result;
    if (!r) return '<section class="empty">Noch kein Ergebnis vorhanden.</section>';
    const topic = by(tList(), r.topic);
    return `<section class="panel result"><p class="eyebrow">Quiz Ergebnis</p><h1>${r.percentage}%</h1><p class="lead">${esc(topic?.title || 'Thema')} · ${r.score}/${r.total} richtig</p><div class="progress"><i style="width:${r.percentage}%"></i></div><div class="actions"><button class="btn primary" data-route="solutions">Lösungen ansehen</button><button class="btn secondary" data-quiz="${esc(r.topic)}">Neues Quiz</button><button class="btn secondary" data-topic="${esc(r.topic)}">Zum Thema</button></div></section><section class="panel"><div class="head"><div><p class="eyebrow">Kurzfeedback</p><h2>Was du wiederholen solltest</h2><p class="lead">Die detaillierten Lösungen sind bewusst separat, damit das Ergebnis übersichtlich bleibt.</p></div></div><div class="grid">${r.details.slice(0, 4).map((item) => `<article class="card"><span class="badge ${item.correct ? 'ok' : 'warn'}">${item.correct ? 'Richtig' : 'Wiederholen'}</span><h3>${esc(item.question)}</h3><p>${esc(item.recommendation)}</p></article>`).join('')}</div></section>`;
  }

  function solutionsView() {
    const r = state.result;
    if (!r) return `<section class="empty"><h2>Noch keine Lösungen verfügbar</h2><p>Schließe zuerst ein Quiz ab. Danach kannst du hier die Lösungen separat ansehen.</p><div class="actions"><button class="btn primary" data-route="topics">Quiz starten</button></div></section>`;
    const topic = by(tList(), r.topic);
    return `<section class="panel"><div class="head"><div><p class="eyebrow">Quiz-Lösungen</p><h2>${esc(topic?.title || 'Letztes Quiz')}</h2><p class="lead">Vergleiche deine Antworten mit der richtigen Lösung und lies die Erklärung pro Frage.</p></div><div class="badges"><span class="badge ${r.percentage >= 80 ? 'ok' : 'warn'}">${r.percentage}% Ergebnis</span><span class="badge">${r.score}/${r.total} richtig</span></div></div><div class="actions"><button class="btn primary" data-quiz="${esc(r.topic)}">Neues Quiz</button><button class="btn secondary" data-route="result">Zur Auswertung</button><button class="btn secondary" data-topic="${esc(r.topic)}">Zum Thema</button></div></section><section class="panel"><div class="grid">${r.details.map((item, index) => `<article class="card"><div class="badges"><span class="badge ${item.correct ? 'ok' : 'warn'}">${item.correct ? 'Richtig' : 'Korrektur'}</span><span class="badge">Frage ${index + 1}</span></div><h3>${esc(item.question)}</h3><div class="meta"><div class="row"><span>Deine Antwort</span><strong>${esc(item.selectedAnswer)}</strong></div><div class="row"><span>Richtige Antwort</span><strong>${esc(item.correctAnswer)}</strong></div></div><div class="choices">${item.options.map((option, optionIndex) => `<div class="choice ${optionIndex === item.correctIndex ? 'selected' : ''}">${optionIndex === item.correctIndex ? '✓ ' : optionIndex === item.selectedIndex ? 'Deine Wahl: ' : ''}${esc(option)}</div>`).join('')}</div><p>${esc(item.recommendation)}</p></article>`).join('')}</div></section>`;
  }

  function profileView() {
    return `<section class="panel"><div class="head"><div><p class="eyebrow">Profil & Datenbank</p><h2>Teststatus</h2><p class="lead">Content kommt aus Supabase. Nutzerfortschritt ist aktuell noch lokaler Testzustand.</p></div><button class="btn secondary" data-refresh>DB neu laden</button></div><div class="grid two"><article class="card"><h3>Supabase</h3><div class="meta"><div class="row"><span>Status</span><strong>${esc(db.state)}</strong></div><div class="row"><span>Themen</span><strong>${db.counts.topics}</strong></div><div class="row"><span>Lektionen</span><strong>${db.counts.lessons}</strong></div><div class="row"><span>Fragen</span><strong>${db.counts.questions}</strong></div><div class="row"><span>Optionen</span><strong>${db.counts.options}</strong></div></div><p>${esc(db.message)}</p></article><article class="card"><h3>Session</h3><div class="meta"><div class="row"><span>XP</span><strong>${state.xp || 0}</strong></div><div class="row"><span>Level</span><strong>${state.level || 1}</strong></div><div class="row"><span>Streak</span><strong>${state.streak || 0}</strong></div><div class="row"><span>Quizversuche</span><strong>${state.attempts.length}</strong></div></div><div class="actions">${state.result ? '<button class="btn secondary" data-route="solutions">Letzte Lösungen ansehen</button>' : ''}<button class="btn secondary" data-reset>Lokalen Testfortschritt zurücksetzen</button></div></article></div></section>`;
  }

  function render() {
    setDbButton();
    const routes = { dashboard, topics: topicsView, topic: topicView, lesson: lessonView, quiz: quizView, result: resultView, solutions: solutionsView, profile: profileView };
    app.innerHTML = (routes[state.route] || dashboard)();
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, a');
    if (!target) return;
    if (target.matches('[data-choice]')) { state.quiz.answers[state.quiz.i] = Number(target.dataset.choice); save(); render(); return; }
    if (target.matches('[data-next]')) return nextQuestion();
    if (target.matches('[data-complete]')) return complete(target.dataset.complete);
    if (target.matches('[data-refresh]')) return loadContent();
    if (target.matches('[data-reset]')) { state.progress = []; state.attempts = []; state.xp = 0; state.level = 1; state.streak = 0; state.quiz = null; state.result = null; save(); notify('Lokaler Testfortschritt zurückgesetzt'); render(); return; }
    if (target.matches('[data-start]')) { const first = lList(target.dataset.start)[0]; return first ? go('lesson', { topic: target.dataset.start, lesson: first.id }) : notify('Keine Lektion gefunden.'); }
    if (target.matches('[data-quiz]')) return startQuiz(target.dataset.quiz);
    if (target.matches('[data-lesson]')) { const lesson = by(content.lessons, target.dataset.lesson); if (lesson) return go('lesson', { topic: lesson.topic, lesson: lesson.id }); }
    if (target.matches('[data-topic]')) return go('topic', { topic: target.dataset.topic });
    if (target.matches('[data-route]')) return go(target.dataset.route);
  });

  window.addEventListener('hashchange', () => {
    const route = location.hash.replace('#', '');
    if (route && route !== state.route) { state.route = route; save(); render(); }
  });

  render();
  loadContent();
})();