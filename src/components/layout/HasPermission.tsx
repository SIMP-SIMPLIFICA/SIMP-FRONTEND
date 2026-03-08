import React from "react";
import { useMe } from "@/hooks/useMe";
import { hasAnyPermission } from "@/lib/permissions";

interface HasPermissionProps {
    anyOf: string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Componente para ocultar elementos do DOM se o usuário não tiver permissão.
 * Diferente de apenas 'disabled', este componente NÃO renderiza o conteúdo.
 */
export function HasPermission({ anyOf, children, fallback = null }: HasPermissionProps) {
    const { data: user, isLoading } = useMe(true);

    if (isLoading || !user) return null;

    const hasPermission = hasAnyPermission(user, anyOf);

    if (!hasPermission) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
