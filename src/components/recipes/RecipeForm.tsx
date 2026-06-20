"use client";
import { useState, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Upload, Loader2, Info, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IngredientAutocomplete } from "@/components/ui/IngredientAutocomplete";
import { TagInput } from "@/components/ui/TagInput";
import { recipeSchema, type RecipeFormData } from "@/lib/validations/recipe.schema";
import { CATEGORIES, UNITS, type IRecipe } from "@/types";
import { getCategoryColor, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { commonIngredients } from "@/lib/commonIngredients";
import type { Locale } from "@/lib/i18n";

interface RecipeFormProps {
  recipe?: IRecipe;
  authorName?: string;
}

export function RecipeForm({ recipe, authorName = "" }: RecipeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(recipe?.thumbnail.url ?? null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importedThumbnailUrl, setImportedThumbnailUrl] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: recipe
      ? {
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          estimatedTime: recipe.estimatedTime,
          difficulty: recipe.difficulty,
          categories: recipe.categories,
          servings: recipe.servings,
          tags: recipe.tags,
          suitableFor: recipe.suitableFor,
          source: recipe.source ?? authorName,
        }
      : {
          ingredients: [{ name: "", amount: 1, unit: "g" }],
          steps: [{ order: 1, description: "" }],
          estimatedTime: 30,
          difficulty: "easy",
          categories: [],
          servings: 4,
          tags: [],
          suitableFor: ["lunch", "dinner"],
          source: authorName,
        },
  });

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control,
    name: "ingredients",
  });

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: "steps",
  });

  const watchedCategories = watch("categories");
  const watchedSuitableFor = watch("suitableFor");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const uploadToCloudinary = async (file: File): Promise<{ url: string; publicId: string }> => {
    const sigRes = await fetch("/api/cloudinary-signature");
    if (!sigRes.ok) throw new Error("Failed to get upload signature");
    const { signature, timestamp, folder, cloudName, apiKey } = await sigRes.json();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("signature", signature);
    formData.append("timestamp", timestamp);
    formData.append("folder", folder);
    formData.append("api_key", apiKey);
    formData.append("transformation", "c_fill,w_1200,h_800,g_auto/f_auto,q_auto");

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );
    if (!uploadRes.ok) throw new Error("Image upload failed");
    const uploaded = await uploadRes.json();
    return { url: uploaded.secure_url, publicId: uploaded.public_id };
  };

  const onSubmit = async (data: RecipeFormData) => {
    if (!recipe && !thumbnailFile) {
      toast({ title: t("form.photoRequired"), description: t("form.photoRequiredDesc"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let thumbnailUrl = recipe?.thumbnail.url;
      let thumbnailPublicId = recipe?.thumbnail.publicId;

      if (thumbnailFile) {
        const uploaded = await uploadToCloudinary(thumbnailFile);
        thumbnailUrl = uploaded.url;
        thumbnailPublicId = uploaded.publicId;
      }

      const url = recipe ? `/api/recipes/${recipe._id}` : "/api/recipes";
      const method = recipe ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, thumbnailUrl, thumbnailPublicId }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error ?? "Failed to save recipe");
      }

      toast({ title: recipe ? t("form.recipeUpdated") : t("form.recipeCreated") });
      router.push(`/recipes/${result.recipe._id}`);
      router.refresh();
    } catch (err) {
      toast({
        title: t("form.error"),
        description: err instanceof Error ? err.message : t("form.somethingWrong"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async () => {
    const currentTitle = watch("title");
    if (currentTitle && !window.confirm(t("import.confirmOverwrite"))) return;

    setImportLoading(true);
    setImportError(null);
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("import.failed"));

      const { data } = json;
      reset({
        title: data.title ?? "",
        description: data.description ?? "",
        ingredients: data.ingredients?.length ? data.ingredients : [{ name: "", amount: 1, unit: "g" }],
        steps: data.steps?.length ? data.steps : [{ order: 1, description: "" }],
        estimatedTime: data.estimatedTime ?? 30,
        difficulty: data.difficulty ?? "medium",
        categories: data.categories ?? [],
        servings: data.servings ?? 4,
        tags: data.tags ?? [],
        suitableFor: data.suitableFor?.length ? data.suitableFor : ["lunch", "dinner"],
        source: data.source ?? "",
      });
      if (data.thumbnailUrl) setImportedThumbnailUrl(data.thumbnailUrl);
      setImportOpen(false);
      setImportUrl("");
      toast({ title: t("import.success") });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t("import.failed"));
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Import from URL dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("import.title")}</DialogTitle>
            <DialogDescription>{t("import.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="import-url">{t("import.urlLabel")}</Label>
              <Input
                id="import-url"
                type="url"
                placeholder={t("import.urlPlaceholder")}
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleImport(); } }}
                disabled={importLoading}
              />
            </div>
            {importError && <p className="text-sm text-destructive">{importError}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setImportOpen(false); setImportError(null); }} disabled={importLoading}>
                {t("import.cancel")}
              </Button>
              <Button type="button" onClick={handleImport} disabled={importLoading || !importUrl.trim()}>
                {importLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("import.importing")}</>
                ) : t("import.submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import button */}
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => { setImportError(null); setImportOpen(true); }}>
          <Link className="h-4 w-4 mr-2" />
          {t("import.button")}
        </Button>
      </div>

      {/* Thumbnail */}
      <div className="space-y-2">
        <Label>{t("form.recipePhoto")}</Label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative aspect-[16/7] rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden bg-muted/50 hover:bg-muted transition-colors",
            thumbnailPreview ? "border-transparent" : "border-border hover:border-primary/40"
          )}
        >
          {thumbnailPreview ? (
            <Image src={thumbnailPreview} alt="Preview" fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Upload className="h-8 w-8" />
              <p className="text-sm font-medium">{t("form.uploadPhoto")}</p>
              <p className="text-xs">{t("form.uploadFormats")}</p>
            </div>
          )}
          {thumbnailPreview && (
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">{t("form.changePhoto")}</span>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        {importedThumbnailUrl && !thumbnailFile && (
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-3 bg-muted/40">
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={importedThumbnailUrl} alt="Suggested thumbnail" className="h-full w-full object-cover" />
            </div>
            <p className="text-xs text-muted-foreground pt-1">{t("import.thumbnailNote")}</p>
          </div>
        )}
      </div>

      {/* Title & Description */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="title">{t("form.title")}</Label>
          <Input id="title" placeholder={t("form.titlePlaceholder")} {...register("title")} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="description">{t("form.description")}</Label>
          <Textarea
            id="description"
            placeholder={t("form.descriptionPlaceholder")}
            rows={3}
            {...register("description")}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>
      </div>

      {/* Source */}
      <div className="space-y-2">
        <Label htmlFor="source">
          {t("form.source")}
          <span className="text-xs text-muted-foreground ml-1.5">{t("form.sourceHint")}</span>
        </Label>
        <Input
          id="source"
          placeholder={t("form.sourcePlaceholder")}
          {...register("source")}
        />
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
          {t("form.sourceNotice")}
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>{t("form.tags")} <span className="text-xs text-muted-foreground">{t("form.tagsHint")}</span></Label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagInput
              value={field.value}
              onChange={field.onChange}
              placeholder={t("form.tagsPlaceholder")}
            />
          )}
        />
      </div>

      {/* Ingredients */}
      <div className="space-y-3">
        <Label>{t("form.ingredients")}</Label>
        <div className="space-y-2">
          {ingredientFields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Controller
                control={control}
                name={`ingredients.${i}.name`}
                render={({ field: nameField }) => (
                  <IngredientAutocomplete
                    value={nameField.value}
                    onChange={nameField.onChange}
                    placeholder={t("form.ingredientNamePlaceholder")}
                    suggestions={commonIngredients[locale as Locale] ?? commonIngredients.en}
                    className="flex-1"
                  />
                )}
              />
              <Input
                type="number"
                step="0.01"
                placeholder={t("form.amountPlaceholder")}
                className="w-24"
                {...register(`ingredients.${i}.amount`, { valueAsNumber: true })}
              />
              <Controller
                control={control}
                name={`ingredients.${i}.unit`}
                render={({ field: unitField }) => (
                  <Select value={unitField.value} onValueChange={unitField.onChange}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(i)}
                disabled={ingredientFields.length <= 1}
                className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendIngredient({ name: "", amount: 1, unit: "g" })}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("form.addIngredient")}
        </Button>
        {errors.ingredients && (
          <p className="text-xs text-destructive">{errors.ingredients.message ?? errors.ingredients.root?.message}</p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <Label>{t("form.steps")}</Label>
        <div className="space-y-3">
          {stepFields.map((field, i) => (
            <div key={field.id} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold mt-1">
                {i + 1}
              </div>
              <Textarea
                placeholder={`${t("recipe.preparation")} ${i + 1}...`}
                rows={2}
                className="flex-1"
                {...register(`steps.${i}.description`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeStep(i)}
                disabled={stepFields.length <= 1}
                className="shrink-0 mt-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendStep({ order: stepFields.length + 1, description: "" })}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("form.addStep")}
        </Button>
      </div>

      {/* Meta */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="estimatedTime">{t("form.time")}</Label>
          <Input
            id="estimatedTime"
            type="number"
            min={1}
            {...register("estimatedTime", { valueAsNumber: true })}
          />
          {errors.estimatedTime && <p className="text-xs text-destructive">{errors.estimatedTime.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t("form.difficulty")}</Label>
          <Controller
            control={control}
            name="difficulty"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.difficultyPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t("difficulty.easy")}</SelectItem>
                  <SelectItem value="medium">{t("difficulty.medium")}</SelectItem>
                  <SelectItem value="hard">{t("difficulty.hard")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="servings">{t("form.servings")}</Label>
          <Input
            id="servings"
            type="number"
            min={1}
            {...register("servings", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <Label>{t("form.categories")} <span className="text-xs text-muted-foreground">{t("form.categoriesHint")}</span></Label>
        <Controller
          control={control}
          name="categories"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const selected = field.value.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      field.onChange(
                        selected ? field.value.filter((c) => c !== cat) : [...field.value, cat]
                      );
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      selected
                        ? cn(getCategoryColor(cat), "border-current ring-1 ring-current/20")
                        : "border-border hover:border-primary/30 bg-background hover:bg-muted"
                    )}
                  >
                    {t(`category.${cat}`)}
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.categories && <p className="text-xs text-destructive">{errors.categories.message}</p>}
      </div>

      {/* Suitable for */}
      <div className="space-y-2">
        <Label>{t("form.suitableFor")} <span className="text-xs text-muted-foreground">{t("form.suitableForHint")}</span></Label>
        <Controller
          control={control}
          name="suitableFor"
          render={({ field }) => (
            <div className="flex gap-4">
              {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                <label key={meal} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={field.value.includes(meal)}
                    onCheckedChange={(checked) => {
                      field.onChange(
                        checked ? [...field.value, meal] : field.value.filter((m) => m !== meal)
                      );
                    }}
                  />
                  <span className="text-sm">{t(`meal.${meal}`)}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors.suitableFor && <p className="text-xs text-destructive">{errors.suitableFor.message}</p>}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t("form.cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {thumbnailFile ? t("form.uploading") : recipe ? t("form.updating") : t("form.creating")}
            </>
          ) : (
            recipe ? t("form.updateRecipe") : t("form.createRecipe")
          )}
        </Button>
      </div>

      <div className="hidden">{watchedCategories.length}{watchedSuitableFor.length}</div>
    </form>
  );
}
