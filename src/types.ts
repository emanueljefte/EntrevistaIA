export interface InterviewConfig {
  apiKey: string;
  field: string; // e.g., "Tech", "Negócios", "Design", "Marketing"
  experienceLevel: string; // e.g., "Júnior", "Pleno", "Sênior", "Especialista/Lead"
  language: string; // e.g., "Português", "Inglês"
  cvText: string;
  cvFileName?: string;
  analysisMethod?: string; // "ats" | "profile" | "feedback" | "patterns"
  jobRequirements?: string;
  onlyCvAnalysis?: boolean;
}

export interface Message {
  id: string;
  role: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
}

export interface InterviewEvaluation {
  overallScore: number;
  generalAssessment: string;
  strengths: string[];
  areasToImprove: string[];
  recommendation: string;
  identifiedVacancy?: string;
  identifiedCandidateRole?: string;
  convergentPoints?: string[];
  divergentPoints?: string[];
  cvScore?: number;
  cvAssessment?: string;
  interviewScore?: number;
  interviewAssessment?: string;
  competencies?: {
    communication: number;
    technical: number;
    problemSolving: number;
    experienceMatch: number;
    focusResults: number;
  };
}

export interface InterviewSession {
  id: string;
  date: string;
  config: InterviewConfig;
  questions: string[];
  answers: string[];
  chatHistory: Message[];
  evaluation?: InterviewEvaluation;
}
