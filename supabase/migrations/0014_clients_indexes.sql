-- Indexes for clients table performance
-- Without an index on owner_id, every query does a sequential scan

create index if not exists clients_owner_idx on public.clients(owner_id);
create index if not exists clients_owner_dob_idx on public.clients(owner_id, date_of_birth);
