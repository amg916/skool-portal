import { Button } from "@/components/ui/button";
import { useListAppCategories } from "@workspace/api-client-react";

export function CategoryRail({
  active,
  onSelect,
}: {
  active?: string;
  onSelect: (slug?: string) => void;
}) {
  // Categories always come from the API — never hardcode the list. Adding one
  // must be an INSERT, not a deploy.
  const { data: categories } = useListAppCategories();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <Button
        variant={!active ? "default" : "outline"}
        size="sm"
        className="shrink-0"
        onClick={() => onSelect(undefined)}
      >
        All
      </Button>
      {categories?.map((c) => (
        <Button
          key={c.slug}
          variant={active === c.slug ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => onSelect(c.slug)}
        >
          {c.name}
        </Button>
      ))}
    </div>
  );
}
