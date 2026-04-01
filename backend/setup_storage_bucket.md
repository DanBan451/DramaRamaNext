# Supabase Storage Bucket Setup

To enable permanent avatar image storage, you need to create a storage bucket in Supabase:

## Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Configure the bucket:
   - **Name**: `generated-images`
   - **Public bucket**: ✅ Enable (so images are publicly accessible)
   - Click **Create bucket**

6. Set up bucket policies (optional but recommended):
   - Click on the `generated-images` bucket
   - Go to **Policies** tab
   - Add a policy to allow public read access:
     ```sql
     CREATE POLICY "Public Access"
     ON storage.objects FOR SELECT
     USING ( bucket_id = 'generated-images' );
     ```

## Verification:

After setup, the backend will automatically:
- Download images from DALL-E temporary URLs
- Upload them to `generated-images` bucket
- Return permanent Supabase Storage URLs
- Images will never expire

## Troubleshooting:

If images still don't persist:
1. Check backend logs for Supabase storage errors
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in `.env`
3. Ensure the bucket is public
4. Check bucket policies allow uploads from service role
