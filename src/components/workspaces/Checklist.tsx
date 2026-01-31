import { useState } from "react";
import { type ChecklistItem } from "@/types/task";
import { useChecklistOperations } from "@/hooks/useTasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistProps {
  taskId: string;
  items: ChecklistItem[];
}

export function Checklist({ taskId, items }: ChecklistProps) {
  const { add, toggle } = useChecklistOperations(taskId);
  const [newItem, setNewItem] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    add.mutate(newItem);
    setNewItem("");
  };

  const completedCount = items.filter(i => i.isDone).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Barra de Progresso */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-500" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
            <Checkbox 
              id={item.id} 
              checked={item.isDone}
              onCheckedChange={(checked: boolean) => 
                toggle.mutate({ itemId: item.id, isDone: !!checked })
              }
            />
            <label
              htmlFor={item.id}
              className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1",
                item.isDone && "line-through text-muted-foreground"
              )}
            >
              {item.title}
            </label>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input 
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Adicionar item ao checklist..."
          className="h-9"
        />
        <Button size="sm" type="submit" variant="secondary" disabled={add.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}