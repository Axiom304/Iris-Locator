create table public.flowers (
  id integer primary key,
  sku text not null,
  title text not null,
  locations text not null
);

alter table public.flowers enable row level security;

create policy "flowers are readable by authenticated and anonymous users"
  on public.flowers
  for select
  to anon, authenticated
  using (true);

insert into public.flowers (id, sku, title, locations) values
  (1000, '1000-TB', 'Absolute Crush', '1W-12, 5E-66'),
  (4194, '4194-MDB', 'Decibelle', 'A-4-15, C-44-15, 16E-27'),
  (4187, '4187-IB', 'Coal Tar', 'C-22-3'),
  (1014, '1014-TB', 'Champagne And Strawberries', 'B-3-4');
