create schema if not exists skillio;

create table if not exists skillio.topics (
  id text primary key,
  title text not null,
  description text not null,
  category text,
  level text,
  status text not null default 'active',
  position int not null default 0
);

create table if not exists skillio.lessons (
  id text primary key,
  topic_id text not null references skillio.topics(id),
  module_id text,
  title text not null,
  description text,
  content_md text not null,
  learning_goal text,
  xp_reward int not null default 30,
  status text not null default 'published',
  position int not null default 0
);

create table if not exists skillio.quiz_questions (
  id text primary key,
  topic_id text not null references skillio.topics(id),
  module_id text,
  question_text text not null,
  explanation text,
  recommendation text,
  difficulty text,
  status text not null default 'published',
  position int not null default 0
);

create table if not exists skillio.quiz_options (
  question_id text not null references skillio.quiz_questions(id),
  option_text text not null,
  is_correct boolean not null default false,
  position int not null default 0,
  primary key(question_id, position)
);

insert into skillio.topics (id,title,description,category,level,status,position) values
('change-management','Change Management & Data Mesh','Business Transformation, Adoption, Domaenenownership und foederiertes Enablement professionell fuehren.','Strategie & Organisation','Fortgeschritten','active',1),
('bullshit-bingo','IT Bullshit Bingo','Buzzwords sicher verstehen, entzaubern und in klare Managementsprache uebersetzen.','IT & Managementsprache','Grundlagen bis Profi','active',2)
on conflict (id) do update set title=excluded.title, description=excluded.description, category=excluded.category, level=excluded.level, status=excluded.status, position=excluded.position;

insert into skillio.lessons (id,topic_id,module_id,title,description,content_md,learning_goal,xp_reward,status,position) values
('cm-l1','change-management','cm-foundations','Transformation wird erst im Alltag real','Warum Konzepte und Plattformen noch keine Transformation sind.','Transformation entsteht erst, wenn Menschen anders entscheiden, zusammenarbeiten und Verantwortung uebernehmen.','Transformation ist erst real, wenn neue Routinen, Rollen und Entscheidungswege sichtbar werden.',40,'published',1),
('cm-l2','change-management','cm-foundations','Ownership braucht Mandat, Faehigkeit und Praxis','Kommunikation schafft Orientierung, aber keine echte Verantwortung.','Ownership entsteht durch klare Rolle, echtes Mandat, verfuegbare Kapazitaet, Standards und wiederholte Anwendung.','Fachbereiche uebernehmen Verantwortung, wenn Rolle, Mandat, Faehigkeit, Zeit und Fuehrung zusammenkommen.',45,'published',2),
('bb-l1','bullshit-bingo','bb-basics','Buzzwords von echter Bedeutung trennen','Professionell mit IT- und Managementbegriffen umgehen.','Begriffe werden in Bedeutung, Anwendungsfall, Risiko und Entscheidungsrelevanz uebersetzt.','Ein Begriff ist erst nuetzlich, wenn Nutzen, Kontext und Verhalten klar sind.',35,'published',3)
on conflict (id) do update set title=excluded.title, description=excluded.description, content_md=excluded.content_md, learning_goal=excluded.learning_goal, xp_reward=excluded.xp_reward, status=excluded.status, position=excluded.position;
