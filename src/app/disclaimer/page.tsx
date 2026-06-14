import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ShieldCheck, BookOpen, Heart, ExternalLink, Users } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Super Chef is a free, non-commercial meal planning tool. Learn about our attribution policy and how we respect recipe creators.",
};

const content = {
  en: {
    hero: {
      badge: "Non-commercial · Open · Transparent",
      title: "About Super Chef",
      subtitle:
        "A personal meal planning companion — not a recipe publisher. Here's what that means and why it matters.",
    },
    sections: [
      {
        icon: "purpose",
        title: "What Super Chef Is For",
        body: [
          "Super Chef is a free, personal-use platform designed to help home cooks better organise their weekly meal planning. Think of it as a digital recipe notebook that also helps you build menus and generate shopping lists automatically.",
          "The goal is simple: centralise the recipes you already love — from cookbooks, food websites, family handwritten cards, cooking shows, or any other source — in a single, searchable place. Then use that collection to generate balanced weekly, bi-weekly, or monthly meal plans and prepare your grocery list without the usual chaos.",
          "There is no algorithm trying to sell you anything. No influencer recipes. No sponsored content. Just your recipes, organised your way.",
        ],
      },
      {
        icon: "ownership",
        title: "We Don't Own Your Recipes",
        body: [
          "Super Chef makes no claim of ownership over any recipe added by its users. Every recipe belongs to its original creator — the chef, the author, the grandmother, the food blogger, the magazine, the restaurant. This platform is purely a personal organisational layer on top of content that already exists in the world.",
          "We are not a recipe publisher. We do not reproduce content commercially. We are the equivalent of a recipe binder on your kitchen shelf — the content inside belongs to whoever created it.",
        ],
      },
      {
        icon: "attribution",
        title: "Attribution Is Non-Negotiable",
        body: [
          "Every recipe on Super Chef has a Source / Reference field. Filling it in isn't optional — it's the right thing to do. Crediting where a recipe comes from honours the work of the person or team who created it and keeps this community honest and respectful.",
          "Good attribution looks like:",
        ],
        examples: [
          "Jamie Oliver's 5 Ingredients — p. 84",
          "BBC Good Food · bbcgoodfood.com",
          "Yotam Ottolenghi's Plenty — Adapted",
          "Grandma Maria's handwritten card",
          "The Hairy Bikers' Brilliant Bakes",
          "Personal recipe — original creation",
        ],
        bodyAfter: [
          "If the source defaults to your name, it means the recipe is your own original creation or a family recipe passed down to you. That's equally valid — just be honest about it.",
        ],
      },
      {
        icon: "nonprofit",
        title: "Non-Profit, No Strings Attached",
        body: [
          "Super Chef is a personal project built and maintained with no commercial intent whatsoever. There are no advertisements, no subscription fees, no data sales, no premium tiers, and no monetisation of any kind. It exists because meal planning is genuinely hard and a little organisation goes a long way.",
          "The platform is provided as-is, free to use, and free to enjoy.",
        ],
      },
      {
        icon: "copyright",
        title: "Respect for Copyright",
        body: [
          "We take intellectual property seriously. Recipe creators, food authors, and publishers invest enormous effort in their work, and that deserves respect. This platform is designed to complement that work by helping users organise their personal collections — not to replace or reproduce it commercially.",
          "If you believe any content on this platform infringes your rights or violates the spirit of this disclaimer, please reach out. We will address it promptly and without hesitation.",
        ],
      },
    ],
    closing:
      "Super Chef is built with care for people who love food and want to spend less time planning and more time cooking. Thanks for being part of it.",
  },
  pt: {
    hero: {
      badge: "Sem fins lucrativos · Aberto · Transparente",
      title: "Sobre o Super Chef",
      subtitle:
        "Um assistente pessoal de planeamento de refeições — não um publicador de receitas. Eis o que isso significa e por que razão é importante.",
    },
    sections: [
      {
        icon: "purpose",
        title: "Para que serve o Super Chef",
        body: [
          "O Super Chef é uma plataforma gratuita, de uso pessoal, concebida para ajudar os cozinheiros domésticos a organizar melhor o planeamento semanal das suas refeições. Pensa nele como um caderno de receitas digital que também ajuda a construir menus e a gerar listas de compras automaticamente.",
          "O objetivo é simples: centralizar as receitas que já adoras — de livros de cozinha, sites de gastronomia, cartões escritos à mão pela família, programas de culinária ou qualquer outra fonte — num único lugar, pesquisável e organizado. Depois, usa essa coleção para gerar planos de refeições semanais, quinzenais ou mensais equilibrados e preparar a lista de compras sem o caos habitual.",
          "Não há nenhum algoritmo a tentar vender-te nada. Sem receitas de influenciadores. Sem conteúdo patrocinado. Apenas as tuas receitas, organizadas à tua maneira.",
        ],
      },
      {
        icon: "ownership",
        title: "Não somos donos das tuas receitas",
        body: [
          "O Super Chef não reivindica a propriedade de nenhuma receita adicionada pelos seus utilizadores. Cada receita pertence ao seu criador original — o chef, o autor, a avó, o blogger gastronómico, a revista, o restaurante. Esta plataforma é puramente uma camada organizacional pessoal sobre conteúdo que já existe no mundo.",
          "Não somos um publicador de receitas. Não reproduzimos conteúdo comercialmente. Somos o equivalente a um dossier de receitas na prateleira da tua cozinha — o conteúdo lá dentro pertence a quem o criou.",
        ],
      },
      {
        icon: "attribution",
        title: "A atribuição não é opcional",
        body: [
          "Cada receita no Super Chef tem um campo Fonte / Referência. Preenchê-lo não é opcional — é a coisa certa a fazer. Dar crédito à origem de uma receita honra o trabalho da pessoa ou equipa que a criou e mantém esta comunidade honesta e respeitosa.",
          "Uma boa atribuição tem este aspeto:",
        ],
        examples: [
          "5 Ingredientes de Jamie Oliver — p. 84",
          "BBC Good Food · bbcgoodfood.com",
          "Plenty de Yotam Ottolenghi — Adaptado",
          "Cartão manuscrito da Avó Maria",
          "Livro de receitas do Chakall",
          "Receita pessoal — criação original",
        ],
        bodyAfter: [
          "Se a fonte aparecer com o teu nome por defeito, significa que a receita é uma criação tua ou uma receita de família transmitida ao longo de gerações. Isso é igualmente válido — basta ser honesto.",
        ],
      },
      {
        icon: "nonprofit",
        title: "Sem fins lucrativos, sem condições",
        body: [
          "O Super Chef é um projeto pessoal construído e mantido sem qualquer intenção comercial. Não há publicidade, sem taxas de subscrição, sem venda de dados, sem níveis premium e sem qualquer tipo de monetização. Existe porque o planeamento de refeições é genuinamente difícil e um pouco de organização faz toda a diferença.",
          "A plataforma é disponibilizada tal como está, gratuita para utilizar e desfrutar.",
        ],
      },
      {
        icon: "copyright",
        title: "Respeito pelos direitos de autor",
        body: [
          "Levamos os direitos de propriedade intelectual a sério. Os criadores de receitas, os autores de culinária e os editores investem um esforço enorme no seu trabalho, e isso merece respeito. Esta plataforma foi concebida para complementar esse trabalho, ajudando os utilizadores a organizar as suas coleções pessoais — não para o substituir ou reproduzir comercialmente.",
          "Se acreditas que algum conteúdo nesta plataforma viola os teus direitos ou o espírito deste aviso, por favor entra em contacto connosco. Trataremos do assunto prontamente e sem hesitação.",
        ],
      },
    ],
    closing:
      "O Super Chef é construído com cuidado para pessoas que amam gastronomia e querem passar menos tempo a planear e mais tempo a cozinhar. Obrigado por fazeres parte disto.",
  },
};

