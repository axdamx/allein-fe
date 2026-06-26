-- Function to filter clients by birthday month (1-12)
-- Uses EXTRACT at the DB level instead of fetching all rows and filtering in JS
create or replace function public.clients_by_birthday_month(
  p_owner_id uuid,
  p_month int
)
returns table(
  id uuid,
  name text,
  email text,
  phone text,
  company text,
  status public.client_status,
  date_of_birth date,
  created_at timestamptz
)
language sql
stable
as $$
  select cl.id, cl.name, cl.email, cl.phone, cl.company, cl.status, cl.date_of_birth, cl.created_at
  from public.clients cl
  where cl.owner_id = p_owner_id
    and cl.date_of_birth is not null
    and extract(month from cl.date_of_birth) = p_month
  order by cl.name asc;
$$;
