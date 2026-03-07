import { Settings as SettingsIcon } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DocumentHeaderSettings } from "./DocumentHeaderSettings";
import { useState } from "react";

export function SettingsDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2 text-slate-700 hover:text-blue-800 hover:bg-slate-50 rounded-md h-10 border-slate-300">
                    <SettingsIcon className="h-4 w-4" />
                    Configurações
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configurações do Sistema</DialogTitle>
                    <DialogDescription>
                        Gerencie as informações globais que aparecem nos documentos oficiais.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <DocumentHeaderSettings onSaveSuccess={() => setOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
