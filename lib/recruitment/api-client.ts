import type {
  User,
  JobPosting,
  CandidateApplication,
  ShortlistReport,
  InterviewSession,
  Feedback,
  ApiResponse,
  CandidateProfile,
  CandidateAssessment,
  CandidateSavedSearch,
  CandidateMessage,
  CandidateInterview,
  EmployerProfile,
  EmployerTeam,
  CandidateSummary,
  CategorizedQuestion
} from '@/lib/recruitment/types';
import { resolvePrimaryRole, resolveRoleFromHints } from './role-routing';
import { sanitizeUserFacingError } from './error-sanitizer';

/**
 * Reads the Frappe `user_id` cookie set by smart_hr_web's login flow. The
 * value is URL-encoded (Frappe encodes `@` etc.) so we decode before
 * returning. Returns null when not signed in or running on the server.
 */
function readUserIdCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith('user_id='));
  if (!match) return null;
  const raw = match.slice('user_id='.length);
  if (!raw || raw === 'Guest') return null;
  return safeDecode(raw);
}

/**
 * decodeURIComponent up to twice, stopping when the result no longer changes
 * or stops decoding cleanly. Smart_hr_web's login now writes single-encoded
 * cookies, but older sessions still in flight may carry double-encoded
 * values (`HR%2520Director`); this strips both layers transparently.
 */
function safeDecode(input: string): string {
  let current = input;
  for (let i = 0; i < 2; i++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return current;
    }
    if (next === current) return current;
    current = next;
  }
  return current;
}

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return '';
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  );
}

class ApiClient {
  private user: string | null = null;
  private unavailableMethods = new Set<string>();

  private getRawErrorMessage(error: unknown) {
    if (error instanceof Error) {
      const rawMessage = (error as Error & { rawMessage?: string }).rawMessage;
      if (typeof rawMessage === 'string' && rawMessage.trim()) {
        return rawMessage;
      }
      return error.message;
    }
    return String(error || '');
  }
  // ...existing code...

