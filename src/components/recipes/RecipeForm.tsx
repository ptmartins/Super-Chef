"use client";
import { useState, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { IngredientAutocomplete } from "@/components/ui/IngredientAutocomplete";
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
  const [activeTab, setActiveTab] = useState<"en" | "pt">("en");
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
      </div>

      {/* Language tabs — covers: Title, Description, Ingredients, Steps, Tags */}
      <div>
        <div className="flex rounded-xl border overflow-hidden text-sm font-medium mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("en")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 transition-colors",
              activeTab === "en"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            🇬🇧 {t("form.lang.en")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pt")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 transition-colors",
              activeTab === "pt"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            🇵🇹 {t("form.lang.pt")}
            <span className="text-xs opacity-70">({t("form.pt.optional").split("—")[0].trim()})</span>
          </button>
        </div>

        {/* EN tab */}
        {activeTab === "en" && (
          <div className="space-y-6">
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
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>{t("form.tags")} <span className="text-xs text-muted-foreground">{t("form.tagsHint")}</span></Label>
              <Controller
                control={control}
                name="tags"
                render={({ field }) => (
                  <Input
                    placeholder={t("form.tagsPlaceholder")}
                    value={field.value.join(", ")}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
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
          </div>
        )}

        {/* PT tab */}
        {activeTab === "pt" && (
          <div className="space-y-4">
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

            {/* PT Tags */}
            <div className="space-y-2">
              <Label>{t("form.pt.tags")} <span className="text-xs text-muted-foreground">{t("form.tagsHint")}</span></Label>
              <Input
                placeholder={t("form.pt.tagsPlaceholder")}
                value={ptData.tags}
                onChange={(e) => setPtData((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>

            {/* PT Ingredient names */}
            <div className="space-y-3">
              <Label>{t("form.pt.ingredientNames")}</Label>
              <div className="space-y-2">
                {ingredientFields.map((field, i) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <IngredientAutocomplete
                      value={ptData.ingredientNames[i] ?? ""}
                      onChange={(val) => {
                        const names = [...ptData.ingredientNames];
                        names[i] = val;
                        setPtData((p) => ({ ...p, ingredientNames: names }));
                      }}
                      placeholder={t("form.pt.ingredientNames")}
                      suggestions={commonIngredients.pt}
                      className="flex-1"
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
            </div>

            {/* PT Step descriptions */}
            <div className="space-y-2">
              <Label>{t("form.pt.stepDescs")}</Label>
              <div className="space-y-2">
                {stepFields.map((field, i) => (
                  <div key={field.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold mt-1">
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
          </div>
        )}
      </div>

      {/* Meta — shared */}
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

      {/* Categories — shared */}
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

      {/* Suitable for — shared */}
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
