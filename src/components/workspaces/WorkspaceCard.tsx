// src/components/workspaces/WorkspaceCard.tsx
import { type Workspace } from "@/types/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Layout, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WorkspaceCardProps {
  workspace: Workspace;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/workspaces/${workspace.id}`)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-primary truncate">
          {workspace.name}
        </CardTitle>
        <Layout className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
          {workspace.description || "Sem descrição definida."}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{workspace._count?.members || 1} membros</span>
          </div>
          <Badge variant="secondary">
            {workspace._count?.tasks || 0} tarefas
          </Badge>
        </div>
        
        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <Button variant="ghost" className="w-full text-xs h-8">
             Acessar <ArrowRight className="ml-2 h-3 w-3" />
           </Button>
        </div>
      </CardContent>
    </Card>
  );
}