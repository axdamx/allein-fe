-- Keep agent metadata aligned with the single Z.AI runtime model.
-- Runtime inference already uses LLM_DEFAULT_MODEL; this updates the database
-- default and repairs records created under the retired DeepSeek setup.

alter table public.agents
  alter column model set default 'glm-4.5-flash';

update public.agents
set model = 'glm-4.5-flash'
where model in ('deepseek-v4-pro', 'deepseek-chat');
