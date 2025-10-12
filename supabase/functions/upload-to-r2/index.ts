import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.651.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// R2 Configuration
const R2_ENDPOINT = "https://12ac7fddf1431350151f0a36c0c79932.r2.cloudflarestorage.com";
const R2_BUCKET = "sparkwave-content-media";
const R2_PUBLIC_URL = "https://pub-21e749d6676a4b038864bf1b9bf19bc1.r2.dev";
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('POST request received - Upload to R2 request starting');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file || !fileName) {
      throw new Error('Missing file or fileName in request');
    }

    console.log(`Uploading file: ${fileName}, size: ${file.size} bytes, type: ${file.type}`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Construct public URL
    const publicUrl = `${R2_PUBLIC_URL}/${fileName}`;

    console.log(`Successfully uploaded to R2: ${publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        publicUrl,
        fileName 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('R2 upload error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
