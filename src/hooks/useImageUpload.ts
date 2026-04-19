import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState } from "react";
import { compressImage, blobToFile } from "@/lib/imageUtils";

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (
    file: File,
    folder: string = "uploads",
    compress: boolean = true
  ): Promise<UploadResult> => {
    setIsUploading(true);
    
    try {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return { success: false, error: "Please upload an image file" };
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: "Image must be less than 5MB" };
      }

      let fileToUpload = file;

      // Compress image if enabled
      if (compress) {
        try {
          const compressedBlob = await compressImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.85,
            outputFormat: 'webp',
          });
          fileToUpload = blobToFile(compressedBlob, file.name.replace(/\.[^/.]+$/, '.webp'));
        } catch (error) {
          console.warn('Compression failed, using original file:', error);
        }
      }

      // Generate unique filename
      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Create form data for edge function
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("folder", folder);
      formData.append("fileName", fileName);

      // Upload via ImageKit edge function using direct fetch
      // Get the user's session token for proper auth
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || ANON_KEY;

      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/imagekit-upload`,
        {
          method: "POST",
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      // Safely parse response - handle non-JSON gateway errors
      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Non-JSON response from upload:", responseText);
        return { success: false, error: `Upload failed (${response.status}): ${responseText.substring(0, 100)}` };
      }

      if (!response.ok) {
        console.error("Upload error:", data);
        return { success: false, error: data.error || "Upload failed" };
      }

      if (!data.success) {
        return { success: false, error: data.error || "Upload failed" };
      }

      return { success: true, url: data.url };
    } catch (error: any) {
      console.error("Upload error:", error);
      return { success: false, error: error.message || "Upload failed" };
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading };
};