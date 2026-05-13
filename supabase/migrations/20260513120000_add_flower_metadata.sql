alter table public.flowers
  add column if not exists hybridizer text,
  add column if not exists released text,
  add column if not exists colors text;
