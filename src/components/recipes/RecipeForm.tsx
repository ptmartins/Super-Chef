"use client";
import { useState, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Upload, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { recipeSchema, type RecipeFormData } from "@/lib/validations/recipe.schema";
import { CATEGORIES, UNITS, type IRecipe } from "@/types";
import { getCategoryColor, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface RecipeFormProps {
  recipe?: IRecipe;
}

export function RecipeForm({ recipe }: RecipeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(recipe?.thumbnail.url ?? null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ptOpen, setPtOpen] = useState(!!(recipe?.translations?.pt));
  const [ptData, setPtData] = useState({
    title: recipe?.translations?.pt?.title ?? "",
    description: recipe?.translations?.pt?.description ?? "",
    ingredientNames: recipe?.translations?.pt?.ingredients?.map((i) => i.name) ?? [] as string[],
    stepDescriptions: recipe?.translations?.pt?.steps?.map((s) => s.description) ?? [] as string[],
    tags: recipe?.translations?.pt?.tags?.join(", ") ?? "",
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
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
    // Get a signed upload params from our API (keeps API secret server-side)
    const sigRes = await fetch("/api/cloudinary-signature");
    if (!sigRes.ok) throw new Error("Failed to get upload signature");
    const { signature, timestamp, folder, cloudName, apiKey } = await sigRes.json();

    // Upload directly to Cloudinary — bypasses Vercel's 4.5MB body limit
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

      const hasAnyPt = ptData.title || ptData.description || ptData.tags ||
        ptData.ingredientNames.some(Boolean) || ptData.stepDescriptions.some(Boolean);

      const translations = hasAnyPt ? {
        pt: {
          ...(ptData.title && { title: ptData.title }),
          ...(ptData.description && { description: ptData.description }),
          ...(ptData.ingredientNames.some(Boolean) && {
            ingredients: data.ingredients.map((_, i) => ({ name: ptData.ingredientNames[i] ?? "" })),
          }),
          ...(ptData.stepDescriptions.some(Boolean) && {
            steps: data.steps.map((_, i) => ({ description: ptData.stepDescriptions[i] ?? "" })),
          }),
          ...(ptData.tags && { tags: ptData.tags.split(",").map((s) => s.trim()).filter(Boolean) }),
        },
      } : undefined;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, thumbnailUrl, thumbnailPublicId, translations }),
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Thumbnail */}
      <div className="space-y-2">
        <Label>Recipe Photo *</Label>
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
              <p className="text-sm font-medium">Click to upload photo</p>
              <p className="text-xs">JPG, PNG, WebP up to 5MB</p>
            </div>
          )}
          {thumbnailPreview && (
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">Change photo</span>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>

      {/* Title & Description */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" placeholder="e.g. Creamy Mushroom Risotto" {...register("title")} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the recipe..."
            rows={3}
            {...register("description")}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>
      </div>

      {/* Meta */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="estimatedTime">Time (minutes) *</Label>
          <Input
            id="estimatedTime"
            type="number"
            min={1}
            {...register("estimatedTime", { valueAsNumber: true })}
          />
          {errors.estimatedTime && <p className="text-xs text-destructive">{errors.estimatedTime.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Difficulty *</Label>
          <Controller
            control={control}
            name="difficulty"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="servings">Servings *</Label>
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
        <Label>Categories * <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
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
                    {cat}
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
        <Label>Suitable for * <span className="text-xs text-muted-foreground">(used for menu planning)</span></Label>
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
                  <span className="text-sm capitalize">{meal}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors.suitableFor && <p className="text-xs text-destructive">{errors.suitableFor.message}</p>}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <Input
              placeholder="e.g. quick, healthy, gluten-free"
              value={field.value.join(", ")}
              onChange={(e) =>
                field.onChange(
                  e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                )
              }
            />
          )}
        />
      </div>

      {/* Ingredients */}
      <div className="space-y-3">
        <Label>Ingredients *</Label>
        <div className="space-y-2">
          {ingredientFields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Ingredient name"
                className="flex-1"
                {...register(`ingredients.${i}.name`)}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Amount"
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
          Add Ingredient
        </Button>
        {errors.ingredients && (
          <p className="text-xs text-destructive">{errors.ingredients.message ?? errors.ingredients.root?.message}</p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <Label>Preparation Steps *</Label>
        <div className="space-y-3">
          {stepFields.map((field, i) => (
            <div key={field.id} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold mt-1">
                {i + 1}
              </div>
              <Textarea
                placeholder={`Step ${i + 1}...`}
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
          Add Step
        </Button>
      </div>

      {/* Portuguese Translation */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/30">
        <button
          type="button"
          onClick={() => setPtOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            🇵🇹 {t("form.pt.section")}
            <span className="text-xs font-normal text-muted-foreground">— {t("form.pt.optional")}</span>
          </span>
          {ptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {ptOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-dashed border-border pt-4">
            {/* PT Title */}
            <div className="space-y-2">
              <Label>{t("form.pt.title")}</Label>
              <Input
                placeholder={t("form.pt.titlePlaceholder")}
                value={ptData.title}
                onChange={(e) => setPtData((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            {/* PT Description */}
            <div className="space-y-2">
              <Label>{t("form.pt.description")}</Label>
              <Textarea
                placeholder={t("form.pt.descriptionPlaceholder")}
                rows={3}
                value={ptData.description}
                onChange={(e) => setPtData((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* PT Ingredient names */}
            {ingredientFields.length > 0 && (
              <div className="space-y-2">
                <Label>{t("form.pt.ingredientNames")}</Label>
                <div className="space-y-2">
                  {ingredientFields.map((field, i) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-28 truncate shrink-0">
                        {watch(`ingredients.${i}.name`) || `#${i + 1}`}
                      </span>
                      <Input
                        placeholder={`${t("form.pt.title").replace(" (PT)", "")} (PT)`}
                        value={ptData.ingredientNames[i] ?? ""}
                        onChange={(e) => {
                          const names = [...ptData.ingredientNames];
                          names[i] = e.target.value;
                          setPtData((p) => ({ ...p, ingredientNames: names }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PT Step descriptions */}
            {stepFields.length > 0 && (
              <div className="space-y-2">
                <Label>{t("form.pt.stepDescs")}</Label>
                <div className="space-y-2">
                  {stepFields.map((field, i) => (
                    <div key={field.id} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold mt-1">
                        {i + 1}
                      </div>
                      <Textarea
                        placeholder={`${t("recipe.preparation")} ${i + 1} (PT)`}
                        rows={2}
                        className="flex-1"
                        value={ptData.stepDescriptions[i] ?? ""}
                        onChange={(e) => {
                          const descs = [...ptData.stepDescriptions];
                          descs[i] = e.target.value;
                          setPtData((p) => ({ ...p, stepDescriptions: descs }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PT Tags */}
            <div className="space-y-2">
              <Label>{t("form.pt.tags")} <span className="text-xs text-muted-foreground">{t("form.tagsHint")}</span></Label>
              <Input
                placeholder={t("form.pt.tagsPlaceholder")}
                value={ptData.tags}
                onChange={(e) => setPtData((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>
          </div>
        )}
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
