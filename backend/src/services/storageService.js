const path = require('path');
const fs = require('fs');

const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

async function uploadFile(file) {
  const ext = path.extname(file.originalname);
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  if (useSupabase) {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { error } = await supabase.storage
      .from('proofs')
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('proofs').getPublicUrl(filename);
    return data.publicUrl;
  }

  // Local dev fallback — save to disk
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
  return `uploads/${filename}`;
}

module.exports = { uploadFile };
