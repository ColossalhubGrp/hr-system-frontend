export interface User {
  user: string;
  name: string;
  email: string;
  roles: string[];
}

export interface JobPosting {
  name: string;
  job_title: string;
  job_description?: string;
  company?: string;
  posted_by?: string;
  status: "Draft" | "Open" | "Closed" | "Filled";
  job_match_score?: number;
  location?: string;
  experience_min_years?: number;
  education_required?: string;
  required_skills?: string;
  interview_questions?: string;
  posted_date?: string;
  total_applications?: number;
  shortlisted_count?: number;
}

export interface CandidateApplication {
  name: string;
  candidate_name?: string;
  email?: string;
  phone?: string;
  job_posting: string;
  job_title?: string;
  shortlist_status:
  | "Not Reviewed"
  | "Shortlisted"
  | "Interview Scheduled"
  | "Interviewed"
  | "Offered"
  | "Hired"
  | "Rejected";
  ai_score?: number;
  application_date?: string;
  shortlisted_at?: string;
  cv_attachment?: string;
  recommendation?: string;
  reasoning?: string;
  ai_bias_notes?: string;
  hr_decision?: string;
  manual_review_notes?: string;
  ai_analysis?: {
    skills_match_score?: number;
    skills_match_description?: string;
    experience_match_score?: number;
    experience_match_description?: string;
    education_match_score?: number;
    education_match_description?: string;
    overall_fit_score?: number;
    overall_fit_description?: string;
    key_strengths?: string[];
    potential_concerns?: string[];
    recommendation?: string;
    notes?: string;
  };
  ai_analysis_summary?: {
    skills_match?: { score?: number; description?: string };
    experience_match?: { score?: number; description?: string };
    education_match?: { score?: number; description?: string };
    overall_fit?: { score?: number; description?: string };
    key_strengths?: string[];
    potential_concerns?: string[];
    recommendation?: string;
    notes?: string;
  };
  parsed_cv_data?: {
    summary?: string;
    skills?: string[] | string;
    experience?: string;
    education?: string;
    career_highlights?: string[];
    [key: string]: unknown;
  };
}

export interface ShortlistedCandidate {
  candidate: string;
  candidate_name: string;
  email: string;
  phone?: string;
  ai_score: number;
  key_skills_matched?: string;
  education?: string;
  experience_match?: string;
  years_of_experience?: string;
  cv_summary?: string;
  recommendation?: string;
  ai_bias?: string;
  bias_evidence?: string;
  reasoning?: string;
  cv_attachment?: string;
  ai_analysis?: {
    skills_match_score?: number;
    skills_match_description?: string;
    experience_match_score?: number;
    experience_match_description?: string;
    education_match_score?: number;
    education_match_description?: string;
    overall_fit_score?: number;
    overall_fit_description?: string;
    key_strengths?: string[];
    potential_concerns?: string[];
    recommendation?: string;
    notes?: string;
  };
  ai_analysis_summary?: {
    skills_match?: { score?: number; description?: string };
    experience_match?: { score?: number; description?: string };
    education_match?: { score?: number; description?: string };
    overall_fit?: { score?: number; description?: string };
    key_strengths?: string[];
    potential_concerns?: string[];
    recommendation?: string;
    notes?: string;
  };
}

export interface ShortlistReport {
  name: string;
  report_name: string;
  job_posting: string;
  generated_by?: string;
  generated_at?: string;
  total_applications: number;
  shortlisted_count: number;
  report_summary?: string;
  shortlisted_candidates?: ShortlistedCandidate[];
  candidates?: ShortlistedCandidate[];
}

export const INTERVIEW_QUESTION_CATEGORIES = [
  "Technical / Functional Skills",
  "Behavioral",
  "Situational / Hypothetical",
  "Problem-Solving / Analytical",
  "Communication Skills",
  "Cultural Fit",
  "Experience Deep Dive",
  "Role-Specific Scenarios",
  "Adaptability & Learning",
  "Leadership / Ownership",
] as const;

