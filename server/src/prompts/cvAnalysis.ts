/**
 * Ponto 1: Leitura e Análise do Currículo (CV)
 * Fornece feedbacks, notas e análise de competências do documento textual enviado.
 */

export function getCvAnalysisPrompt(
  field: string,
  experienceLevel: string,
  language: string,
  cvText: string,
  analysisMethod?: string,
  jobRequirements?: string
): string {
  const langPrompt = language === "Inglês"
    ? "English. Formulate the feedback in clear English."
    : "Português do Brasil. Formule o feedback em português claro.";

  const targetVacancyPrompt = jobRequirements && jobRequirements.trim()
    ? `Requisitos e Especificação da Vaga Alvo:\n${jobRequirements}\n(ATENÇÃO: Avalie a aderência do currículo especificamente contra esta vaga!)`
    : `Vaga de mercado genérica na área de ${field} no nível de senioridade ${experienceLevel}.`;

  const cleanStr = (s: string) => s.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim().toLowerCase();
  const getStandardDefault = (f: string, l: string): string => {
    switch (f) {
      case "Tech": return `Vaga: Engenheiro de Software ${l}\nRequisitos:\n- Desenvolvimento de aplicações robustas e escaláveis\n- Forte conhecimento em TypeScript, React, APIs RESTful\n- Experiência prática na metodologia STAR e em otimização de performance técnica de sistemas\n- Boas práticas de arquitetura de software e testes`;
      case "Negócios": return `Vaga: Product Manager ${l}\nRequisitos:\n- Gestão do ciclo de vida de produtos digitais, métricas e OKRs\n- Experiência em Product Discovery e validação de hipóteses com usuários\n- Excelente comunicação para facilitação de alinhamentos e tomadas de decisão\n- Priorização estratégica de backlogs e roadmap`;
      case "Design": return `Vaga: UI/UX Designer ${l}\nRequisitos:\n- Criação de wireframes, fluxos de usuários e protótipos em alta fidelidade no Figma\n- Domínio de Design Systems escaláveis e consistência visual\n- Condução de pesquisas qualitativas e testes de usabilidade com usuários de verdade\n- Foco em acessibilidade digital e design responsivo`;
      case "Marketing": return `Vaga: Especialista de Marketing / Performance ${l}\nRequisitos:\n- Gestão e otimização de campanhas de tráfego pago (Meta Ads, Google Ads)\n- Análise aprofundada de funil de conversão, CAC, LTV e ROI de campanhas\n- SEO (Search Engine Optimization) e produção técnica de conteúdos estratégicos\n- Testes A/B e tomada de decisões baseada estritamente em analytics`;
      case "Contabilidade": return `Vaga: Analista de Contabilidade / Controller ${l}\nRequisitos:\n- Conciliação contábil e fiscal de alta complexidade\n- Domínio prático em normas CPC / IFRS\n- Fechamento de balancetes mensais e elaboração de relatórios gerenciais e DRE\n- Atuação pragmática frente a auditorias internas e externas`;
      case "Telecomunicações": return `Vaga: Engenheiro de Telecomunicações ${l}\nRequisitos:\n- Conhecimento em radiofrequência, propagação e enlaces de transmissão óptica/rádio\n- Configuração de QoS (Quality of Service), monitoramento de telemetria e Engenharia de Tráfego\n- Diagnóstico avançado de latência, jitter, perda de pacotes e contingenciamento de rede\n- Familiaridade com tecnologias móveis como 5G e LTE`;
      case "Enfermagem": return `Vaga: Enfermeiro ${l}\nRequisitos:\n- Triagem clínica de pacientes e protocolo de Manchester sob alto fluxo hospitalar\n- Controle rigoroso de biossegurança e prevenção de infecção hospitalar\n- Gestão de prontuários eletrônicos e administração segura de farmacológicos\n- Atenção à saúde humanizada integrada com as diretivas do Coren`;
      default: return "";
    }
  };

  const isCustom = jobRequirements && jobRequirements.trim()
    ? cleanStr(getStandardDefault(field, experienceLevel)) !== cleanStr(jobRequirements)
    : false;

  const customVacancyRule = isCustom
    ? `\n[ALERTA IMPORTANTE - VAGA CUSTOMIZADA PELO USUÁRIO]:
O usuário cadastrou requisitos e termos próprios para a vaga alvo na caixa de texto.
Portanto, você DEVE IGNORAR completamente a área de atuação ("${field}") e o nível de senioridade ("${experienceLevel}") selecionados nos campos de formulário padrão.
Em vez disso, leia com atenção semântica profunda e extraia a real área profissional, o escopo técnico, as restrições ou responsabilidades e a senioridade real (Júnior, Pleno ou Sênior) diretamente a partir de seu próprio texto de especificações customizadas da vaga fornecido no campo "Requisitos e Especificação da Vaga Alvo".
Toda a sua análise de aderência, pontuação, pontos fortes e pontos de melhora deve tomar esse contexto extraído da vaga customizada como verdade absoluta, eliminando desvios ou falsas inconsistências do formulário básico.`
    : "";

  const readingMethodPrompt = `Método de Leitura / Estratégia Escolhida: "ATL (Triagem de Currículos)"
Diretrizes do Método (Foco em Triagem e Validação de Coerência Profunda):
- Compare dinamicamente e de forma profunda as especificações da vaga alvo (Requisitos da Vaga Alvo) e o teor real do currículo do candidato.
- Vá muito além de correspondências estáticas de palavras-chave. Analise a coerência entre a trajetória profissional, as atribuições de cargos anteriores, as conquistas mencionadas e o escopo real exigido pela vaga de emprego.
- Determine se há incompatibilidades, discrepâncias ou vieses de candidatura (como inflar competências de fachada que não se sustentam na experiência anterior do currículo, ou saltos injustificados de senioridade).
- Se houver clara incoerência ou incompatibilidade profissional (ex: histórico focado inteiramente em Design Gráfico se candidatando para Enfermagem de UTI, ou Engenheiro Mecânico para Desenvolvimento Full Stack Semelhante Sem Treinamento Prévio), notifique explicitamente esta incoerência nos comentários da avaliação geral e atribua marcas severas.`;

  return `Você é um Recrutador Sênior de elite e Revisor de Currículos Profissional parceiro da Dra. Ana Martins.
Sua missão é dar um feedback de profunda comparação técnica e comportamental, cruzando dinamicamente e interpretando a relação real entre o conteúdo do currículo enviado e as especificações da vaga de emprego (que podem não seguir uma estrutura padrão).
${customVacancyRule}

PROCESSO OBRIGATÓRIO DE ANÁLISE (Siga estes passos mentalmente antes de responder):
1. ANATOMIA DA VAGA (Do texto de 'Requisitos e Especificação da Vaga Alvo'):
   - Identifique o Título exato da vaga e a Senioridade real exigida.
   - Extraia as Competências Hard Skills essenciais (frameworks, ferramentas, certificações mandatórias, registros como COREN/CRM, idiomas).
   - Mapeie as Responsabilidades Críticas (o que a pessoa fará no dia a dia).

2. DESTRUTURAÇÃO DO CURRÍCULO (Do texto de 'cvText'):
   - Identifique o Cargo Atual/Último e a área real de dominância do candidato.
   - Isole o histórico real de projetos, conquistas quantificáveis e frameworks que ele *realmente praticou* no passado (ignore listas genéricas de "competências" no topo se elas não se traduzirem na descrição das experiências passadas).

3. MAPEAMENTO DE CONVERGÊNCIA E DIVERGÊNCIA LITERAS:
   - CONVERGENTES: Liste apenas onde há match exato. Se a vaga pede "React Native" e o CV comprova "2 anos com React Native", isto é convergência.
   - DIVERGENTES: Mapeie as ausências gritantes. Se a vaga exige "CI/CD com Jenkins" e o CV não cita nenhuma automação de deploy, ou se a vaga exige "Liderança de times" e o histórico do candidato é puramente técnico/executor, isole isso como divergência técnica ou de senioridade.

ATENÇÃO CRÍTICA (Análise Pragmática e Identificação de Incoerências/Discrepâncias):
- Realize uma comparação semântica e contextual direta entre as necessidades reais da vaga e a competência manifesta no currículo do candidato.
- Se o histórico dele não tiver aderência prática elementar às responsabilidades, habilidades fundamentais ou exigências legais da vaga (por exemplo: exigência de COREN ativo para enfermagem, CRM para medicina, ou linguagens de programação e infraestrutura para engenharia de software que estejam totalmente ausentes no currículo):
  1. A nota de aderência ('overallScore' e 'experienceMatch') deve ser severamente penalizada, não devendo ultrapassar 20.
  2. No campo 'generalAssessment', aponte de forma cirúrgica e transparente no início do texto a incoerência profissional detectada.
  3. Não tente criar conexões forçadas, analogias metafóricas ou justificativas complacentes caso as competências essenciais não constem na trajetória do candidato. É dever do recrutamento blindar o processo contra este viés.

Perfil do Candidato sob Análise:
- Área de Atuação: ${isCustom ? "Derivada da Vaga Customizada" : field}
- Nível de Experiência: ${isCustom ? "Derivado da Vaga Customizada" : experienceLevel}
- Idioma Escolhido: ${language} (${langPrompt})
- ${readingMethodPrompt}

${targetVacancyPrompt}

Conteúdo do Currículo:
---
${cvText}
---

Por favor, retorne uma resposta realista com as seguintes propriedades estruturadas:
1. 'overallScore': Inteiro de 0 a 100 indicando a real aderência curricular geral para a vaga alvo (com penalização severa se houver incompatibilidade de área ou histórico discrepante).
2. 'generalAssessment': Texto condensado (um parágrafo conciso com 3 a 5 linhas) contendo uma análise profunda e de cruzamento direto do documento de currículo frente ao escopo técnico, competências requisitadas e outros pontos mandatórios descritos na vaga, destacando diretamente pontos críticos, incoerência de senioridade ou limite imediato do candidato de forma explícita.
3. 'strengths': Lista com exatamente 2 a 3 strings detalhando pontos fortes reais do currículo frente às reais atribuições da vaga (se for incompatível, indique onde o currículo tem bases sólidas de sua própria área ou dê um feedback construtivo).
4. 'areasToImprove': Lista com exatamente 2 a 3 strings apontando debilidades explícitas e lacunas em comparação estrita com o texto e as demandas da vaga alvo.
5. 'recommendation': Frase curta sugerindo os próximos passos do currículo (ex: "Buscar certificação em X para atender os termos de conformidade de infraestrutura descritos na guia de requisitos da vaga").
6. 'identifiedVacancy': Uma string curta (de 2 a 4 palavras) identificando o título real do cargo da vaga (ex: "Analista de Negócios", "Enfermeiro UTI"). ATENÇÃO: Ignore textos institucionais, locais de trabalho ou palavras cortadas. Extraia puramente o nome da profissão/cargo descrito no texto.
7. 'identifiedCandidateRole': Uma string curta identificando o real cargo ou atual nível/área do candidato de acordo estritamente com o histórico que consta no seu currículo (ex: "Designer Gráfico Pleno" ou "Assistente de Enfermagem com foco pediátrico").
8. 'convergentPoints': Coleção exata de 2 a 4 strings contendo os pontos específicos onde o histórico do candidato bate perfeitamente com os requisitos extraídos da vaga (ex: ferramentas idênticas, escopo de responsabilidade similar ou conquistas na mesma área).
9. 'divergentPoints': Coleção exata de 2 a 4 strings descrevendo com precisão o que a vaga exige que o candidato simplesmente NÃO possui no currículo (ex: frameworks faltantes, falta de experiência com liderança exigida na vaga, desvio drástico de segmento de mercado).
10. 'competencies': Um objeto contendo notas inteiras de 0 a 100 para 5 competências do currículo:
   - 'communication': Qualidade da escrita e clareza da descrição das funções.
   - 'technical': Nível técnico para a vaga alvo (deve ser muito baixo se for incompatível com os termos descritos da vaga).
   - 'experienceMatch': Grau de aderência ao nível de experiência (${isCustom ? "derivada da vaga customizada" : experienceLevel}) e mercado da vaga alvo (deve ser muito baixo se o histórico do currículo for discrepante).
   - 'problemSolving': Descrição de entregas no currículo.
   - 'focusResults': Presença de conquistas reais no texto.

Retorne a resposta estritamente no formato JSON definido.`;
}