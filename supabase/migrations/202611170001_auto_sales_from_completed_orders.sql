-- Automatically record paid/completed orders as sales, once per order.
alter table public.sales
  add column if not exists order_id uuid references public.orders(id) on delete set null;

create unique index if not exists sales_order_id_unique
  on public.sales(order_id)
  where order_id is not null;

create or replace function public.record_completed_order_sale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric(10,2);
begin
  if new.status = 'completed'
     and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    -- Prices are captured in each order item at checkout. If any item was
    -- "price on request", do not invent a revenue amount.
    if jsonb_typeof(new.items) = 'array'
       and jsonb_array_length(new.items) > 0
       and not exists (
         select 1
         from jsonb_array_elements(new.items) item
         where coalesce((item->>'unit_price') = '', true)
            or item->>'unit_price' is null
            or (item->>'unit_price') !~ '^[0-9]+(\\.[0-9]{1,2})?$'
       ) then
      select round(sum((item->>'unit_price')::numeric * (item->>'qty')::numeric), 2)
        into v_total
      from jsonb_array_elements(new.items) item;

      if v_total > 0 then
        insert into public.sales(order_id, product_id, amount, sold_on, reference)
        values (new.id, null, v_total, current_date, 'Commande ' || left(new.id::text, 8))
        on conflict (order_id) where order_id is not null do nothing;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_record_sale_on_completion on public.orders;
create trigger orders_record_sale_on_completion
after insert or update of status on public.orders
for each row execute function public.record_completed_order_sale();
