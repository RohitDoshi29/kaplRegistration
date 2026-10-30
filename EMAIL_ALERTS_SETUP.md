# Email Notifications Setup Guide (Resend + Supabase)

This project is now equipped with a Supabase Edge Function (`notify-alert`) that automatically sends an email to the admin whenever a player registers or user activity occurs.

---

## 1. What has already been created for you:
- ✅ **Edge Function Code:** Created at [`supabase/functions/notify-alert/index.ts`](supabase/functions/notify-alert/index.ts) with responsive HTML email formatting (Name, Mobile, Flat, Role, Fee, UTR, Timestamp).
- ✅ **Frontend Trigger:** Integrated in [`src/App.tsx`](src/App.tsx#L525) to trigger the function automatically on registration (non-blocking).
- ✅ **Supabase Configuration:** Initialized [`supabase/config.toml`](supabase/config.toml).

---

## 2. What you need to do (takes ~3 minutes):

### Step A: Get your Free Resend API Key
1. Go to **[resend.com](https://resend.com)** and create a free account (includes 3,000 emails/month).
2. Go to **API Keys** in the left sidebar → click **Create API Key**.
3. Name it `KAPL Alert` and copy the key (starts with `re_...`).

---

### Step B: Add Secrets to Supabase
1. Open your **Supabase Dashboard**:  
   [https://supabase.com/dashboard/project/jftwjqprwjeesivzmycy/settings/functions](https://supabase.com/dashboard/project/jftwjqprwjeesivzmycy/settings/functions)
   *(Or go to **Project Settings** → **Edge Functions** → **Secrets**)*
2. Add these 2 secrets:
   - **`RESEND_API_KEY`**: *(paste your `re_...` key from Step A)*
   - **`ALERT_TO_EMAIL`**: `rohitdoshi2904@gmail.com` *(or any email address where you want to receive alerts)*

---

### Step C: Deploy the Edge Function
Run this single command in your terminal:
```bash
npx supabase functions deploy notify-alert --no-verify-jwt --project-ref jftwjqprwjeesivzmycy
```
*(If prompted to log in, run `npx supabase login` and paste your Supabase personal access token from [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)).*

---

### Step D: (Optional) Also Enable Database Webhook
If you also want Supabase to trigger an email even if someone inserts directly into the database:
1. In Supabase Dashboard, go to **Database** → **Webhooks**.
2. Click **Create a new webhook**.
3. Set:
   - **Name:** `send_email_on_player_insert`
   - **Table:** `public.players`
   - **Events:** Check **Insert**
   - **Type:** Supabase Edge Functions
   - **Edge Function:** Choose `notify-alert`
4. Click **Save Webhook**.

---

## 3. How to Test
1. Fill out a player registration on the website.
2. Submit the form.
3. Check your email inbox (`rohitdoshi2904@gmail.com`) — the alert will arrive within seconds!
