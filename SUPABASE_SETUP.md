# Connect Fleur d'Amour to Supabase

The storefront remains HTML/CSS/Vanilla JS and can stay on Netlify. Supabase provides hosted Postgres + Auth. The browser only receives the public anon/publishable key; row-level security (RLS) protects all writes.

## 1. Create the database project

1. Create a Supabase project at https://supabase.com/dashboard (the free tier is sufficient to start; check current limits before launch).
2. Open **SQL Editor** and run the complete file `supabase/migrations/202611160001_secure_store.sql`.
3. In **Project Settings → API**, copy the Project URL and anon/publishable key.
4. Put them in `js/supabase-config.js` as `FLEUR_SUPABASE_URL` and `FLEUR_SUPABASE_ANON_KEY`. This is the public browser key, not a secret. Never use `service_role` in frontend code or commit it to Git.

## 2. Create the first administrator

1. In **Authentication → Users**, create/invite the owner's email and set a strong password.
2. In SQL Editor, assign the admin claim to that exact account (replace the email):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'owner@example.com';
```

3. Sign in at `/admin.html`. Only accounts with `app_metadata.role = admin` can open the studio. Never add the role to `user_metadata`, which users can edit themselves.

## 3. Configure Netlify

The site is static, so keep the current publish directory (`.`). Commit the public Supabase URL/key in `js/supabase-config.js`, or replace the two values at build time with your own secure deployment process. Redeploy after the config is set.

## 4. What is connected

- Admin product CRUD → `products`; visible products are read by the public catalogue and product page.
- Quote form → inserts a customer request into `orders`; admin can view it and update its status.
- Sales and promotions → central `sales` and `offers` tables; changes are stored across devices.
- RLS blocks public reads of customer orders, sales and admin-only data. Visitors may only submit new quote requests.

## 5. Before accepting real customers

- Confirm the business product names, photos, prices, delivery fees and policies.
- Test sign-in, order submission and status updates on the deployed domain.
- Configure Supabase Auth allowed redirect/site URLs for the final domain and enable email confirmation / password recovery as appropriate.
- Add CAPTCHA/rate limiting and a privacy notice before public launch. The quote form is not a payment checkout; no card data is collected.
- Back up the database and review Supabase's current free-tier limits.

The app intentionally does not include any database password, service-role key, or admin password in this repository.
