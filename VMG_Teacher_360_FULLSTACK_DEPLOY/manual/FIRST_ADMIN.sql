-- 1) Create the user in Supabase Authentication first.
-- 2) Replace the values below and run this statement.

update public.profiles
set
  full_name = 'YOUR FULL NAME',
  role = 'rnd',               -- rnd or bod for the first administrator
  home_centre_code = 'PVT',
  region_no = 1,
  language_preference = 'vi',
  is_active = true,
  updated_at = now()
where lower(email) = lower('YOUR_EMAIL@COMPANY.COM');

-- Verify:
select id,email,full_name,role,home_centre_code,region_no,is_active
from public.profiles
where lower(email) = lower('YOUR_EMAIL@COMPANY.COM');
