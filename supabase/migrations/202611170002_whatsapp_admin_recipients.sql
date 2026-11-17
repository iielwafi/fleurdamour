-- Store up to five WhatsApp notification recipients. No WhatsApp credentials are stored here.
create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 2 and 60),
  phone text not null unique check (phone ~ '^[+][1-9][0-9]{7,14}$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.notification_recipients enable row level security;
drop policy if exists "Admins manage notification recipients" on public.notification_recipients;
create policy "Admins manage notification recipients"
on public.notification_recipients for all to authenticated
using (public.is_store_admin()) with check (public.is_store_admin());

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  recipient_id uuid references public.notification_recipients(id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);
alter table public.notification_logs enable row level security;
drop policy if exists "Admins read notification logs" on public.notification_logs;
create policy "Admins read notification logs"
on public.notification_logs for select to authenticated
using (public.is_store_admin());
create index if not exists notification_logs_order_idx on public.notification_logs(order_id,created_at desc);
