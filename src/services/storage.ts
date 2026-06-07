import { supabase } from './supabase';

/**
 * Uploads a receipt image or PDF file to the Supabase Storage bucket named 'receipts'.
 * Returns the public URL of the uploaded asset.
 */
export async function uploadReceipt(file: File): Promise<string> {
  // 1. Sanitize filename and create unique path
  const fileExt = file.name.split('.').pop();
  const cleanedName = file.name.substring(0, file.name.lastIndexOf('.')).replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${cleanedName}_${Date.now()}.${fileExt}`;
  const filePath = fileName; // Upload direct to bucket root

  // 2. Perform the upload
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error details:', error);
    throw new Error(`Failed to upload attachment: ${error.message}`);
  }

  // 3. Retrieve and return the public URL
  const { data: urlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(filePath);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to resolve public URL for uploaded receipt');
  }

  return urlData.publicUrl;
}