const iconMap: Record<string, React.ReactNode> = {
  purpose: <BookOpen className="h-5 w-5" />,
  ownership: <ShieldCheck className="h-5 w-5" />,
  attribution: <ExternalLink className="h-5 w-5" />,
  nonprofit: <Heart className="h-5 w-5" />,
  copyright: <Users className="h-5 w-5" />,
};

export default async function DisclaimerPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value ?? "en") as Locale;
  const c = locale === "pt" ? content.pt : content.en;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      {/* Hero */}
      <div className="text-center mb-14">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide mb-6">
          {c.hero.badge}
        </span>
        <h1 className="text-4xl font-display font-bold mb-4">{c.hero.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          {c.hero.subtitle}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {c.sections.map((section) => (
          <section
            key={section.icon}
            className="rounded-2xl border bg-card p-6 sm:p-8 space-y-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                {iconMap[section.icon]}
              </span>
              <h2 className="text-xl font-display font-semibold">{section.title}</h2>
            </div>

            <div className="space-y-3 text-muted-foreground leading-relaxed">
              {section.body.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {"examples" in section && section.examples && (
              <ul className="mt-4 space-y-1.5">
                {section.examples.map((ex) => (
                  <li key={ex} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-foreground font-medium">{ex}</span>
                  </li>
                ))}
              </ul>
            )}

            {"bodyAfter" in section && section.bodyAfter && (
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                {section.bodyAfter.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Closing */}
      <div className="mt-12 rounded-2xl bg-primary/5 border border-primary/20 px-6 py-6 text-center">
        <Heart className="h-6 w-6 fill-red-500 text-red-500 mx-auto mb-3" />
        <p className="text-muted-foreground leading-relaxed">{c.closing}</p>
      </div>

      {/* Back link */}
      <div className="mt-10 text-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
        >
          ← {locale === "pt" ? "Voltar ao início" : "Back to home"}
        </Link>
      </div>
    </div>
  );
}
