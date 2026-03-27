-- 문서 테이블
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default '새 기획 문서',
  content text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 코멘트 테이블
create table comments (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references documents(id) on delete cascade,
  section_id text not null,
  author text not null default '익명',
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz default now()
);

-- 버전 테이블
create table versions (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references documents(id) on delete cascade,
  label text not null,
  content text not null,
  created_at timestamptz default now()
);

-- 공유 링크 테이블
create table share_links (
  token uuid primary key default gen_random_uuid(),
  doc_id uuid not null references documents(id) on delete cascade,
  permission text not null check (permission in ('view', 'comment', 'suggest')),
  created_at timestamptz default now()
);

-- updated_at 자동 갱신
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on documents
  for each row execute function update_updated_at();

-- RLS 비활성화 (내부용 — 필요시 나중에 인증 추가)
alter table documents disable row level security;
alter table comments disable row level security;
alter table versions disable row level security;
alter table share_links disable row level security;