  /**
   * Makes a GET API call with query parameters (for wallet endpoints)
   */
  async getWithQuery<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    const query = new URLSearchParams();
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null) {
        query.append(key, String(params[key]));
      }
    }
    const url = `/api/frappe/${method}?${query.toString()}`;
    try {
      const response = await fetch(`${getBaseUrl()}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createUserFacingError(
          errorData.error || `API request failed: ${response.status}`,
          'Request failed. Please try again.'
        );
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error) {
        throw this.createUserFacingError(error, 'Request failed. Please try again.');
      }
      throw new Error('Unknown error occurred');
    }
  }

  private createUserFacingError(rawError: unknown, fallbackMessage: string) {
    const safeMessage = sanitizeUserFacingError(rawError, fallbackMessage);
    const error = new Error(safeMessage) as Error & { rawMessage?: string };
    const rawMessage = this.getRawErrorMessage(rawError);
    if (rawMessage) {
      error.rawMessage = rawMessage;
    }
    return error;
  }

  private isMissingCandidateProfileError(error: unknown) {
    const message = this.getRawErrorMessage(error);
    return message.includes('Candidate Profile') && message.toLowerCase().includes('not found');
  }

  private isMissingBackendMethodError(error: unknown, methodName: string) {
    const message = this.getRawErrorMessage(error);
    return message.includes(`has no attribute '${methodName}'`) || message.includes(`Failed to get method for command`) && message.includes(methodName);
  }

  private isMethodMarkedUnavailable(method: string) {
    return this.unavailableMethods.has(method);
  }

  constructor() {
    // No initialization needed - we'll read from storage on every call
  }

  /**
   * Gets the current user identity - always reads from storage
   */
  private getUser(): string | null {
    // The recruitment surfaces inside smart_hr_web identify the user
    // exclusively via the Frappe `user_id` cookie set by smart_hr_web's
    // sid-based login. We deliberately do NOT consult sessionStorage /
    // localStorage — those are client-trusted, never updated when the user
    // signs in via smart_hr_web, and would mask a logged-out state.
    return readUserIdCookie();
  }

  /**
   * Makes an API call through Next.js API route (BFF)
   * All requests are proxied server-side with environment credentials
   */
  async apiCall<T>(method: string, params: any = {}): Promise<T> {
    const userEmail = this.getUser();

    const methodsRequiringEmail = new Set([
      'recruitment_app.api.job_postings.get_job_postings',
      'recruitment_app.api.job_postings.get_job_posting',
      'recruitment_app.api.job_postings.create_job_posting',
      'recruitment_app.api.job_postings.update_job_posting',
      'recruitment_app.api.job_postings.delete_job_posting',
      'recruitment_app.api.candidate_applications.get_candidate_applications',
      'recruitment_app.api.candidate_applications.get_candidate_application',
      'recruitment_app.api.candidate_applications.upload_cv',
      'recruitment_app.api.candidate_applications.update_application_status',
      'recruitment_app.api.shortlisting.generate_shortlist_for_job',
      'recruitment_app.api.candidate_details.get_candidate_profile',
      'recruitment_app.api.candidate_details.get_candidate_application_details',
      'recruitment_app.api.candidate_details.update_application_status_and_questions',
      'recruitment_app.api.user_feedback.submit_feedback',
      'recruitment_app.api.user_feedback.get_all_feedback',
      'recruitment_app.api.user_feedback.get_feedback',
      'recruitment_app.api.user_feedback.update_feedback_status',
      'recruitment_app.api.user_feedback.get_my_feedback',
      'recruitment_app.api.user_feedback.get_feedback_stats',
      'recruitment_app.api.shortlisting.get_shortlist_reports',
      'recruitment_app.api.shortlisting.get_shortlist_report',
      'recruitment_app.api.interview_sessions.get_interview_sessions',
    ]);

    const needsEmail = methodsRequiringEmail.has(method);

    if (needsEmail && !userEmail) {
      throw new Error('User email is required. Please log in again.');
    }

    const methodParams = needsEmail
      ? { email: userEmail, ...params }
      : params;

    try {
      if (!method || typeof method !== 'string') {
        throw new Error('API method is required and must be a string');
      }
      // Encode method for URL safety (slashes etc)
      const encodedMethod = encodeURIComponent(method);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${getBaseUrl()}/api/frappe/${encodedMethod}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          params: methodParams,
          user: userEmail,
        }),
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createUserFacingError(
          errorData.error || `API request failed: ${response.status}`,
          'Request failed. Please try again.'
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw this.createUserFacingError(error, 'Request failed. Please try again.');
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Makes a guest-safe API call through Next.js API route (BFF)
   * Does not attach user identity so guest-allowed backend methods can pass through cleanly
   */
  async guestApiCall<T>(method: string, params: any = {}): Promise<T> {
    try {
      if (!method || typeof method !== 'string') {
        throw new Error('API method is required and must be a string');
      }

      const encodedMethod = encodeURIComponent(method);

      const response = await fetch(`${getBaseUrl()}/api/frappe/${encodedMethod}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Allow-Guest': 'true',
        },
        body: JSON.stringify({
          params,
        }),
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createUserFacingError(
          errorData.error || `API request failed: ${response.status}`,
          'Request failed. Please try again.'
        );
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error) {
        throw this.createUserFacingError(error, 'Request failed. Please try again.');
      }
      throw new Error('Unknown error occurred');
    }
  }

  private async publicGet<T>(url: string): Promise<T> {
    try {
      const response = await fetch(`${getBaseUrl()}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createUserFacingError(
          errorData.error || `API request failed: ${response.status}`,
          'Request failed. Please try again.'
        );
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error) {
        throw this.createUserFacingError(error, 'Request failed. Please try again.');
      }
      throw new Error('Unknown error occurred');
    }
  }

  // Authentication
  async login(email: string, password: string) {
    try {
      // Step 1 — /api/auth/login authenticates against Frappe and sets the
      // HttpOnly `sid` cookie + a few non-secret cookies (user_id, full_name,
      // user_image). The response body is intentionally minimal — { success,
      // email }. Role + profile come from step 2.
      const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createUserFacingError(
          errorData.error || 'Login failed',
          'Login failed. Please try again.'
        );
      }

      const result = await response.json();
      const payload = result.message ?? result;

      if (!payload.success) {
        return { success: false };
      }

      const emailValue = payload.email || email;
      this.user = emailValue;

      // Step 2 — bootstrap the session by calling the whitelisted helper
      // through the BFF. The BFF re-validates the sid server-side and
      // returns the user's Frappe roles. Anything we cache below is for
      // UX only (greeting, sidebar logo, picking the initial dashboard);
      // the server NEVER trusts these client-side values.
      let userRoles: string[] = [];
      let resolvedRole = 'hr';
      try {
        const meResponse = await fetch(
          `${getBaseUrl()}/api/frappe/recruitment_app.api.me.my_roles`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ params: {} }),
            credentials: 'same-origin',
          }
        );
        if (meResponse.ok) {
          const me = await meResponse.json();
          const messageBlock = me?.message ?? me;
          if (Array.isArray(messageBlock?.roles)) {
            userRoles = messageBlock.roles.map((r: any) => String(r));
          }
        }
      } catch {
        // Non-fatal — login still succeeded. UI just falls back to defaults.
      }

      resolvedRole = userRoles.length
        ? resolveRoleFromHints(userRoles)
        : resolvePrimaryRole([]);

      // No client-storage writes. The recruitment surfaces inside
      // smart_hr_web identify the user via the Frappe `user_id` cookie
      // smart_hr_web sets when forwarding the sid — that's the single
      // source of truth. Caching email / roles in sessionStorage,
      // localStorage or app_role cookies would mask the real auth state
      // (and silently keep someone "signed in" after logout).
      void resolvedRole;

      return { success: true, user: emailValue };
    } catch (error) {
      if (error instanceof Error) {
        throw this.createUserFacingError(error, 'Login failed. Please try again.');
      }
      throw new Error('Login failed');
    }
  }

  async register(
    email: string,
    password: string,
    full_name: string,
    company: string,
    phone?: string,
    account_type?: 'hr' | 'candidate' | 'employer'
  ) {
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name, company, phone, account_type }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw this.createUserFacingError(err.error || 'Registration failed', 'Registration failed. Please try again.');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error) throw this.createUserFacingError(error, 'Registration failed. Please try again.');
      throw new Error('Registration failed');
    }
  }

  async resendActivation(email: string) {
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/resend_activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw this.createUserFacingError(err.error || 'Resend activation failed', 'Resend activation failed. Please try again.');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error) throw this.createUserFacingError(error, 'Resend activation failed. Please try again.');
      throw new Error('Resend activation failed');
    }
  }

  async requestPasswordReset(email: string) {
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/request_password_reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw this.createUserFacingError(err.error || 'Password reset request failed', 'Password reset request failed. Please try again.');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error) throw this.createUserFacingError(error, 'Password reset request failed. Please try again.');
      throw new Error('Password reset request failed');
    }
  }

  async getCurrentUser() {
    return this.apiCall<User>('recruitment_app.api.auth.get_current_user');
  }

  async logout() {
    // Call server-side logout endpoint to end session, then clear client state
    try {
      await fetch(`${getBaseUrl()}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });
    } catch {
      // Continue with local cleanup even if server logout fails
    }

    this.user = null;
    // No client-storage cleanup. The auth state lives in the Frappe `sid` +
    // `user_id` cookies, which smart_hr_web's logout Server Action clears.
    // Touching localStorage / sessionStorage here would only create the
    // illusion of state we no longer trust.
  }

  isAuthenticated(): boolean {
    return !!this.getUser();
  }

  // Job Postings
  async publicGetAllJobs(limit_start = 0, limit_page_length = 20, status = 'Open') {
    const query = new URLSearchParams({
      limit_start: String(limit_start),
      limit_page_length: String(limit_page_length),
      status,
    });

    return this.publicGet<{
      jobs: JobPosting[];
      total: number;
      limit_start: number;
      limit_page_length: number;
    }>(`/api/public/jobs?${query.toString()}`);
  }

  async publicJobSearch(query: string, location?: string | null, limit_start = 0, limit_page_length = 20, status = 'Open') {
    const params = new URLSearchParams({
      query,
      limit_start: String(limit_start),
      limit_page_length: String(limit_page_length),
      status,
    });

    if (location) {
      params.set('location', location);
    }

    return this.publicGet<{
      jobs: JobPosting[];
      total: number;
      limit_start: number;
      limit_page_length: number;
    }>(`/api/public/jobs?${params.toString()}`);
  }

  async publicGetJob(jobPosting: string) {
    return this.publicGet<JobPosting>(`/api/public/jobs/${encodeURIComponent(jobPosting)}`);
  }

  async getJobPostings(status?: string, limit_start = 0, limit_page_length = 99999) {
    return this.apiCall<{
      data: JobPosting[];
      total: number;
    }>('recruitment_app.api.job_postings.get_job_postings', {
      status,
      limit_start,
      limit_page_length,
    });
  }

  async getJobPosting(name: string) {
    return this.apiCall<JobPosting>('recruitment_app.api.job_postings.get_job_posting', { name });
  }

  async createJobPosting(data: Partial<JobPosting>) {
    return this.apiCall<{ success: boolean; name: string }>(
      'recruitment_app.api.job_postings.create_job_posting',
      { data }
    );
  }

  async updateJobPosting(name: string, data: Partial<JobPosting>) {
    return this.apiCall<{ success: boolean; name: string }>(
      'recruitment_app.api.job_postings.update_job_posting',
      { name, data }
    );
  }

  async deleteJobPosting(name: string) {
    return this.apiCall<{ success: boolean }>(
      'recruitment_app.api.job_postings.delete_job_posting',
      { name }
    );
  }

  // Candidate Applications
  async getCandidateApplications(job_posting?: string, status?: string, limit_start = 0, limit_page_length = 99999) {
    return this.apiCall<{
      data: CandidateApplication[];
      total: number;
    }>('recruitment_app.api.candidate_applications.get_candidate_applications', {
      job_posting,
      status,
      limit_start,
      limit_page_length,
    });
  }

  async getCandidateApplication(name: string) {
    return this.apiCall<CandidateApplication>(
      'recruitment_app.api.candidate_applications.get_candidate_application',
      { name }
    );
  }

  async uploadCV(job_posting: string, file: File) {
    const user = this.getUser();

    // Step 1: Create the Candidate Application
    const createRes = await this.apiCall<{ name: string; candidate_name?: string; email?: string }>(
      'recruitment_app.api.candidate_applications.upload_cv',
      { job_posting }
    );

    const appName = createRes.name;
    if (!appName) throw new Error("Failed to create candidate application");

    // Step 2: Upload file to that application
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("attached_to_doctype", "Candidate Application");
    uploadData.append("attached_to_name", appName);
    uploadData.append("attached_to_field", "cv_attachment");
    uploadData.append("is_private", "0");
    if (user) {
      uploadData.append("user", user);
    }

    const uploadRes = await fetch(`${getBaseUrl()}/api/frappe/upload_file`, {
      method: 'PUT',
      body: uploadData,
      credentials: 'same-origin',
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json().catch(() => ({}));
      throw this.createUserFacingError(errorData.error || "File upload failed", "File upload failed. Please try again.");
    }

    const uploadResult = await uploadRes.json();
    const file_url = uploadResult.file_url;
    if (!file_url) throw new Error("File upload failed (no file_url returned)");

    // Step 3: Update the cv_attachment field on the Candidate Application
    await this.apiCall('frappe.client.set_value', {
      doctype: "Candidate Application",
      name: appName,
      fieldname: "cv_attachment",
      value: file_url,
    });

    return {
      success: true,
      name: appName,
      message: "CV uploaded successfully. Application Complete!",
      candidate_name: createRes.candidate_name || null,
      email: createRes.email || null,
    };
  }

  async uploadBulkCVs(job_posting: string, files: File[]) {
    if (!files.length) throw new Error("No files provided");

    const results: { fileName: string; success: boolean; error?: string }[] = [];
    const user = this.getUser();

    for (const file of files) {
      try {
        // Step 1: Create a Candidate Application
        const createRes = await this.apiCall<{ name: string }>(
          "recruitment_app.api.candidate_applications.upload_cv",
          { job_posting }
        );

        const appName = createRes.name;
        if (!appName) throw new Error("Failed to create candidate application");

        // Step 2: Upload the file
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("attached_to_doctype", "Candidate Application");
        uploadData.append("attached_to_name", appName);
        uploadData.append("attached_to_field", "cv_attachment");
        uploadData.append("is_private", "0");
        if (user) {
          uploadData.append("user", user);
        }

        const uploadRes = await fetch(`${getBaseUrl()}/api/frappe/upload_file`, {
          method: 'PUT',
          body: uploadData,
          credentials: 'same-origin',
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw this.createUserFacingError(errorData.error || "File upload failed", "File upload failed. Please try again.");
        }

        const uploadResult = await uploadRes.json();
        const file_url = uploadResult.file_url;
        if (!file_url) throw new Error("File upload failed (no file_url returned)");

        // Step 3: Update the cv_attachment field on the Candidate Application
        await this.apiCall("frappe.client.set_value", {
          doctype: "Candidate Application",
          name: appName,
          fieldname: "cv_attachment",
          value: file_url,
        });

        results.push({ fileName: file.name, success: true });
      } catch (err: any) {
        results.push({ fileName: file.name, success: false, error: err.message || String(err) });
      }
    }

    return results;
  }

  async updateApplicationStatus(
    name: string,
    status: string,
    interviewQuestions?: CategorizedQuestion[] | null,
    candidateEmail?: string,
    duration?: number
  ) {
    if (status === "Interview Scheduled" && !candidateEmail?.trim()) {
      throw new Error("Candidate email is required to send interview invitation")
    }

    const serializedQuestions =
      Array.isArray(interviewQuestions) && interviewQuestions.length > 0
        ? JSON.stringify(interviewQuestions)
        : null;

    const res = await this.apiCall<{
      success: boolean;
      interview_questions_count?: number;
      interview_questions_by_category?: Record<string, number>;
    }>(
      'recruitment_app.api.candidate_details.update_application_status_and_questions',
      {
        application_id: name,
        status,
        interview_questions: serializedQuestions,
        candidate_email: candidateEmail?.trim() || null,
        duration: duration || null,
      }
    );

    if (status === "Interview Scheduled") {
      await this.apiCall<{ success: boolean }>(
        'recruitment_app.api.interview_sessions.create_interview_session',
        { candidate_application: name, duration }
      );
    }

    return res;
  }

  private normalizeShortlistedCandidate(candidate: any) {
    if (!candidate || typeof candidate !== 'object') return candidate;

    return {
      ...candidate,
      bias_evidence: candidate.bias_evidence || candidate.ai_bias,
      recommendation:
        candidate.recommendation ||
        candidate.ai_analysis?.recommendation ||
        candidate.ai_analysis_summary?.recommendation,
      reasoning:
        candidate.reasoning ||
        candidate.ai_analysis?.overall_fit_description ||
        candidate.ai_analysis_summary?.overall_fit?.description,
    };
  }

  private normalizeShortlistReport(report: any): ShortlistReport {
    if (!report || typeof report !== 'object') {
      return report as ShortlistReport;
    }

    const sourceCandidates = Array.isArray(report.candidates)
      ? report.candidates
      : Array.isArray(report.shortlisted_candidates)
        ? report.shortlisted_candidates
        : [];

    const candidates = sourceCandidates.map((candidate: any) => this.normalizeShortlistedCandidate(candidate));

    return {
      ...report,
      shortlisted_candidates: candidates,
      candidates,
    } as ShortlistReport;
  }

  // Shortlisting
  async generateShortlist(job_posting_name: string) {
    return this.apiCall<{
      success: boolean;
      report_name?: string;
      shortlisted_count?: number;
      total_applications?: number;
      error?: string;
    }>('recruitment_app.api.shortlisting.generate_shortlist_for_job', {
      job_posting_name,
    });
  }

  async getShortlistReports(job_posting?: string, limit_start = 0, limit_page_length = 99999) {
    const response = await this.apiCall<{
      data: ShortlistReport[];
      total: number;
    }>('recruitment_app.api.shortlisting.get_shortlist_reports', {
      job_posting,
      limit_start,
      limit_page_length,
    });

    return {
      ...response,
      data: (response.data || []).map((report) => this.normalizeShortlistReport(report)),
    };
  }

  async getShortlistReport(name: string) {
    const report = await this.apiCall<ShortlistReport>(
      'recruitment_app.api.shortlisting.get_shortlist_report',
      { name }
    );

    return this.normalizeShortlistReport(report);
  }

  async deleteShortlistReport(name: string) {
    return this.apiCall<ShortlistReport>(
      'recruitment_app.api.shortlisting.delete_shortlist_report',
      { name }
    );
  }

  // Interview Sessions
  async getInterviewSessions(limit_start = 0, limit_page_length = 99999) {
    return this.apiCall<{
      data: InterviewSession[];
      total: number;
    }>('recruitment_app.api.interview_sessions.get_interview_sessions', {
      limit_start,
      limit_page_length,
    });
  }

  async getInterviewSession(name: string): Promise<InterviewSession> {
    const res = await this.guestApiCall<
      { success?: boolean; session?: InterviewSession } | InterviewSession
    >(
      'recruitment_app.api.interview_sessions.get_interview_session',
      { name }
    );

    const payload = res as any;
    if (payload?.session) {
      return payload.session as InterviewSession;
    }
    return payload as InterviewSession;
  }

  // async getInterviewSession(name: string) {
  //   const res = await this.apiCall<{ success?: boolean; session?: InterviewSession }>(
  //     'recruitment_app.api.interview_sessions.get_interview_session',
  //     { name }
  //   );

  //   // Some backend endpoints return a wrapper { success: true, session: {...} }
  //   // Normalize to return the InterviewSession object directly.
  //   if (res && typeof res === 'object' && 'session' in res && res.session) {
  //     return res.session as InterviewSession;
  //   }

  //   // Fallback: assume the response itself is the session
  //   return (res as unknown) as InterviewSession;
  // }

  async startInterviewSession(sessionId: string) {
    return this.guestApiCall<{
      success: boolean;
      message?: string;
      error?: string;
      session?: InterviewSession;
    }>('recruitment_app.api.interview_sessions.start_interview_session', {
      session_id: sessionId,
    });
  }

  // End Interview Session. NOTE: do NOT pass recording_url here — the backend
  // populates that field from the LiveKit egress webhook. Anything we send
  // would be silently overwritten.
  async endInterviewSession(sessionId: string, transcript?: string) {
    return this.guestApiCall<{
      success: boolean;
      message?: string;
      error?: string;
    }>('recruitment_app.api.interview_sessions.end_interview_session', {
      session_id: sessionId,
      transcript,
    });
  }

  // Start LiveKit Room Composite Egress for an interview. Called from the
  // candidate-side interview page once both the candidate's tracks AND the
  // agent participant are present in the room. Idempotent — repeated calls
  // for the same session return ALREADY_RUNNING with the existing egress_id.
  async startEgress(sessionId: string) {
    return this.guestApiCall<{
      success: boolean;
      egress_id?: string;
      session_id?: string;
      code?: 'ALREADY_RUNNING' | 'SESSION_NOT_FOUND' | 'PERMISSION_DENIED' | 'ROOM_NOT_FOUND' | 'LIVEKIT_ERROR';
      message?: string;
    }>('recruitment_app.api.interview_sessions.start_egress', {
      session_id: sessionId,
    });
  }

  // Stop egress. Only call this on abnormal termination (tab close, navigate
  // away, explicit cancel). On a normal interview end, the LiveKit room
  // closes on its own and egress auto-stops.
  async stopEgress(sessionId: string) {
    return this.guestApiCall<{
      success: boolean;
      egress_id?: string;
      session_id?: string;
      note?: string;
      code?: 'SESSION_NOT_FOUND' | 'PERMISSION_DENIED' | 'LIVEKIT_ERROR';
      message?: string;
    }>('recruitment_app.api.interview_sessions.stop_egress', {
      session_id: sessionId,
    });
  }

  // Get candidate profile by email
  async getCandidateProfile(email: string) {
    return this.apiCall<any>(
      'recruitment_app.api.candidate_details.get_candidate_profile',
      { candidate_email: email }
    );
  }

  // Get candidate application details by application ID
  async getCandidateApplicationDetails(applicationId: string) {
    return this.apiCall<any>(
      'recruitment_app.api.candidate_details.get_candidate_application_details',
      { application_id: applicationId }
    );
  }

  // HR/Internal - all candidates summary
  async getAllCandidatesSummary() {
    return this.apiCall<{ success: boolean; data: CandidateSummary[]; total_candidates?: number }>(
      'recruitment_app.api.candidate_details.get_all_candidates_summary',
      {}
    );
  }

  // Candidate - auth/core job flows
  async candidateGetJobPostings(limit_start = 0, limit_page_length = 20) {
    return this.apiCall<{ data: JobPosting[]; total: number }>(
      'recruitment_app.api.candidate_api.candidate_get_job_postings',
      { limit_start, limit_page_length }
    );
  }

  async candidateGetJobPosting(name: string) {
    return this.apiCall<JobPosting>(
      'recruitment_app.api.candidate_api.candidate_get_job_posting',
      { name }
    );
  }

  async candidateApply(
    jobPosting: string,
    candidateEmail: string,
    candidateName: string,
    phone: string,
    cvUrl?: string,
    detailsJson?: string
  ) {
    return this.apiCall<{ success: boolean; application_id?: string; error?: string }>(
      'recruitment_app.api.candidate_api.candidate_apply',
      {
        job_posting: jobPosting,
        candidate_email: candidateEmail,
        candidate_name: candidateName,
        phone,
        cv_url: cvUrl || null,
        details_json: detailsJson || null,
      }
    );
  }

  async publicCandidateApply(payload: {
    jobPosting: string;
    candidateEmail: string;
    candidateName: string;
    phone: string;
    cvUrl?: string | null;
    detailsJson?: string | null;
  }) {
    const response = await fetch(`${getBaseUrl()}/api/public/jobs/${encodeURIComponent(payload.jobPosting)}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate_email: payload.candidateEmail,
        candidate_name: payload.candidateName,
        phone: payload.phone,
        cv_url: payload.cvUrl || null,
        details_json: payload.detailsJson || null,
      }),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createUserFacingError(errorData.error || 'Application failed', 'Application failed. Please try again.');
    }

    return await response.json() as {
      success: boolean;
      application_id?: string;
      duplicate?: boolean;
      message?: string;
      error?: string;
    };
  }

  async publicUploadCandidateCv(file: File) {
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('is_private', '0');

    const uploadRes = await fetch(`${getBaseUrl()}/api/public/upload_file`, {
      method: 'PUT',
      body: uploadData,
      credentials: 'same-origin',
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json().catch(() => ({}));
      throw this.createUserFacingError(errorData.error || 'CV upload failed', 'CV upload failed. Please try again.');
    }

    const uploadResult = await uploadRes.json();
    const fileUrl = uploadResult.file_url as string | undefined;
    if (!fileUrl) {
      throw new Error('CV upload failed (no file_url returned)');
    }

    return { file_url: fileUrl };
  }

  async candidateApplicationStatus(candidateEmail: string) {
    return this.apiCall<{ applications: CandidateApplication[] }>(
      'recruitment_app.api.candidate_api.candidate_application_status',
      { candidate_email: candidateEmail }
    );
  }

  // Candidate - profile
  async getCandidateSelfProfile(user: string) {
    return this.apiCall<CandidateProfile>(
      'recruitment_app.api.candidate_profile_api.get_candidate_profile',
      { user }
    );
  }

  async updateCandidateSelfProfile(payload: Partial<CandidateProfile> & { user: string }) {
    return this.apiCall<{ success: boolean; profile: CandidateProfile }>(
      'recruitment_app.api.candidate_profile_api.update_candidate_profile',
      payload
    );
  }

  async buildAiResume(user: string) {
    return this.apiCall<{
      success: boolean;
      ai_resume?: string;
      can_generate?: boolean;
      message?: string;
      missing_fields?: Array<{ fieldname: string; label: string }>;
      missing_field_labels?: string[];
    }>(
      'recruitment_app.api.candidate_profile_api.build_ai_resume',
      { user }
    );
  }

  async updateCareerPassport(user: string, skillsJson: string) {
    return this.apiCall<{ success: boolean; career_passport?: string }>(
      'recruitment_app.api.candidate_profile_api.update_career_passport',
      { user, skills_json: skillsJson }
    );
  }

  async uploadCandidateCv(file: File) {
    const user = this.getUser();
    if (!user) {
      throw new Error('User email is required. Please log in again.');
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('is_private', '0');
    uploadData.append('user', user);

    const uploadRes = await fetch(`${getBaseUrl()}/api/frappe/upload_file`, {
      method: 'PUT',
      body: uploadData,
      credentials: 'same-origin',
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json().catch(() => ({}));
      throw this.createUserFacingError(errorData.error || 'CV upload failed', 'CV upload failed. Please try again.');
    }

    const uploadResult = await uploadRes.json();
    const fileUrl = uploadResult.file_url as string | undefined;
    if (!fileUrl) {
      throw new Error('CV upload failed (no file_url returned)');
    }

    return { file_url: fileUrl };
  }

  async uploadCandidateProfileImage(file: File) {
    const user = this.getUser();
    if (!user) {
      throw new Error('User email is required. Please log in again.');
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('is_private', '0');
    uploadData.append('user', user);

    const uploadRes = await fetch(`${getBaseUrl()}/api/frappe/upload_file`, {
      method: 'PUT',
      body: uploadData,
      credentials: 'same-origin',
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json().catch(() => ({}));
      throw this.createUserFacingError(errorData.error || 'Profile image upload failed', 'Profile image upload failed. Please try again.');
    }

    const uploadResult = await uploadRes.json();
    const fileUrl = uploadResult.file_url as string | undefined;
    if (!fileUrl) {
      throw new Error('Profile image upload failed (no file_url returned)');
    }

    return { file_url: fileUrl };
  }

  // Candidate - extras
  async candidateJobSearchBasic(query: string, limit_start = 0, limit_page_length = 10) {
    return this.apiCall<{ jobs: JobPosting[] }>(
      'recruitment_app.api.candidate_extras_api.candidate_job_search',
      { query, limit_start, limit_page_length }
    );
  }

  async candidateJobRecommendationsBasic(user: string, limit = 5) {
    return this.apiCall<{ recommended_jobs: JobPosting[] }>(
      'recruitment_app.api.candidate_extras_api.candidate_job_recommendations',
      { user, limit }
    );
  }

  async candidateSubmitAssessment(user: string, assessmentType: string, answersJson: string) {
    return this.apiCall<{ success: boolean; assessment_id?: string }>(
      'recruitment_app.api.candidate_extras_api.candidate_submit_assessment',
      { user, assessment_type: assessmentType, answers_json: answersJson }
    );
  }

  async candidateGetAssessments(user: string) {
    return this.apiCall<{ assessments: CandidateAssessment[] }>(
      'recruitment_app.api.candidate_extras_api.candidate_get_assessments',
      { user }
    );
  }

  async getAssessmentFeedback(assessmentId: string) {
    return this.apiCall<{ assessment_id: string; feedback: string }>(
      'recruitment_app.api.candidate_extras_api.get_assessment_feedback',
      { assessment_id: assessmentId }
    );
  }

  async matchCareerPaths(user: string) {
    return this.apiCall<{ user: string; career_paths?: string }>(
      'recruitment_app.api.candidate_extras_api.match_career_paths',
      { user }
    );
  }

  // Candidate - AI search and matching
  async candidateGetAllJobs(limit_start = 0, limit_page_length = 220, status = 'Open') {
    const preferredMethod = 'recruitment_app.api.candidate_job_search_ai.candidate_get_all_jobs';

    if (this.isMethodMarkedUnavailable(preferredMethod)) {
      const fallback = await this.candidateGetJobPostings(limit_start, limit_page_length);
      const normalizedStatus = status?.toLowerCase();
      const filteredJobs = normalizedStatus
        ? (fallback.data || []).filter((job) => (job.status || '').toLowerCase() === normalizedStatus)
        : (fallback.data || []);

      return {
        jobs: filteredJobs,
        total: filteredJobs.length,
      };
    }

    try {
      return await this.apiCall<{ jobs: JobPosting[]; total: number }>(
        preferredMethod,
        { limit_start, limit_page_length, status }
      );
    } catch (error) {
      if (!this.isMissingBackendMethodError(error, 'candidate_get_all_jobs')) {
        throw error;
      }

      this.unavailableMethods.add(preferredMethod);

      const fallback = await this.candidateGetJobPostings(limit_start, limit_page_length);
      const normalizedStatus = status?.toLowerCase();
      const filteredJobs = normalizedStatus
        ? (fallback.data || []).filter((job) => (job.status || '').toLowerCase() === normalizedStatus)
        : (fallback.data || []);

      return {
        jobs: filteredJobs,
        total: filteredJobs.length,
      };
    }
  }

  async candidateJobSearchAi(query: string, location?: string | null, filtersJson?: string | null, limit_start = 0, limit_page_length = 10) {
    return this.apiCall<{ jobs: JobPosting[] }>(
      'recruitment_app.api.candidate_job_search_ai.candidate_job_search',
      { query, location: location || null, filters_json: filtersJson || null, limit_start, limit_page_length }
    );
  }

  async candidateSaveSearch(user: string, query: string, location?: string | null, filtersJson?: string | null) {
    return this.apiCall<{ success: boolean; search_id?: string }>(
      'recruitment_app.api.candidate_job_search_ai.candidate_save_search',
      { user, query, location: location || null, filters_json: filtersJson || null }
    );
  }

  async candidateGetSavedSearches(user: string) {
    return this.apiCall<{ saved_searches: CandidateSavedSearch[] }>(
      'recruitment_app.api.candidate_job_search_ai.candidate_get_saved_searches',
      { user }
    );
  }

  async candidateSimilarJobs(jobPosting: string) {
    return this.apiCall<{ similar_jobs: JobPosting[] }>(
      'recruitment_app.api.candidate_job_search_ai.candidate_similar_jobs',
      { job_posting: jobPosting }
    );
  }

  async candidateAiJobRecommendations(user: string, limit = 5) {
    try {
      return await this.apiCall<{ recommended_jobs: JobPosting[] }>(
        'recruitment_app.api.candidate_job_search_ai.candidate_ai_job_recommendations',
        { user, limit }
      );
    } catch (error) {
      if (this.isMissingCandidateProfileError(error)) {
        return { recommended_jobs: [] };
      }
      throw error;
    }
  }

  async candidateAiMatch(user: string, jobPosting: string) {
    return this.apiCall<any>(
      'recruitment_app.api.candidate_ai_matching.candidate_ai_match',
      { user, job_posting: jobPosting }
    );
  }

  async candidateResumeScreening(user: string, jobPosting: string) {
    return this.apiCall<any>(
      'recruitment_app.api.candidate_ai_matching.candidate_resume_screening',
      { user, job_posting: jobPosting }
    );
  }

  async candidateRanking(jobPosting: string) {
    return this.apiCall<any>(
      'recruitment_app.api.candidate_ai_matching.candidate_ranking',
      { job_posting: jobPosting }
    );
  }

  // Candidate - messages and interviews
  async sendCandidateMessage(sender: string, recipient: string, message: string, jobPosting?: string) {
    return this.apiCall<{ success: boolean; message_id?: string }>(
      'recruitment_app.api.candidate_message_api.send_candidate_message',
      { sender, recipient, message, job_posting: jobPosting || null }
    );
  }

  async getCandidateMessages(user: string, jobPosting?: string) {
    return this.apiCall<{ messages: CandidateMessage[] }>(
      'recruitment_app.api.candidate_message_api.get_candidate_messages',
      { user, job_posting: jobPosting || null }
    );
  }

  async markCandidateMessageRead(messageId: string) {
    return this.apiCall<{ success: boolean }>(
      'recruitment_app.api.candidate_message_api.mark_message_read',
      { message_id: messageId }
    );
  }

  async scheduleCandidateInterview(candidate: string, recruiter: string, jobPosting: string, scheduledTime: string, interviewLink: string) {
    return this.apiCall<{ success: boolean; interview_id?: string }>(
      'recruitment_app.api.candidate_interview_api.schedule_candidate_interview',
      {
        candidate,
        recruiter,
        job_posting: jobPosting,
        scheduled_time: scheduledTime,
        interview_link: interviewLink,
      }
    );
  }

  async getCandidateInterviews(user: string, jobPosting?: string) {
    return this.apiCall<{ interviews: CandidateInterview[] }>(
      'recruitment_app.api.candidate_interview_api.get_candidate_interviews',
      { user, job_posting: jobPosting || null }
    );
  }

  async updateCandidateInterviewStatus(interviewId: string, status: string) {
    return this.apiCall<{ success: boolean }>(
      'recruitment_app.api.candidate_interview_api.update_interview_status',
      { interview_id: interviewId, status }
    );
  }

  // Employer
  async getEmployerProfile(user: string) {
    return this.apiCall<EmployerProfile>(
      'recruitment_app.api.employer_profile_api.get_employer_profile',
      { user }
    );
  }

  async updateEmployerProfile(payload: Partial<EmployerProfile> & { user: string }) {
    return this.apiCall<{ success: boolean; profile: EmployerProfile }>(
      'recruitment_app.api.employer_profile_api.update_employer_profile',
      payload
    );
  }

  async getEmployerAnalytics(user: string) {
    return this.apiCall<any>(
      'recruitment_app.api.employer_branding_analytics_api.get_employer_analytics',
      { user }
    );
  }

  async getEmployerBranding(user: string) {
    return this.apiCall<any>(
      'recruitment_app.api.employer_branding_analytics_api.get_employer_branding',
      { user }
    );
  }

  async getEmployerTeams(employer: string) {
    return this.apiCall<{ teams: EmployerTeam[] }>(
      'recruitment_app.api.employer_team_api.get_employer_teams',
      { employer }
    );
  }

  async addEmployerTeam(employer: string, teamName: string, department?: string, manager?: string, positions?: string) {
    return this.apiCall<{ success: boolean; team_id?: string }>(
      'recruitment_app.api.employer_team_api.add_employer_team',
      {
        employer,
        team_name: teamName,
        department: department || null,
        manager: manager || null,
        positions: positions || null,
      }
    );
  }

  async updateEmployerTeam(teamId: string, payload: Partial<EmployerTeam>) {
    return this.apiCall<{ success: boolean; team?: EmployerTeam }>(
      'recruitment_app.api.employer_team_api.update_employer_team',
      {
        team_id: teamId,
        ...payload,
      }
    );
  }

  // User Feedback
  async submitFeedback(comment: string) {
    return this.apiCall<{ success: boolean; message?: string; data?: any }>(
      'recruitment_app.api.user_feedback.submit_feedback',
      { comment }
    );
  }

  async getMyFeedback(limit_start = 0, limit_page_length = 99999) {
    return this.apiCall<{ data: Feedback[]; total: number }>(
      'recruitment_app.api.user_feedback.get_my_feedback',
      { limit_start, limit_page_length }
    );
  }

  async getAllFeedback(status?: string, user?: string, limit_start = 0, limit_page_length = 99999) {
    return this.apiCall<{ data: Feedback[]; total: number }>(
      'recruitment_app.api.user_feedback.get_all_feedback',
      { status, user, limit_start, limit_page_length }
    );
  }

  async updateFeedbackStatus(name: string, status: string, admin_notes?: string) {
    return this.apiCall<{ success: boolean; message?: string }>(
      'recruitment_app.api.user_feedback.update_feedback_status',
      { name, status, admin_notes }
    );
  }

  async getFeedbackStats() {
    return this.apiCall<{ new: number; reviewed: number; resolved: number; dismissed: number }>(
      'recruitment_app.api.user_feedback.get_feedback_stats',
      {}
    );
  }

  // Update manual review notes on candidate application
  async updateManualReviewNotes(applicationId: string, reviewText: string) {
    const user = this.getUser();
    return this.apiCall<{ success: boolean; message?: string; application_id?: string; reviewed_by?: string; timestamp?: string }>(
      'recruitment_app.api.candidate_details.update_manual_review_notes',
      { email: user, application_id: applicationId, review_text: reviewText }
    );
  }

  // Rerun shortlisting for a job posting
  async rerunShortlistForJob(jobPostingName: string, includeAll: boolean = true, resetReport: boolean = true) {
    const user = this.getUser();
    return this.apiCall<{ success: boolean; message?: string; error?: string; data?: any }>(
      'recruitment_app.api.shortlisting.rerun_shortlist_for_job',
      {
        email: user,
        job_posting_name: jobPostingName,
        include_all: includeAll ? 1 : 0,
        reset_report: resetReport ? 1 : 0
      }
    );
  }

  // ─── Billing (interview + CV evaluation quotas) ────────────────────────────

  async getBillingSummary() {
    const user = this.getUser();
    const res = await this.apiCall<any>(
      'recruitment_app.api.billing_admin_api.get_billing_summary',
      { user }
    );
    return (res?.message ?? res) as BillingSummary;
  }

  async getBillingAnalytics(range: BillingRange = 'period') {
    const user = this.getUser();
    const res = await this.apiCall<any>(
      'recruitment_app.api.billing_admin_api.get_billing_analytics',
      { user, range }
    );
    return (res?.message ?? res) as BillingAnalytics;
  }
}

// ─── Billing types ─────────────────────────────────────────────────────────

export type BillingRange = 'period' | '7d' | '30d' | 'all'

export interface BillingActivity {
  id: string
  subject: string
  detail?: string
  when: string
  delta_interviews?: number
  delta_cvs?: number
}

export interface BillingPlan {
  name: string
  period: string
  renewed_at: string
  next_renewal: string
  interviews: { bought: number; used: number }
  cvs: { bought: number; used: number }
}

export interface BillingSummary {
  plan: BillingPlan
  recent_activity: BillingActivity[]
}

export interface BillingJobUsage {
  id: string
  title: string
  interviews: number
  cvs: number
}

export interface BillingDailyUsage {
  date: string
  interviews: number
  cvs: number
}

export interface BillingAnalytics {
  period: { start: string; end: string }
  totals: { interviews_used: number; cvs_used: number; active_days: number }
  daily_usage: BillingDailyUsage[]
  usage_by_job: BillingJobUsage[]
  activity: BillingActivity[]
}

export const apiClient = new ApiClient();