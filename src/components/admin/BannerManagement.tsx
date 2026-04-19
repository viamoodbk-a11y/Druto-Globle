import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export const BannerManagement = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { uploadImage, isUploading } = useImageUpload();
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchBanners = useCallback(async () => {
    const { data } = await supabase
      .from("hero_banners")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setBanners(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAdd = async () => {
    if (!selectedFile) {
      toast.error("Please select an image");
      return;
    }
    if (banners.length >= 3) {
      toast.error("Maximum 3 banners allowed. Delete one first.");
      return;
    }

    const result = await uploadImage(selectedFile, "banners", true);
    if (!result.success || !result.url) {
      toast.error(result.error || "Upload failed");
      return;
    }

    const authData = localStorage.getItem("druto_auth");
    const userId = authData ? JSON.parse(authData).userId : "";

    const { error } = await supabase.from("hero_banners").insert({
      image_url: result.url,
      title: title || null,
      subtitle: subtitle || null,
      link_url: linkUrl || null,
      sort_order: banners.length,
      created_by: userId,
    });

    if (error) {
      toast.error("Failed to save banner");
      console.error(error);
      return;
    }

    toast.success("Banner added!");
    setTitle("");
    setSubtitle("");
    setLinkUrl("");
    setSelectedFile(null);
    setPreviewUrl(null);
    fetchBanners();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("hero_banners").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete banner");
    } else {
      toast.success("Banner deleted");
      setBanners((prev) => prev.filter((b) => b.id !== id));
    }
    setDeleting(null);
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-5 w-5 text-primary" />
          Hero Banners ({banners.length}/3)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Banners */}
        {banners.map((banner) => (
          <div key={banner.id} className="flex items-center gap-3 rounded-xl border p-2">
            <img
              src={banner.image_url}
              alt={banner.title || "Banner"}
              className="h-16 w-24 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {banner.title || "No title"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {banner.subtitle || "No subtitle"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive shrink-0"
              onClick={() => handleDelete(banner.id)}
              disabled={deleting === banner.id}
            >
              {deleting === banner.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}

        {/* Add New Banner */}
        {banners.length < 3 && (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <p className="text-sm font-medium text-foreground">Add New Banner</p>

            {/* Image Upload */}
            <div>
              <Label className="text-xs text-muted-foreground">Banner Image *</Label>
              {previewUrl ? (
                <div className="relative mt-1">
                  <img src={previewUrl} alt="Preview" className="w-full h-32 rounded-xl object-cover" />
                  <button
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-muted hover:border-primary/50 transition-colors">
                  <div className="text-center">
                    <Plus className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload image</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Tag/Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. SPECIAL OFFER"
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Subtitle</Label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. 2x stamps today"
                  className="mt-1 h-9 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Link URL (optional)</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 h-9 text-sm"
              />
            </div>

            <Button
              onClick={handleAdd}
              disabled={isUploading || !selectedFile}
              className="w-full"
              size="sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Banner
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
