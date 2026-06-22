import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface RecruitmentCandidate {
  id: string;
  name: string;
  fileName?: string;
  cvText: string;
}

interface CandidateAnalysisResult {
  name: string;
  matchScore: number;
  strengths: string[];
  gaps: string[];
  summary: string;
  recommendation: string;
}

const SAMPLE_JOB_REQUIREMENTS = `Requisitos Críticos:
- Experiência sólida com React, TypeScript e Tailwind CSS no Frontend.
- Experiência em desenvolvimento de APIs RESTful usando Node.js ou linguagens modernas.
- Conhecimento em modelagem de dados relacionais (PostgreSQL/SQL) e barramentos de mensageria.
- Vivência prática com práticas ágeis (Scrum), testes unitários e esteiras de CI/CD.
- Pró-atividade, facilidade para trabalhar em equipe e forte senso de propriedade e compromisso técnico.`;

const EXAMPLES_BY_FIELD_AND_LEVEL: Record<string, Record<string, string>> = {
  Tech: {
    "Júnior": `Requisitos Críticos:
- Conhecimento básico em JavaScript, HTML, CSS e React ou lógica de programação.
- Familiaridade básica com controle de versão Git e comandos de terminal.
- Disposição extrema para aprender novas tecnologias e colaborar com o time.
- Boa comunicação e facilidade em receber feedbacks da equipe de liderança.`,
    Pleno: `Requisitos Críticos:
- Experiência prática comprovada de 2 a 4 anos com React, TypeScript e Tailwind CSS.
- Desenvolvimento de APIs RESTful estruturadas usando Node.js ou linguagens correlatas.
- Conhecimento intermediário em bancos de dados relacionais (PostgreSQL/MySQL) e modelagem de tabelas.
- Testes unitários funcionais com frameworks modernos (ex: Jest, Vitest, Testing Library).`,
    "Sênior": `Requisitos Críticos:
- Mais de 5 anos de experiência sólida em engenharia de software complexa com React, TypeScript e Tailwind CSS no Frontend.
- Experiência em desenvolvimento de APIs RESTful usando Node.js ou linguagens modernas.
- Conhecimento em modelagem de dados relacionais (PostgreSQL/SQL) e barramentos de mensageria.
- Vivência prática com práticas ágeis (Scrum), testes unitários e esteiras de CI/CD.
- Pró-atividade, facilidade para trabalhar em equipe e forte senso de propriedade e compromisso técnico.`,
    "Especialista/Lead": `Requisitos Críticos:
- Liderança de engenharia ou papel de Especialista Técnico sênior (+8 anos) guiando direções de arquitetura corporativa.
- Definição de padrões de desenvolvimento altamente escaláveis, microserviços e alta concorrência.
- Visão estratégica de infraestrutura Cloud distribuída (AWS/GCP), barramentos de fila, resiliência estrutural e observabilidade.
- Habilidade comprovada em gerir conflitos técnicos de arquitetura, negociar soluções com stakeholders de alto escalão e criar roteiros estratégicos.`
  },
  "Negócios": {
    "Júnior": `Requisitos Críticos:
- Apoio na operacionalização e organização de feedbacks de clientes ou stakeholders.
- Familiaridade com ferramentas básicas de acompanhamento de projetos ou documentação (Trello/Notion/Jira).
- Excelente organização pessoal, empatia e clareza na escrita estruturada de atas de reuniões.`,
    Pleno: `Requisitos Críticos:
- Experiência como Product Owner ou Product Manager de 2 a 4 anos em times multidisciplinares.
- Conhecimento intermediário em modelagem de processos, priorização por impacto e facilitação de dinâmicas ágeis (Scrum/Kanban).
- Capacidade de estruturar e detalhar histórias de usuários claras, critérios de aceitação refinados e roadmaps táticos.`,
    "Sênior": `Requisitos Críticos:
- Liderança de produtos maduros ou de múltiplos times ágeis como PM sênior por mais de 5 anos.
- Definição rigorosa de métricas chaves de sucesso (KPIs, OKRs), funis quantitativos de aquisição/retentação e rentabilização.
- Comunicação de influência exemplar com stakeholders complexos para mediar trade-offs estratégicos de roadmap de engenharia.`,
    "Especialista/Lead": `Requisitos Críticos:
- Direção estratégica de portfólio de produtos de grande escala ou canais múltiplos como dezenas de milhões de transações.
- Definição estrutural de estratégias GTM (Go To Market), parcerias estratégicas corporativas de tecnologia e alocação de fundos.
- Experiência com formação de líderes de produto, gestão integrada de equipes horizontais e relatórios à diretoria executiva.`
  },
  "Design": {
    "Júnior": `Requisitos Críticos:
- Domínio básico das ferramentas de design de interfaces (Figma/Adobe XD) e prototipagem.
- Noções fundamentais de harmonia de tipografias, guias de espaçamento, contraste e cores para acessibilidade.
- Boas habilidades de comunicação interpessoal e escuta de conselho de designers seniores.`,
    Pleno: `Requisitos Críticos:
- Portfólio demonstrando experiência prática de interfaces belas, modernas e sistemas de design de 2 a 4 anos.
- Domínio completo do Figma, incluindo fluxos responsivos avançados, layouts dinâmicos e bibliotecas de componentes reutilizáveis.
- Experiência no mapeamento de fluxos de experiência do utilizador completa (Ux/Ui Design) e protótipos de alta fidelidade funcionais.`,
    "Sênior": `Requisitos Críticos:
- Histórico sênior com portfólio de excelência visual, criativa e interações complexas ricas (+5 anos).
- Arquitetura estratégica e manutenção técnica de Design Systems corporativos escaláveis e acessíveis nível WCAG.
- Experiência na facilitação ativa de workshops criativos estendidos e testes formais com usuários reais coletando descobertas qualitativas.`,
    "Especialista/Lead": `Requisitos Críticos:
- Liderança com visão holística de toda a jornada visual e estratégica de experiência de produtos corporativos multinacionais.
- Definição global de governança estética, escalabilidade de design sistêmico unificado e consistência de marca corporativa.
- Mentoria profunda, forte articulação do valor instrumental do design para diretores das empresas e otimização produtiva do fluxo design-engineering.`
  },
  "Marketing": {
    "Júnior": `Requisitos Críticos:
- Criação e agendamento básico de posts digitais, campanhas de e-mails corporativos regulares e relatórios semanais de alcance.
- Conhecimento em preenchimento de planilhas e digitação básica de relatórios para o time técnico.
- Espírito criativo, disposição de escrita e rápida adaptação de novas redações de mídia.`,
    Pleno: `Requisitos Críticos:
- Gestão ativa de contas e de campanhas pagas remuneradas de tráfego de marcas (Meta Ads / Google Ads) de 2 a 4 anos.
- Conhecimento e domínio operacional de ferramentas de mensuração e analytics (Google Analytics, ferramentas CRM).
- Criação de testes A/B estruturados de criativos virtuais e relatórios técnicos focados em CPL, CAC e ROAS de escala média.`,
    "Sênior": `Requisitos Críticos:
- Gestão sênior (+5 anos) de planejamento orçamentário substancial de marketing digital orgânico e pago de alto volume.
- Definição metodológica refinada de estratégias holísticas de atração inbound de clientes de funil internacional e SEO avançado.
- Coordenação direta de agências, otimizadores e produtores gráficos de conteúdos sob uma lente unida de atribuição analítica rígida.`,
    "Especialista/Lead": `Requisitos Críticos:
- Direção e gestão corporativa de posicionamento corporativo unificado e campanhas integradas com grandes investimentos financeiros.
- Visão analítica de altíssimo nível para modelar métricas preditivas de negócios, penetração competitiva e LTV integral.
- Liderança de grandes equipes multidisciplinares e de assessorias de comunicação internacionais focados na integridade da marca.`
  },
  "Contabilidade": {
    "Júnior": `Requisitos Críticos:
- Apoio em rotinas diárias contábeis essenciais, preenchimento de balancetes mensais e conciliação de faturas.
- Organização básica de pastas de notas fiscais, importação bancária e arquivamento burocrático de transações.
- Atenção extraordinária aos detalhes numéricos e formação técnica / universitária em andamento em Ciências Contábeis.`,
    Pleno: `Requisitos Críticos:
- Experiência de 2 a 4 anos em operações de fechamento contábil mensal completo, lançamentos complexos e impostos indiretos fiscais.
- Excel avançado (tabelas dinâmicas, fórmulas de consulta estruturadas) e sistemas integrados de gestão ERP corporativa (ex: SAP).
- Capacidade apurada de analisar divergências de lançamentos bancários e realizar provisões contábeis ajustadas com precisão.`,
    "Sênior": `Requisitos Críticos:
- Gestão e supervisão sênior (+5 anos) de processos de conformidade com normas regulatórias de auditoria externa internacional.
- Elaboração estruturada das demonstrações financeiras obrigatórias estatutárias da companhia de capital de alta governança.
- Excelente capacidade interpretativa de legislações tributárias complexas para o desenvolvimento e aplicação de teses de eficiência tributária legítimas.`,
    "Especialista/Lead": `Requisitos Críticos:
- Direção financeira estratégica do plano tributário geral e conformidade fiscal para corporações com múltiplas filiais.
- Relação e interface técnica de alta responsabilidade em auditorias formais governamentais de grande envergadura fiscal.
- Suporte financeiro consultivo contínuo e analítico de alto impacto para subsidiar decisões críticas de conselhos e diretores executivos.`
  },
  "Telecomunicações": {
    "Júnior": `Requisitos Críticos:
- Suporte básico na manutenção de ramais, roteamento de conexões de cabos e triagem de chamados básicos de suporte interno.
- Auxílio a engenheiros de campo em medições físicas de sinal rádio-frequência ou passagens de infraestrutura local física.
- Desejo genuíno de aprender infra de rede e certificação inicial ou curso técnico associado à área.`,
    Pleno: `Requisitos Críticos:
- Operação e configuração de roteamento IP dinâmico ativo de alta disponibilidade de rede de operadoras ou ISPs (2 a 4 anos de experiência).
- Conhecimento em protocolos MPLS, BGP, OSPF e em marcas consagradas de equipamentos de telecom (ex: Cisco, Huawei).
- Gerenciamento de incidentes operacionais de rede IP aplicando instrumentação avançada de diagnóstico de tráfego de dados.`,
    "Sênior": `Requisitos Críticos:
- Arquitetura técnica e engenharia de redes estruturais metropolitanas ópticas ou móveis no nível sênior (+5 anos).
- Coordenação de rotas de interconexão internacional complexas, redundâncias de grandes infraestruturas e otimização das redes.
- Liderança de projetos estratégicos de inovação como migrações abrangentes de espectro e arquitetura de cookies e comunicações Cloud virtualizadas.`,
    "Especialista/Lead": `Requisitos Críticos:
- Liderança máxima da infraestrutura de telecom de escala nacional ou regional essencial que suporta milhões de utilizadores simultâneos.
- Planejamento estratégico de grandes aportes financeiros CAPEX/OPEX para expansões geográficas e adoções de tecnologias de vanguarda.
- Representação técnica institucional da corporação perante conselhos de segurança nacionais ou agências de regulação nacional de telecom.`
  },
  "Enfermagem": {
    "Júnior": `Requisitos Críticos:
- Execução qualificada de cuidados básicos de enfermagem em enfermarias de baixa complexidade assistencial rotineira.
- Registro completo e sem erros de sinais vitais de pacientes sob estrita prescrição médica diária ou de enfermeiro sênior.
- COREN ativo obrigatório, excelente empatia relacional com enfermos, familiares e atenção total a protocolos rigorosos.`,
    Pleno: `Requisitos Críticos:
- Experiência assistencial de 2 a 4 anos em unidades de enfermaria gerais ou em emergência / pronto-atendimento aplicando triagens de risco.
- Domínio prático de cuidados farmacológicos avançados, preparação asséptica precisa e controle analítico de fluidos de pacientes.
- Habilidade comprovada em interagir articuladamente em times de cuidados médicos integrados e de tomada de decisões de urgência táticas.`,
    "Sênior": `Requisitos Críticos:
- Atuação qualificada sênior de alto nível de assistência na área cirúrgica de alta complexidade ou Unidades de Terapia Intensiva (UTI) (+5 anos).
- Liderança operacional de equipes de técnicos de enfermagem organizando as escalas assistenciais sob normas rígidas regulatórias de saúde.
- Gestão ativa de controle de infecção hospitalar de enfermarias integradas e capacidade demonstrada de ensino e mentoria clínica prática.`,
    "Especialista/Lead": `Requisitos Críticos:
- Direção geral assistencial ou coordenação operacional de enfermagem regulatória de hospitais que gerenciam centenas de leitos de internação.
- Gestão corporativa estratégica focada no alcance de certificações de excelência de acreditação de processos assistenciais médicos.
- Definição estrutural de auditorias clínicas de qualidade geral e elaboração de novos manuais de processos para toda a rede hospitalar.`
  }
};

