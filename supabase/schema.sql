-- 본사 ISO 45001 운영 프로그램 · Supabase 테이블
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. (한 번만)

create table if not exists public.iso_records (
  kind       text        not null,          -- prep | evid | qa | nc | settings
  id         bigint      not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);

-- 브라우저에서 직접 접근하지 못하도록 RLS를 켜고 정책은 만들지 않습니다.
-- 데이터는 Vercel 서버 함수(api/records.js)가 service_role 키로만 읽고 씁니다.
alter table public.iso_records enable row level security;
