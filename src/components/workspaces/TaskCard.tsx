import { type Task } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// REMOVIDO: Paperclip da lista abaixo
import { Calendar, MessageSquare, CheckSquare } from "lucide-react"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card 
      onClick={() => onClick(task)}
      className="mb-3 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary"
    >
      <CardHeader className="p-3 pb-0 space-y-0">
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className={cn("text-[10px] px-1 py-0 border-0", priorityColors[task.priority])}>
            {task.priority}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">#{task.code}</span>
        </div>
        <CardTitle className="text-sm font-medium leading-tight mt-2">
          {task.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mt-2">
          {/* Indicadores (Anexos, Checklist) */}
          <div className="flex gap-2 text-muted-foreground">
             {(task._count?.checklist || 0) > 0 && (
                <div className="flex items-center text-xs">
                    <CheckSquare className="w-3 h-3 mr-1" /> {task._count?.checklist}
                </div>
             )}
             {(task._count?.notes || 0) > 0 && (
                <div className="flex items-center text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" /> {task._count?.notes}
                </div>
             )}
          </div>

          {/* Avatares dos responsáveis */}
          <div className="flex -space-x-2">
            {task.assignees.map((assignee) => (
              <Avatar key={assignee.userId} className="w-6 h-6 border-2 border-white">
                <AvatarImage src={assignee.user.avatar || undefined} />
                <AvatarFallback className="text-[10px]">{assignee.user.firstName?.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
        
        {task.dueDate && (
            <div className="flex items-center text-xs text-muted-foreground mt-2 pt-2 border-t">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(task.dueDate).toLocaleDateString()}
            </div>
        )}
      </CardContent>
    </Card>
  );
}