const SAMPLE_CANDIDATES: RecruitmentCandidate[] = [
  {
    id: "sc-1",
    name: "João Silva",
    fileName: "curriculo_joao_fullstack_sr.pdf",
    cvText: `JOÃO SILVA
Engenheiro de Software Full Stack Sênior com mais de 8 anos de experiência.
Habilidades Técnicas: React.js, TypeScript, Node.js (NestJS, Express), GraphQL, PostgreSQL, Redis, Docker, AWS (S3, EC2, CloudFront), CI/CD (GitHub Actions), Jest, Git.

Experiências Profissionais:
- Liderança técnica na TechHub (2022-Atual): Arquitetou a migração de um monolítico herdado para microserviços em Node.js com TypeScript e frontend estruturado em Next.js. Otimizou consultas PostgreSQL reduzindo latência de gravação de banco em 40%.
- Desenvolvedor Full Stack na InnovaPay (2019-2022): Criou o core dinâmico do dashboard administrativo unindo React e Tailwind para processamento financeiro. Implementou testes com robustez de cobertura de 90%.
- Bacharel em Ciência da Computação pela Universidade de São Paulo (USP).`
  },
  {
    id: "sc-2",
    name: "Mariana Costa",
    fileName: "cv_mariana_frontend_pl.docx",
    cvText: `MARIANA COSTA
Desenvolvedora Frontend Pleno apaixonada por interfaces ricas e design systems escaláveis.
Habilidades: React, Vue.js, Tailwind CSS, Sass, componentização, Tailwind, HTML5, CSS3, JavaScript (ES6+), Jest, Styled Components, Figma. Experiência em acessibilidade (WCAG).

Experiência Profissional:
- Frontend dev na PixelPerfect Softwares (2021-Atual): Responsável por criar e manter a biblioteca comum de componentes com foco em acessibilidade e performance no React. Forte colaboração com time de UI/UX Product designers.
- Programadora Web na Agência Alfa (2018-2021): Criação de landing pages, hotsites e e-commerces com animações fluidas e layouts responsivos para grandes marcas multinacionais.
- Graduação em Design de Interfaces.`
  },
  {
    id: "sc-3",
    name: "Carlos Ramos",
    fileName: "carlos_ramos_dev_jr.txt",
    cvText: `CARLOS RAMOS
Desenvolvedor de Software Júnior focado em backend e infraestrutura Cloud.
Tecnologias: Python, Docker, Fundamentos de AWS (EC2/S3), HTTP APIs, Docker compose, Git básico, Linux terminal.

Experiências:
- Estagiário em Suporte e Infraestrutura na NetServ (2023-2024): Configuração de ambientes locais de desenvolvimento de desenvolvedores seniores usando Docker. Scripts básicos de automação de logs em Bash e Python.
- Certificação AWS Cloud Practitioner ativa.
- Cursando Engenharia de Computação (5º semestre).`
  }
];

