import { Users, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface NoClientViewProps {
  hasClients?: boolean;
  onGoToClients?: () => void;
}

export function NoClientView({ hasClients = false, onGoToClients }: NoClientViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md bg-transparent border-none shadow-none">
        <CardContent className="flex flex-col items-center text-center space-y-6 pt-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-background rounded-full border-2 border-border flex items-center justify-center">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {hasClients ? "Selecione um cliente" : "Bem-vindo ao Calendar"}
            </h2>
            <p className="text-muted-foreground max-w-sm">
              {hasClients 
                ? "Escolha um cliente no menu superior para visualizar suas demandas e calendário."
                : "Você ainda não tem clientes associados. Acesse a página de clientes para configurar seu ambiente de trabalho."}
            </p>
          </div>

          {onGoToClients && (
            <Button onClick={onGoToClients} className="gap-2">
              {hasClients ? "Selecionar Cliente" : "Acessar Clientes"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          {!hasClients && (
            <div className="text-sm text-muted-foreground/70 bg-muted/50 px-4 py-2 rounded-lg">
              Contacte um administrador se precisar de ajuda para começar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}