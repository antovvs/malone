"use client";

import { useEffect, useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyFeed } from "@/hooks/use-myfeed";
import { usePeriod } from "@/hooks/use-period";
import type { Model, MyFeedList } from "@/types/myfeed";

const ALL = "all";

/**
 * Sélecteur de modèle (compte MYM). Avec plusieurs modèles, « Tous les
 * modèles » donne la vue agrégée de l'agence. Avec un seul, on affiche
 * simplement son pseudo.
 */
export function ModelSelector() {
  const { modelId, setModelId } = usePeriod();
  const { data } = useMyFeed<MyFeedList<Model>>("list_models", { limit: 500 });

  // Les modèles archivés ne produisent plus de données : inutile de les proposer.
  const models = useMemo(
    () => (data?.data ?? []).filter((model) => !model.archived),
    [data],
  );

  // Modèle mémorisé mais absent de ce compte (autre clé API) → retour à la vue agrégée.
  useEffect(() => {
    if (data && modelId !== null && !models.some((model) => model.id === modelId)) {
      setModelId(null);
    }
  }, [data, models, modelId, setModelId]);

  if (!data) return null;

  if (models.length <= 1) {
    return models[0] ? (
      <span className="shrink-0 truncate text-sm font-medium">@{models[0].username}</span>
    ) : null;
  }

  const items = [
    { value: ALL, label: "Tous les modèles" },
    ...models.map((model) => ({ value: String(model.id), label: `@${model.username}` })),
  ];

  return (
    <Select
      items={items}
      value={modelId === null ? ALL : String(modelId)}
      onValueChange={(value) => {
        if (value) setModelId(value === ALL ? null : Number(value));
      }}
    >
      <SelectTrigger aria-label="Modèle" className="min-w-0 flex-1 data-[size=default]:h-11 lg:min-w-40 lg:flex-none lg:data-[size=default]:h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="min-h-11 lg:min-h-0">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