export type InterviewQuestionCategory = (typeof INTERVIEW_QUESTION_CATEGORIES)[number];

export interface CategorizedQuestion {
  category: InterviewQuestionCategory;
  question: string;
}

export interface CategoryScore {
  score: number;
  comment: string;
}

export type CategoryScoreMap = Record<InterviewQuestionCategory, CategoryScore>;

export interface InterviewEvaluation {
  success?: boolean;
  overall_score?: number;
  category_scores?: Partial<CategoryScoreMap>;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: "Hire" | "Strong Hire" | "Reject" | "Maybe" | string;
  rationale?: string;
  score_adjustment_reason?: string;
  hr_alignment?: string;
  hr_insights?: string;
  confidence?: string | number;
}

export interface InterviewSession {
  duration_minutes: any;
  name: string;
  candidate_application: string;
  candidate_name: string;
  job_posting: string;
  job_title: string;
  session_id: string;
  status: "Scheduled" | "In Progress" | "Completed" | "Failed";
  creation?: string;
  started_at?: string;
  start_time?: string; // ISO string
  end_time?: string;   // ISO string, set when session is completed
  duration?: number;   // Duration in minutes (new, required)
  interviewer_notes?: string;
  ai_feedback?: string;
  recording_url?: string;
  transcript?: string;
  summary?: string;
  ai_evaluation?: InterviewEvaluation | string | null;
  hr_comment?: string;
  final_ai_evaluation?: InterviewEvaluation | string | null;
  score?: number;
  metadata?: any;
  // LiveKit Egress (server-side recording) state. Populated by the backend
  // egress webhook — the frontend only reads these fields.
  egress_id?: string | null;
  egress_status?: '' | 'Requested' | 'Active' | 'Ended' | 'Failed' | 'Aborted' | null;
  egress_started_at?: string | null;
  egress_ended_at?: string | null;
  egress_error?: string | null;
  // After auto-termination, status will be 'Completed' and end_time will be set
}

export interface Feedback {
  name: string;
  comment: string;
  user: string;
  user_full_name?: string;
  user_email?: string;
  user_role?: string;
  submitted_at?: string;
  status?: 'New' | 'Reviewed' | 'Resolved' | 'Dismissed';
  admin_notes?: string | null;
}

export interface CandidateProfile {
  name?: string;
  user: string;
  full_name?: string;
  phone?: string;
  headline?: string;
  location?: string;
  about?: string;
  skills?: string;
  preferences?: string;
  current_company?: string;
  current_title?: string;
  years_of_experience?: number | string;
  work_history?: string;
  education?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_links?: string;
  portfolio_url?: string;
  website_url?: string;
  profile_picture?: string;
  profile_image_url?: string;
  cv_url?: string;
  resume_url?: string;
  certifications?: string;
  career_passport?: string;
  [key: string]: any;
}

export interface CandidateAssessment {
  name: string;
  assessment_type: string;
  answers_json?: string;
  [key: string]: any;
}

export interface CandidateSavedSearch {
  name: string;
  query: string;
  location?: string | null;
  filters_json?: string | null;
}

export interface CandidateMessage {
  name: string;
  sender: string;
  recipient?: string;
  message: string;
  is_read?: number;
  job_posting?: string | null;
  creation?: string;
}

export interface CandidateInterview {
  name: string;
  candidate?: string;
  recruiter?: string;
  job_posting?: string;
  status?: string;
  scheduled_time?: string;
  interview_link?: string;
  [key: string]: any;
}

export interface EmployerProfile {
  name?: string;
  user: string;
  company_name?: string;
  description?: string;
  branding_story?: string;
  [key: string]: any;
}

export interface EmployerTeam {
  name: string;
  team_name: string;
  department?: string;
  manager?: string;
  positions?: string;
}

export interface CandidateSummary {
  candidate_name: string;
  total_applications: number;
  average_ai_score?: number;
  [key: string]: any;
}

export interface ApiResponse<T> {
  message?: T;
  exc?: string;
  success?: boolean;
}

