import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// No need for manual base64 conversion, using the imported base64Encode utility instead


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY")?.trim();
    const urlEndpoint = Deno.env.get("IMAGEKIT_URL_ENDPOINT")?.trim();

    if (!privateKey || !urlEndpoint) {
      console.error("Missing ImageKit config:", { privateKey: !!privateKey, urlEndpoint: !!urlEndpoint });
      throw new Error("ImageKit credentials not configured");
    }

    // Log first few chars of key for debugging (safely)
    console.log("Using private key starting with:", (privateKey || "").substring(0, 8) + "...");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uploads";
    const fileName =
      (formData.get("fileName") as string) ||
      `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    if (!file) {
      throw new Error("No file provided");
    }

    console.log("Uploading file:", { fileName, folder, fileType: file.type, fileSize: file.size });

    // Convert file to base64 using efficient Deno utility
    const arrayBuffer = await file.arrayBuffer();
    const base64File = base64Encode(arrayBuffer);

    // Create form data for ImageKit API
    const uploadFormData = new FormData();
    uploadFormData.append("file", base64File);
    uploadFormData.append("fileName", fileName);
    uploadFormData.append("folder", folder);

    // Use Basic auth with private key (privateKey:) format - note the colon
    const authString = btoa(`${privateKey}:`);
    console.log("Auth header length:", authString.length);

    console.log("Sending to ImageKit...");

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
      },
      body: uploadFormData,
    });

    const responseText = await response.text();
    console.log("ImageKit response status:", response.status);

    if (!response.ok) {
      console.error("ImageKit error:", responseText);
      throw new Error(`ImageKit upload failed: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log("Upload successful:", result.url);

    return new Response(
      JSON.stringify({
        success: true,
        url: result.url,
        fileId: result.fileId,
        name: result.name,
        thumbnailUrl: result.thumbnailUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Upload error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
