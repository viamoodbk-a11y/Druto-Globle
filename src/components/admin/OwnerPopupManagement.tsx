import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Image as ImageIcon, Sparkles, Clock, Link as LinkIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CONFIG_TITLE = "OWNER_SUBSCRIPTION_POPUP";

interface PopupConfig {
    id?: string;
    image_url: string;
    cta_link: string;
    delay_seconds: number;
    is_active: boolean;
}

export const OwnerPopupManagement = () => {
    const [config, setConfig] = useState<PopupConfig>({
        image_url: "",
        cta_link: "/pricing",
        delay_seconds: 3,
        is_active: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { uploadImage, isUploading } = useImageUpload();

    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("hero_banners")
                .select("*")
                .eq("title", CONFIG_TITLE)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setConfig({
                    id: data.id,
                    image_url: data.image_url,
                    cta_link: data.link_url || "/pricing",
                    delay_seconds: parseInt(data.subtitle || "3"),
                    is_active: data.is_active,
                });
                setPreviewUrl(data.image_url);
            }
        } catch (error: any) {
            console.error("Error fetching popup config:", error);
            toast.error("Failed to load popup configuration");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let finalImageUrl = config.image_url;

            if (selectedFile) {
                const result = await uploadImage(selectedFile, "popups", true);
                if (!result.success || !result.url) {
                    throw new Error(result.error || "Image upload failed");
                }
                finalImageUrl = result.url;
            }

            if (!finalImageUrl) {
                throw new Error("Please upload a banner image");
            }

            const authData = localStorage.getItem("druto_auth");
            const userId = authData ? JSON.parse(authData).userId : "";

            const payload = {
                title: CONFIG_TITLE,
                image_url: finalImageUrl,
                link_url: config.cta_link,
                subtitle: config.delay_seconds.toString(),
                is_active: config.is_active,
                created_by: userId,
                sort_order: 999, // Reserved for popups
            };

            let error;
            if (config.id) {
                const { error: updateError } = await supabase
                    .from("hero_banners")
                    .update(payload)
                    .eq("id", config.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("hero_banners")
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast.success("Popup configuration saved!");
            setSelectedFile(null);
            fetchConfig();
        } catch (error: any) {
            toast.error(error.message || "Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-soft overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Owner Subscription Popup</CardTitle>
                                <CardDescription>Configure the conversion popup shown to business owners</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                            <span className="text-xs font-medium text-muted-foreground">Active Status</span>
                            <Switch 
                                checked={config.is_active} 
                                onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })} 
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Configuration Form */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" /> Banner Image
                                </Label>
                                <div className="mt-1">
                                    {previewUrl ? (
                                        <div className="relative group">
                                            <img src={previewUrl} alt="Preview" className="w-full h-40 rounded-2xl object-cover border border-border/50" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-sm">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="rounded-full"
                                                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                                >
                                                    Change Image
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-40 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer">
                                            <div className="text-center">
                                                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                                <span className="text-sm font-medium text-muted-foreground">Click to upload banner</span>
                                                <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wider">Suggested: 800x600px</p>
                                            </div>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" /> Delay (Seconds)
                                    </Label>
                                    <Input 
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={config.delay_seconds}
                                        onChange={(e) => setConfig({ ...config, delay_seconds: parseInt(e.target.value) || 1 })}
                                        className="h-11 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <LinkIcon className="h-4 w-4 text-muted-foreground" /> CTA Link
                                    </Label>
                                    <Input 
                                        value={config.cta_link}
                                        onChange={(e) => setConfig({ ...config, cta_link: e.target.value })}
                                        placeholder="/pricing"
                                        className="h-11 rounded-xl"
                                    />
                                </div>
                            </div>

                            <Button 
                                onClick={handleSave} 
                                disabled={isSaving || isUploading || (!selectedFile && !config.image_url)}
                                className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                            >
                                {isSaving || isUploading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Saving Config...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5 mr-2" />
                                        Save Configuration
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Preview / Instructions */}
                        <div className="bg-muted/20 rounded-2xl border border-border/50 p-6 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="h-8 w-8 text-blue-600" />
                            </div>
                            <h4 className="font-bold text-foreground mb-2">Popup Preview</h4>
                            <p className="text-sm text-muted-foreground max-w-[250px] mb-6">
                                This popup will be shown to owners who are either on trial or inactive, after they have been on the dashboard for {config.delay_seconds} seconds.
                            </p>
                            
                            {/* Simple Mobile-scale mockup */}
                            <div className="w-[180px] aspect-[9/16] bg-slate-900 rounded-[28px] border-[6px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
                                <div className="h-1.5 w-12 bg-slate-800 rounded-full mx-auto mt-2" />
                                <div className="flex-1 p-2 mt-4">
                                    <div className="bg-white/10 h-4 w-12 rounded mb-2" />
                                    <div className="grid grid-cols-2 gap-1 mb-4">
                                        <div className="bg-white/10 h-10 rounded" />
                                        <div className="bg-white/10 h-10 rounded" />
                                    </div>
                                    
                                    {/* The Popup Mockup */}
                                    {config.is_active && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-3 animate-in fade-in zoom-in duration-500 delay-500 fill-mode-both">
                                            <div className="bg-white rounded-xl w-full p-2 text-center shadow-lg">
                                                {previewUrl ? (
                                                    <img src={previewUrl} className="w-full h-16 object-cover rounded-lg mb-2" />
                                                ) : (
                                                    <div className="w-full h-16 bg-muted rounded-lg mb-2 flex items-center justify-center">
                                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="h-1.5 w-16 bg-muted rounded mx-auto mb-1" />
                                                <div className="h-1 w-12 bg-muted/60 rounded mx-auto mb-3" />
                                                <div className="h-5 w-full bg-primary rounded-full" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
