-- CampusCravings Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'seller', 'creator')),
  is_approved boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stores table (seller storefronts)
create table public.stores (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  name text not null,
  description text not null default '',
  photo_url text,
  pickup_area text not null default 'Other',
  is_open boolean not null default false,
  is_approved boolean not null default false,
  rating numeric(3,2) default 0,
  total_ratings integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categories table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  icon text not null default '🍽️',
  created_at timestamptz not null default now()
);

-- Food items table
create table public.food_items (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price > 0),
  quantity integer not null default 0 check (quantity >= 0),
  is_sold_out boolean not null default false,
  ordering_window text,
  photo_urls text[] default '{}',
  dietary_tags text[] default '{}',
  spice_level integer default 0 check (spice_level between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Item categories (many-to-many)
create table public.item_categories (
  item_id uuid references public.food_items(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  primary key (item_id, category_id)
);

-- Orders table
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'ready', 'completed', 'cancelled')),
  total_price numeric(10,2) not null default 0,
  pickup_time text not null,
  notes text,
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order items table
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  item_id uuid references public.food_items(id) on delete cascade not null,
  quantity integer not null default 1 check (quantity > 0),
  price_at_time numeric(10,2) not null
);

-- Reviews table
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null unique,
  user_id uuid references public.profiles(id) on delete cascade not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Favorites table
create table public.favorites (
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.food_items(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (item_id is not null or store_id is not null),
  primary key (user_id, coalesce(item_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(store_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

-- Reports table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  target_type text not null check (target_type in ('user', 'item', 'store')),
  target_id uuid not null,
  reason text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

-- Waitlists table
create table public.waitlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.food_items(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, item_id)
);

-- Create indexes
create index idx_stores_user_id on public.stores(user_id);
create index idx_stores_is_approved on public.stores(is_approved);
create index idx_food_items_store_id on public.food_items(store_id);
create index idx_orders_customer_id on public.orders(customer_id);
create index idx_orders_store_id on public.orders(store_id);
create index idx_orders_status on public.orders(status);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_reviews_store_id on public.reviews(store_id);
create index idx_reviews_user_id on public.reviews(user_id);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_is_read on public.notifications(is_read);
create index idx_favorites_user_id on public.favorites(user_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.food_items enable row level security;
alter table public.item_categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.waitlists enable row level security;

-- RLS Policies

-- Profiles: users can read all, update own
create policy "Profiles: public read"
  on public.profiles for select
  using (true);

create policy "Profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Stores: public read for approved, sellers manage own
create policy "Stores: public read approved"
  on public.stores for select
  using (is_approved = true or user_id = auth.uid());

create policy "Stores: sellers manage own"
  on public.stores for all
  using (user_id = auth.uid());

-- Categories: public read, creator manage
create policy "Categories: public read"
  on public.categories for select
  using (true);

create policy "Categories: creator manage"
  on public.categories for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'creator'
    )
  );

-- Food items: public read for items in approved stores
create policy "Food items: public read"
  on public.food_items for select
  using (
    exists (
      select 1 from public.stores
      where stores.id = food_items.store_id
      and (stores.is_approved = true or stores.user_id = auth.uid())
    )
  );

create policy "Food items: sellers manage own"
  on public.food_items for all
  using (
    exists (
      select 1 from public.stores
      where stores.id = food_items.store_id
      and stores.user_id = auth.uid()
    )
  );

-- Item categories: public read
create policy "Item categories: public read"
  on public.item_categories for select
  using (true);

create policy "Item categories: sellers manage own"
  on public.item_categories for all
  using (
    exists (
      select 1 from public.food_items
      join public.stores on stores.id = food_items.store_id
      where food_items.id = item_categories.item_id
      and stores.user_id = auth.uid()
    )
  );

-- Orders: visible to customer and store owner
create policy "Orders: customer read own"
  on public.orders for select
  using (customer_id = auth.uid());

create policy "Orders: store owner read"
  on public.orders for select
  using (
    exists (
      select 1 from public.stores
      where stores.id = orders.store_id
      and stores.user_id = auth.uid()
    )
  );

create policy "Orders: customer insert"
  on public.orders for insert
  with check (customer_id = auth.uid());

create policy "Orders: customer update own"
  on public.orders for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "Orders: store owner update"
  on public.orders for update
  using (
    exists (
      select 1 from public.stores
      where stores.id = orders.store_id
      and stores.user_id = auth.uid()
    )
  );

-- Order items: visible with order
create policy "Order items: read with order"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and (
        orders.customer_id = auth.uid()
        or exists (
          select 1 from public.stores
          where stores.id = orders.store_id
          and stores.user_id = auth.uid()
        )
      )
    )
  );

create policy "Order items: insert with order"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.customer_id = auth.uid()
    )
  );

-- Reviews: public read, write only for completed orders
create policy "Reviews: public read"
  on public.reviews for select
  using (true);

create policy "Reviews: insert own"
  on public.reviews for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.orders
      where orders.id = reviews.order_id
      and orders.customer_id = auth.uid()
      and orders.status = 'completed'
    )
  );

-- Favorites: users manage own
create policy "Favorites: read own"
  on public.favorites for select
  using (user_id = auth.uid());

create policy "Favorites: manage own"
  on public.favorites for all
  using (user_id = auth.uid());

-- Reports: users read own, creator read all
create policy "Reports: read own"
  on public.reports for select
  using (reporter_id = auth.uid());

create policy "Reports: creator read all"
  on public.reports for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'creator'
    )
  );

create policy "Reports: insert own"
  on public.reports for insert
  with check (reporter_id = auth.uid());

create policy "Reports: creator update"
  on public.reports for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'creator'
    )
  );

-- Notifications: users read own
create policy "Notifications: read own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Notifications: insert own"
  on public.notifications for insert
  with check (user_id = auth.uid());

create policy "Notifications: update own"
  on public.notifications for update
  using (user_id = auth.uid());

-- Waitlists: users manage own
create policy "Waitlists: read own"
  on public.waitlists for select
  using (user_id = auth.uid());

create policy "Waitlists: manage own"
  on public.waitlists for all
  using (user_id = auth.uid());

-- Function to update store rating when review is added
create or replace function update_store_rating()
returns trigger as $$
begin
  update public.stores
  set
    rating = (select coalesce(avg(rating), 0) from public.reviews where store_id = NEW.store_id),
    total_ratings = (select count(*) from public.reviews where store_id = NEW.store_id),
    updated_at = now()
  where id = NEW.store_id;
  return NEW;
end;
$$ language plpgsql;

-- Trigger for store rating update
create trigger on_review_added
  after insert on public.reviews
  for each row
  execute function update_store_rating();

-- Function to create notification
create or replace function create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_link text default null
)
returns void as $$
begin
  insert into public.notifications (user_id, title, message, link)
  values (p_user_id, p_title, p_message, p_link);
end;
$$ language plpgsql;

-- Seed default categories
insert into public.categories (name, icon) values
  ('Rice', '🍚'),
  ('Snacks', '🍿'),
  ('Desserts', '🍰'),
  ('Drinks', '🥤'),
  ('Bread', '🍞'),
  ('Noodles', '🍜'),
  ('Curry', '🍛'),
  ('Salad', '🥗'),
  ('Breakfast', '🥞'),
  ('Pasta', '🍝')
on conflict (name) do nothing;
