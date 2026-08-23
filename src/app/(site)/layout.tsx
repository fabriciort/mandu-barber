import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteTabBar } from "@/components/site-tabbar";
import { FaixaHomologacao } from "@/components/a-confirmar";
import { getCurrentUser } from "@/server/auth/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      {/* A faixa fica no fim, e nao no topo, por causa do heroi: ele sobe
          -4.25rem de proposito para a foto comecar na borda da tela, com o logo
          e o menu flutuando por cima. Qualquer coisa inserida acima do <main>
          empurra a pagina para baixo e desmancha esse encaixe. Os marcadores
          tracejados ao longo da pagina e que fazem o trabalho no meio do
          caminho; aqui vai o resumo. */}
      <FaixaHomologacao />
      <SiteFooter />
      <SiteTabBar authenticated={Boolean(user)} />
    </div>
  );
}