export default function RecruiterPage({ isGuest = false }: { isGuest?: boolean }) {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem("auth_user_v1");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleRecruiterAuthRedirect = () => {
    localStorage.removeItem("auth_token_v1");
    localStorage.removeItem("auth_user_v1");
    localStorage.removeItem("auth_guest_v1");
    window.location.reload();
  };

  const [field, setField] = useState("Tech");
  const [experienceLevel, setExperienceLevel] = useState("Sênior");
  const [language, setLanguage] = useState("Português");
  const [jobRequirements, setJobRequirements] = useState(SAMPLE_JOB_REQUIREMENTS);
  const [isCustomRequirements, setIsCustomRequirements] = useState(false);
  const [extractedField, setExtractedField] = useState<string | null>(null);
  const [extractedSeniority, setExtractedSeniority] = useState<string | null>(null);

  const handleFieldChange = (newField: string) => {
    setField(newField);
    if (!isCustomRequirements) {
      const preset = EXAMPLES_BY_FIELD_AND_LEVEL[newField]?.[experienceLevel] || SAMPLE_JOB_REQUIREMENTS;
      setJobRequirements(preset);
    }
  };

  const handleExperienceChange = (newLevel: string) => {
    setExperienceLevel(newLevel);
    if (!isCustomRequirements) {
      const preset = EXAMPLES_BY_FIELD_AND_LEVEL[field]?.[newLevel] || SAMPLE_JOB_REQUIREMENTS;
      setJobRequirements(preset);
    }
  };

  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [currentManualName, setCurrentManualName] = useState("");
  const [currentManualText, setCurrentManualText] = useState("");
  const [isParsingFiles, setIsParsingFiles] = useState(false);
  const [currentParsingFile, setCurrentParsingFile] = useState<string | null>(null);
  const [parsingStep, setParsingStep] = useState<string>("");
  const [parsingError, setParsingError] = useState<string | null>(null);

  const [isLoadingTriage, setIsLoadingTriage] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [results, setResults] = useState<CandidateAnalysisResult[] | null>(null);
  const [actualModelUsed, setActualModelUsed] = useState<string | null>(null);
  const [selectedResultCandidate, setSelectedResultCandidate] = useState<CandidateAnalysisResult | null>(null);

  const resultsRef = React.useRef<HTMLDivElement>(null);

  // Find duplicate pairs of candidates (by same name or contacts match)
  const findDuplicateCandidates = () => {
    const duplicates: { nameA: string; nameB: string; type: "name" | "email" }[] = [];
    
    // Extract emails helper
    const getEmails = (text: string): string[] => {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      return (text.match(emailRegex) || []).map(e => e.toLowerCase());
    };

    // Helper to normalize names
    const cleanName = (name: string): string => {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, "") // remove spaces and punctuation
        .trim();
    };

    for (let i = 0; i < candidates.length; i++) {
      const candA = candidates[i];
      const emailsA = getEmails(candA.cvText);
      const normA = cleanName(candA.name);

      for (let j = i + 1; j < candidates.length; j++) {
        const candB = candidates[j];
        const emailsB = getEmails(candB.cvText);
        const normB = cleanName(candB.name);

        // Check email match
        const commonEmail = emailsA.find(e => emailsB.includes(e));
        if (commonEmail) {
          duplicates.push({
            nameA: candA.name,
            nameB: candB.name,
            type: "email"
          });
          continue;
        }

        // Check exact name match
        if (normA && normB && normA === normB) {
          duplicates.push({
            nameA: candA.name,
            nameB: candB.name,
            type: "name"
          });
        }
      }
    }

    return duplicates;
  };

  const duplicatesList = findDuplicateCandidates();

  if (!currentUser || currentUser.role !== "recrutador") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-605 dark:text-amber-450 border border-amber-500/20 flex items-center justify-center shadow-sm mb-6 animate-pulse">
          <span className="material-symbols-outlined text-3xl font-bold">lock_person</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-display mb-3">
          Acesso Restrito: Módulo Recrutador
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-6">
          Para usar os recursos avançados de Triagem Comparativa de Currículos com IA, **deve possuir e estar autenticado numa conta do tipo Recrutador**. Contas de Candidato e Recrutador são mutuamente exclusivas e não podem partilhar o mesmo e-mail.
          {isGuest ? (
            <span className="block mt-2 font-medium">Atualmente encontra-se a aceder em modo Visitante (Guest). Por favor, crie uma conta para começar.</span>
          ) : (
            <span className="block mt-2 font-semibold text-rose-500 dark:text-rose-400">Sua conta atual ({currentUser?.email}) é de perfil Candidato.</span>
          )}
        </p>

        <div className="w-full">
          <button
            onClick={handleRecruiterAuthRedirect}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            Sair e Criar / Aceder como Recrutador
          </button>
        </div>
      </div>
    );
  }

  // Parse files like SetupPage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsParsingFiles(true);
    setParsingError(null);
    const newCandidates: RecruitmentCandidate[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = file.name;
      const extension = filename.split(".").pop()?.toLowerCase();
      const candidateName = filename.substring(0, filename.lastIndexOf(".")) || filename;

      setCurrentParsingFile(filename);
      setParsingStep("Recebendo arquivo e validando formato de entrada...");
      await new Promise((r) => setTimeout(r, 450)); // paced visual transition for human eyes

      const isImage = file.type.startsWith('image/');
      if (isImage) {
        setParsingError(
          `Rejeitado: '${filename}' é uma imagem. Apenas arquivos textuais são permitidos para a triagem.`
        );
        continue;
      }

      try {
        let extractedText = "";

        if (extension === "pdf") {
          setParsingStep("Iniciando motor de renderização da Dra. Ana Martins para decodificar PDF...");
          await new Promise((r) => setTimeout(r, 400));
          const arrayBuffer = await file.arrayBuffer();

          let pdfjs;
          try {
            // Import dynamically from local package dependencies first
            // @ts-ignore
            pdfjs = await import("pdfjs-dist");
            const pdfjsVersion = pdfjs.version || "6.0.227";
            pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
          } catch (localErr) {
            console.warn("Local pdfjs-dist dependency import failed/warned. Triggering robust CDN dynamic ESM fallback:", localErr);
            // @ts-ignore
            pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/+esm");
            pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
          }

          setParsingStep(`Lendo ${filename} (${i+1}/${files.length}) - Extraindo caracteres de vetores lineares...`);
          const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          let fullText = "";

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              // @ts-ignore
              .map((item: any) => item.str)
              .join(" ");
            fullText += pageText + "\n";
          }
          extractedText = fullText.trim();
        } else if (extension === "docx") {
          setParsingStep(`Injetando leitor DOCX comprimido para ler ${filename}...`);
          await new Promise((r) => setTimeout(r, 450));
          const arrayBuffer = await file.arrayBuffer();
          // @ts-ignore
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result?.value?.trim() || "";
        } else if (extension === "txt") {
          setParsingStep(`Indexando arquivo de texto simples (.txt) em buffer linear para ${filename}...`);
          await new Promise((r) => setTimeout(r, 450));
          extractedText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve((event.target?.result as string) || "");
            reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
            reader.readAsText(file);
          });
        } else {
          // Fallback reading
          setParsingStep(`Lendo arquivo não-indexado .${extension} em modo heurístico...`);
          await new Promise((r) => setTimeout(r, 500));
          extractedText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve((event.target?.result as string) || "");
            reader.onerror = () => reject(new Error("Não suportado"));
            reader.readAsText(file);
          });
        }

        if (extractedText.length < 25) {
          setParsingError(`Erro: O currículo bruto '${filename}' possui texto legível selecionável insuficiente.`);
        } else {
          setParsingStep("Mapeamento estrutural de competências e soft skills completo.");
          await new Promise((r) => setTimeout(r, 400));
          newCandidates.push({
            id: `cand-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            name: candidateName.replace(/(_|-|\+)/g, " ").trim(),
            fileName: filename,
            cvText: extractedText
          });
        }
      } catch (err: any) {
        console.error("Error parsing file", file.name, err);
        setParsingError(`Falha técnica ao tentar decodificar as camadas de texto de ${filename}: ${err.message || err}`);
      }
    }

    setCandidates((prev) => [...prev, ...newCandidates]);
    setCurrentParsingFile(null);
    setParsingStep("");
    setIsParsingFiles(false);
  };

  const handleAddManualCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentManualName.trim() || !currentManualText.trim()) return;

    const newCand: RecruitmentCandidate = {
      id: `manual-${Date.now()}`,
      name: currentManualName.trim(),
      cvText: currentManualText.trim()
    };

    setCandidates((prev) => [...prev, newCand]);
    setCurrentManualName("");
    setCurrentManualText("");
  };

  const handleRemoveCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  const handleLoadSampleCandidates = () => {
    setCandidates(SAMPLE_CANDIDATES);
    setField("Tech");
    setExperienceLevel("Sênior");
    setJobRequirements(SAMPLE_JOB_REQUIREMENTS);
    setIsCustomRequirements(false);
  };

  const handleStartTriage = async () => {
    if (candidates.length === 0) {
      setTriageError("Adicione pelo menos um currículo (ou clique em 'Carregar Exemplo de Demo').");
      return;
    }
    if (!jobRequirements.trim()) {
      setTriageError("Forneça a descrição da vaga e requisitos fundamentais para realizar a triagem comparativa.");
      return;
    }

    setIsLoadingTriage(true);
    setTriageError(null);
    setResults(null);
    setSelectedResultCandidate(null);
    setExtractedField(null);
    setExtractedSeniority(null);

    try {
      const response = await fetch("/api/recruiter/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobRequirements,
          field,
          experienceLevel,
          language,
          candidates: candidates.map((c) => ({ name: c.name, cvText: c.cvText })),
          isCustom: isCustomRequirements
        })
      });

      if (!response.ok) {
        throw new Error("Erro na solicitação de triagem de currículos.");
      }

      const data = await response.json();
      if (data.analysisList) {
        // Sort results descending by score
        const sorted = [...data.analysisList].sort((a: CandidateAnalysisResult, b: CandidateAnalysisResult) => b.matchScore - a.matchScore);
        setResults(sorted);
        setActualModelUsed(data.actualModelUsed || "gemini-3.5-flash");
        setExtractedField(data.extractedField || null);
        setExtractedSeniority(data.extractedSeniority || null);
        if (sorted.length > 0) {
          setSelectedResultCandidate(sorted[0]);
        }
        // Auto-scroll to results ref smoothly
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      } else {
        throw new Error("Resposta inválida recebida do servidor de triagem.");
      }
    } catch (err: any) {
      console.error(err);
      setTriageError(err.message || "Erro desconhecido ao processar comparações.");
    } finally {
      setIsLoadingTriage(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-6xl mx-auto px-4 md:px-6">
      {/* Visual Title Header */}
      <div className="text-center md:text-left flex flex-col gap-2 mt-4 md:mt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 rounded-full self-center md:self-start">
          <span className="material-symbols-outlined text-indigo-500 text-sm spin-none font-bold">corporate_fare</span>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Contratação Corporativa</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
          Módulo Recrutador <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Premium ✨</span>
        </h1>
        <p className="text-sm font-semibold max-w-xl leading-relaxed text-slate-500 dark:text-slate-400">
          Compare múltiplos currículos instantaneamente em relação a uma vaga, ordene talentos por matching de cota e obtenha lacunas operacionais detalhadas usando a IA da Dra. Ana Martins.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Vaga and CV parser Inputs */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-xs flex flex-col gap-5">
            <h2 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500 font-bold">work_outline</span>
              1. Configurar Requisitos da Vaga
            </h2>

            {/* Specification Mode Toggle */}
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/40">
              <label className="text-[9px] text-indigo-950 dark:text-indigo-400 font-bold uppercase tracking-wider">Modo de Especificação de Vaga</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomRequirements(false);
                    // Load corresponding exemplar
                    const preset = EXAMPLES_BY_FIELD_AND_LEVEL[field]?.[experienceLevel] || SAMPLE_JOB_REQUIREMENTS;
                    setJobRequirements(preset);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold text-center border cursor-pointer outline-none transition-all ${
                    !isCustomRequirements
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                      : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  Exemplares
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomRequirements(true)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold text-center border cursor-pointer outline-none transition-all ${
                    isCustomRequirements
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                      : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  Personalizado (IA)
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 dark:text-slate-500 font-medium">
                {!isCustomRequirements 
                  ? "✓ Usando exemplares de mercado adaptados automaticamente." 
                  : "✨ Setor e Senioridade serão extraídos ou inferidos de acordo com o mercado."}
              </p>
            </div>

            {/* Quick configurations dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 opacity-100 transition-opacity">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Setor da vaga</label>
                <select
                  disabled={isCustomRequirements}
                  value={field}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none transition-colors ${
                    isCustomRequirements
                      ? "bg-slate-100 dark:bg-slate-800/65 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <option value="Tech">Tech / Desenvolvimento</option>
                  <option value="Negócios">Negócios & Produtos</option>
                  <option value="Design">UI/UX & Product Design</option>
                  <option value="Marketing">Marketing & Analytics</option>
                  <option value="Contabilidade">Finanças e Contábil</option>
                  <option value="Telecomunicações">Telecom e Infra</option>
                  <option value="Enfermagem">Saúde & Enfermagem</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 opacity-100 transition-opacity">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Senioridade</label>
                <select
                  disabled={isCustomRequirements}
                  value={experienceLevel}
                  onChange={(e) => handleExperienceChange(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none transition-colors ${
                    isCustomRequirements
                      ? "bg-slate-100 dark:bg-slate-800/65 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <option value="Júnior">Júnior</option>
                  <option value="Pleno">Pleno</option>
                  <option value="Sênior">Sênior</option>
                  <option value="Especialista/Lead">Especialista / Lead</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Idioma de Análise</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="Português">Português (Brasil)</option>
                <option value="Inglês">Inglês (English)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Descrição dos Requisitos Críticos</label>
              <textarea
                value={jobRequirements}
                onChange={(e) => {
                  setJobRequirements(e.target.value);
                  setIsCustomRequirements(true);
                }}
                rows={6}
                placeholder="Insira as competências e tecnologias obrigatórias para este perfil..."
                className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none font-sans leading-relaxed resize-none"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500 font-bold">group_add</span>
                2. Adicionar Currículos
              </h2>
              <button
                type="button"
                onClick={handleLoadSampleCandidates}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Demo de Teste 📂
              </button>
            </div>

            {/* Drag & Drop simulated area */}
            {isParsingFiles ? (
              <div className="relative overflow-hidden border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 bg-indigo-50/10 dark:bg-indigo-950/20 text-center flex flex-col items-center justify-center gap-4 min-h-[178px]">
                {/* Simulated doc scanner graphic */}
                <div className="relative w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center border border-indigo-200/50 dark:border-indigo-900/40 shadow-sm">
                  <span className="material-symbols-outlined text-indigo-500 dark:text-indigo-400 text-3xl animate-pulse">
                    description
                  </span>
                  
                  {/* Glowing scan horizontal line moving down in perpetuity using motion */}
                  <motion.div
                    animate={{ y: [-15, 25, -15] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_8px_1px_rgba(99,102,241,0.5)]"
                  />
                </div>

                <div className="flex flex-col gap-1 max-w-xs">
                  <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 animate-pulse flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block" />
                    Extraindo & Analisando Currículo...
                  </h4>
                  {currentParsingFile && (
                    <p className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-350 truncate max-w-[210px] mx-auto">
                      {currentParsingFile}
                    </p>
                  )}
                  {parsingStep && (
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                      {parsingStep}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative border border-dashed border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-950/20 text-center hover:bg-slate-50/80 dark:hover:bg-slate-950/30 transition-all group flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 dark:text-indigo-550 group-hover:scale-110 transition-all text-4xl">
                  cloud_upload
                </span>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-snug">
                  Arraste ou selecione múltiplos PDFs, Word (.docx) ou arquivos de Texto
                </p>
                <p className="text-[10px] text-slate-400 font-medium">Arquivos convertidos e extraídos localmente</p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-3">Inserir Manualmente</span>
              <form onSubmit={handleAddManualCandidate} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Nome do candidato..."
                  value={currentManualName}
                  onChange={(e) => setCurrentManualName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <textarea
                  placeholder="Cole o resumo, competências ou texto bruto do currículo do candidato..."
                  value={currentManualText}
                  onChange={(e) => setCurrentManualText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none h-20 resize-none"
                />
                <button
                  type="submit"
                  disabled={!currentManualName.trim() || !currentManualText.trim()}
                  className="bg-slate-900 hover:bg-black dark:bg-indigo-650 dark:hover:bg-indigo-600 text-white font-bold p-2 text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Adicionar Candidato
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Side: List of Candidates added & Run comparative Triage */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Candidates Inventory List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500 font-bold">supervisor_account</span>
                Lista de Candidatos para Triagem ({candidates.length})
              </h2>
              {candidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCandidates([])}
                  className="text-[10px] text-rose-500 hover:text-rose-600 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Limpar Todos
                </button>
              )}
            </div>

            {parsingError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-2xl flex items-center gap-2 border border-rose-100">
                <span className="material-symbols-outlined text-sm font-bold">error_outline</span>
                <span>{parsingError}</span>
              </div>
            )}

            {isParsingFiles ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-semibold">Decodificando currículos e indexando termos...</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-10 border border-dashed border-slate-150 dark:border-slate-800/50 rounded-2xl text-center flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 select-none">person_outline</span>
                <p className="text-xs font-semibold">Nenhum candidato carregado para este processo seletivo.</p>
                <button
                  type="button"
                  onClick={handleLoadSampleCandidates}
                  className="mt-2 text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer"
                >
                  ⚡ Carregar Exemplo de Demo para Teste Rápido
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {candidates.map((cand) => (
                    <motion.div
                      key={cand.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/40 rounded-xl flex items-center justify-between gap-3 group hover:border-indigo-100 dark:hover:border-indigo-950 transition-all"
                    >
                      <div className="truncate text-left flex-1">
                        <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-slate-450 dark:text-slate-500 text-sm">face</span>
                          {cand.name}
                        </h4>
                        {cand.fileName && (
                          <span className="text-[9px] text-slate-400 font-mono block truncate mt-0.5">{cand.fileName}</span>
                        )}
                        <p className="text-[10px] text-slate-400 italic truncate mt-0.5">
                          "{cand.cvText.slice(0, 100)}..."
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCandidate(cand.id)}
                        className="text-slate-350 hover:text-rose-500 p-1 cursor-pointer"
                        title="Remover"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">delete</span>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Run Triage trigger button */}
            <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 flex flex-col gap-3">
              {duplicatesList.length > 0 && (
                <div className="p-3 bg-amber-55/70 dark:bg-amber-950/25 text-amber-700 dark:text-amber-450 text-[11px] font-semibold rounded-2xl border border-amber-200/60 dark:border-amber-900/40 flex flex-col gap-1.5 text-left">
                  <div className="flex items-center gap-1.5 font-black text-amber-850 dark:text-amber-300">
                    <span className="material-symbols-outlined text-sm font-bold">warning</span>
                    <span>Alerta de Duplicidade Detectado!</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 font-semibold leading-relaxed">
                    {duplicatesList.map((dup, idx) => (
                      <li key={idx}>
                        Os currículos de <span className="underline">{dup.nameA}</span> e <span className="underline">{dup.nameB}</span> parecem pertencer à mesma pessoa ({dup.type === "email" ? "contatos de e-mail coincidentes" : "termos de nome coincidentes"}).
                      </li>
                    ))}
                  </ul>
                  <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold italic mt-1 block">
                    * A triagem comparativa continuará normalmente para todos os envios de arquivos.
                  </span>
                </div>
              )}

              {triageError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-2xl flex items-center gap-2 border border-rose-200">
                  <span className="material-symbols-outlined text-sm font-bold">warning</span>
                  <span>{triageError}</span>
                </div>
              )}
              
              <button
                type="button"
                onClick={handleStartTriage}
                disabled={isLoadingTriage || candidates.length === 0}
                className="w-full bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-2xl py-3.5 text-xs font-black transition-all hover:brightness-110 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-650/15 cursor-pointer"
              >
                {isLoadingTriage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processando Triagem Comparativa (Aguarde)...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">query_stats</span>
                    <span>Comparar & Triar Candidatos com IA ⚡</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Triage Results Dashboard section */}
      <AnimatePresence>
        {results && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 flex flex-col gap-6"
          >
            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-5 md:p-8 text-left shadow-lg text-white flex flex-col gap-6">
              
              {/* Header result info banner */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">Resultado Oficial da Triagem</span>
                  <h3 className="text-xl font-display font-bold">Painel de Classificação de Talentos 📋</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-slate-800 text-[11px] font-bold uppercase rounded-md text-indigo-300">
                      {isCustomRequirements && (extractedField || extractedSeniority)
                        ? `${extractedField || field} — ${extractedSeniority || experienceLevel}`
                        : `${field} — ${experienceLevel}`}
                    </span>
                    {isCustomRequirements && (
                      <span className="px-2 py-0.5 bg-indigo-950/50 text-[9px] font-black uppercase rounded-md text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                        Mapeado via Requisitos Críticos
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Análise processada via <span className="font-bold underline text-indigo-300">{actualModelUsed === "offline" ? "Triagem Local (Anti-Overload)" : `${actualModelUsed}`}</span>
                    </span>
                  </div>
                </div>

                {isGuest && (
                  <div className="px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-amber-500/20">
                    Modo de Demonstração Activo
                  </div>
                )}
              </div>

              {/* Grid: 2 Columns - Rank table and Selected Candidate detail */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Ranking Table List */}
                <div className="lg:col-span-5 flex flex-col gap-3.5">
                  <span className="text-[10px] text-slate-450 font-black uppercase tracking-widest block">Ranking de Aderência</span>
                  
                  <div className="flex flex-col gap-2.5">
                    {results.map((resItem, index) => {
                      const isSelected = selectedResultCandidate?.name === resItem.name;
                      const isTopFit = index === 0 && resItem.matchScore >= 75;

                      return (
                        <div
                          key={resItem.name}
                          onClick={() => setSelectedResultCandidate(resItem)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-slate-800 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                              : "bg-slate-950/60 border-slate-850 text-slate-300 hover:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            {/* Position indicator */}
                            <div className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                              index === 0
                                ? "bg-amber-500 text-amber-950"
                                : index === 1
                                ? "bg-slate-400 text-slate-950"
                                : "bg-slate-800 text-slate-400"
                            }`}>
                              {index + 1}
                            </div>

                            <div className="truncate">
                              <h4 className="text-xs font-black truncate flex items-center gap-1">
                                {resItem.name}
                                {isTopFit && (
                                  <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-1 rounded uppercase tracking-wider scale-90">
                                    Top Fit
                                  </span>
                                )}
                              </h4>
                              <p className="text-[9px] text-slate-400 truncate mt-1">
                                Rec: {resItem.recommendation}
                              </p>
                            </div>
                          </div>

                          {/* Gauge display score */}
                          <div className="text-right shrink-0">
                            <span className={`text-md font-black ${
                              resItem.matchScore >= 80
                                ? "text-emerald-400"
                                : resItem.matchScore >= 60
                                ? "text-indigo-400"
                                : "text-amber-400"
                            }`}>
                              {resItem.matchScore}%
                            </span>
                            <span className="text-[8px] text-slate-500 block uppercase font-bold">Match</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Candidate Detailed Report CARD */}
                <div className="lg:col-span-7 bg-slate-950/80 border border-slate-850 rounded-2xl p-6 flex flex-col gap-5 text-left">
                  {selectedResultCandidate ? (
                    <>
                      {/* Name card header in detail view */}
                      <div className="flex justify-between items-start gap-4 border-b border-row-850 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-md font-bold text-slate-100 uppercase tracking-wide">
                              {selectedResultCandidate.name}
                            </h4>
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[9px] font-bold">
                              {selectedResultCandidate.matchScore >= 80 ? "Aprovado na Triagem" : "Avaliação Secundária"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-450 font-medium mt-1 leading-relaxed">
                            {selectedResultCandidate.summary}
                          </p>
                        </div>

                        {/* Match score circles */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`p-4 rounded-xl border flex flex-col items-center justify-center shrink-0 ${
                            selectedResultCandidate.matchScore >= 80
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : selectedResultCandidate.matchScore >= 60
                              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          }`}>
                            <span className="text-xl font-black font-mono leading-none">
                              {selectedResultCandidate.matchScore}
                            </span>
                            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 block mt-0.5">Pontos</span>
                          </div>
                        </div>
                      </div>

                      {/* Strengths List */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] text-slate-450 font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-emerald-400 text-sm font-bold">check_circle</span>
                          Pilares e Pontos Fortes em Destaque
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedResultCandidate.strengths.map((str, i) => (
                            <div key={i} className="text-xs bg-slate-900 border border-slate-850/50 p-2.5 rounded-xl flex items-start gap-2 text-slate-300">
                              <span className="text-emerald-400 font-bold shrink-0">✔</span>
                              <p className="leading-relaxed">{str}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Gaps / Deficiencies */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] text-slate-450 font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-rose-400 text-sm font-bold">warning</span>
                          Lacunas identificadas vs. Vaga
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedResultCandidate.gaps.map((gap, i) => (
                            <div key={i} className="text-xs bg-slate-900 border border-slate-850/50 p-2.5 rounded-xl flex items-start gap-2 text-slate-350">
                              <span className="text-rose-450 font-bold shrink-0">⚠</span>
                              <p className="leading-relaxed">{gap}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action recommendation */}
                      <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-2xl p-4 flex items-start gap-3 mt-2">
                        <span className="material-symbols-outlined text-indigo-400 text-md font-bold mt-0.5 shrink-0">campaign</span>
                        <div className="text-left">
                          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block">Ação do Recrutador</span>
                          <p className="text-xs font-black text-indigo-200 mt-1">
                            {selectedResultCandidate.recommendation}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-10 text-center text-slate-500 text-xs">
                      Selecione um candidato para visualizar a ficha de matching detalhada.
                    </div>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
