alter table public.clients
  add column date_of_birth date;

create or replace function public.clients_upcoming_birthdays(
  p_owner_id uuid,
  p_months int
)
returns setof public.clients
language sql
stable
as $$
  select *
  from public.clients
  where owner_id = p_owner_id
    and date_of_birth is not null
    and (
      -- this year's birthday
      (make_date(
        extract(year from current_date)::int,
        extract(month from date_of_birth)::int,
        extract(day from date_of_birth)::int
      ) between current_date and current_date + (p_months || ' months')::interval)
      or
      -- next year's birthday (handles year-end wrap)
      (make_date(
        extract(year from current_date)::int + 1,
        extract(month from date_of_birth)::int,
        extract(day from date_of_birth)::int
      ) between current_date and current_date + (p_months || ' months')::interval)
    )
  order by
    extract(month from date_of_birth),
    extract(day from date_of_birth);
$$;
