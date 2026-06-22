export interface SampleProfile {
  name: string;
  field: string;
  level: string;
  cvText: string;
}

export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    name: "Desenvolvedor React Sênior (Exemplo)",
    field: "Tech",
    level: "Sênior",
    cvText: `Nome: João Silva
Cargo: Engenheiro de Software Sênior
Resumo: Especialista em desenvolvimento web Front-end com mais de 7 anos de experiência utilizando React, Redux, Context API e Zustand. Foco em arquiteturas escaláveis, renderização otimizada, SSR (Next.js) e liderança técnica de equipes multidisciplinares.
Habilidades: React JS, Tailwind CSS, TypeScript, Zustand, Jest, React Testing Library, CI/CD, Next.js, Webpack, Vite.`
  },
  {
    name: "Product Manager Pleno (Exemplo)",
    field: "Negócios",
    level: "Pleno",
    cvText: `Nome: Beatriz Santos
Cargo: Product Manager
Resumo: 4 anos de experiência em gestão de produtos digitais (SaaS B2B). Liderança em descoberta de produto (product discovery), definição de objetivos (OKRs), mapeamento de histórias e priorização utilizando metodologias ágeis (Scrum/Kanban). Colaboração direta com engenharia e design.
Habilidades: Product Discovery, Agile, OKRs, Firebase Analytics, SQL Básico, Growth Hacking, Priorização MoSCoW.`
  },
  {
    name: "UI/UX Designer Júnior (Exemplo)",
    field: "Design",
    level: "Júnior",
    cvText: `Nome: Lucas Lima
Cargo: Designer UI/UX Júnior
Resumo: Profissional focado na criação de interfaces elegantes, fáceis de usar e voltadas para o usuário final. Experiência de 1 ano em criação de wireframes, protótipos de alta fidelidade no Figma e realização de testes de usabilidade.
Habilidades: Figma, Adobe XD, Pesquisa com Usuários (User Research), Design Systems, Prototipação Rápida.`
  }
];
