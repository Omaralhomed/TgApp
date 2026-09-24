import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('tg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Response interceptor for refresh token rotation with race condition prevention
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Skip interceptor for authentication endpoints
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/register')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Enqueue concurrent requests while token is refreshing
        return new Promise<any>((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('tg_refresh_token');
        if (!refreshToken) {
          isRefreshing = false;
          processQueue(error, null);
          return Promise.reject(error);
        }

        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data?.accessToken;
          const newRefreshToken = res.data?.refreshToken;

          if (newAccessToken) {
            localStorage.setItem('tg_token', newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('tg_refresh_token', newRefreshToken);
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            processQueue(null, newAccessToken);
            return api(originalRequest);
          } else {
            throw new Error('No access token returned');
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('tg_token');
          localStorage.removeItem('tg_refresh_token');
          localStorage.removeItem('tg_user');
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(error);
  },
);

// -------------------------------------------------------------
// Auth API
// -------------------------------------------------------------
export const loginUser = (data: { email: string; password: string }) =>
  api.post('/auth/login', data).then((res) => {
    if (res.data?.accessToken && typeof window !== 'undefined') {
      localStorage.setItem('tg_token', res.data.accessToken);
      localStorage.setItem('tg_refresh_token', res.data.refreshToken);
      localStorage.setItem('tg_user', JSON.stringify(res.data.user));
    }
    return res.data;
  });

export const registerUser = (data: { email: string; password: string; name?: string; orgName?: string }) =>
  api.post('/auth/register', data).then((res) => {
    if (res.data?.accessToken && typeof window !== 'undefined') {
      localStorage.setItem('tg_token', res.data.accessToken);
      localStorage.setItem('tg_refresh_token', res.data.refreshToken);
      localStorage.setItem('tg_user', JSON.stringify(res.data.user));
    }
    return res.data;
  });

export const getProfile = () => api.get('/auth/profile').then((res) => res.data);

export const logoutUser = () => {
  if (typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('tg_refresh_token');
    api.post('/auth/logout', { refreshToken }).catch(() => {});
    localStorage.removeItem('tg_token');
    localStorage.removeItem('tg_refresh_token');
    localStorage.removeItem('tg_user');
  }
};

export const revokeAllSessions = () => api.post('/auth/revoke-all').then((res) => res.data);

// -------------------------------------------------------------
// Accounts API
// -------------------------------------------------------------
export const getAccounts = () => api.get('/accounts').then((res) => res.data);
export const getAccountDetails = (id: string) => api.get(`/accounts/${id}`).then((res) => res.data);
export const initiateAuth = (data: { phone: string; apiId?: number; apiHash?: string; proxyId?: string }) =>
  api.post('/accounts/initiate-auth', data).then((res) => res.data);
export const verifyAuth = (data: { phone: string; code: string; password2FA?: string }) =>
  api.post('/accounts/verify-auth', data).then((res) => res.data);
export const checkAccount = (id: string) => api.post(`/accounts/${id}/health-check`).then((res) => res.data);
export const syncAllHealth = () => api.post('/accounts/sync-all-health').then((res) => res.data);
export const updateAccount = (id: string, data: { dailyLimit?: number; warmupMode?: boolean; proxyId?: string | null }) =>
  api.put(`/accounts/${id}`, data).then((res) => res.data);
export const deleteAccount = (id: string) => api.delete(`/accounts/${id}`).then((res) => res.data);

// -------------------------------------------------------------
// Scraper API
// -------------------------------------------------------------
export const getGroups = () => api.get('/scraper/groups').then((res) => res.data);
export const getGroupMembers = (
  groupId: string,
  params?: { activeOnly?: boolean; hasUsernameOnly?: boolean; excludeBots?: boolean; search?: string; page?: number; limit?: number },
) => api.get(`/scraper/groups/${groupId}/members`, { params }).then((res) => res.data);
export const scrapeGroup = (data: { accountId: string; groupTarget: string; limit?: number }) =>
  api.post('/scraper/scrape', data).then((res) => res.data);
export const importLeads = (data: {
  title: string;
  members: Array<{ username?: string; firstName?: string; lastName?: string; phone?: string }>;
}) => api.post('/scraper/import-leads', data).then((res) => res.data);
export const deleteGroup = (id: string) => api.delete(`/scraper/groups/${id}`).then((res) => res.data);
export const deleteMember = (id: string) => api.delete(`/scraper/members/${id}`).then((res) => res.data);

// -------------------------------------------------------------
// Campaigns API
// -------------------------------------------------------------
export const getCampaigns = () => api.get('/campaigns').then((res) => res.data);
export const getCampaignDetails = (id: string) => api.get(`/campaigns/${id}`).then((res) => res.data);
export const createCampaign = (data: {
  name: string;
  messageTemplate: string;
  groupId?: string;
  customTargetUserIds?: string[];
  delayMinSeconds?: number;
  delayMaxSeconds?: number;
  policyConfig?: any;
}) => api.post('/campaigns', data).then((res) => res.data);
export const startCampaign = (id: string) => api.post(`/campaigns/${id}/start`).then((res) => res.data);
export const pauseCampaign = (id: string) => api.post(`/campaigns/${id}/pause`).then((res) => res.data);
export const deleteCampaign = (id: string) => api.delete(`/campaigns/${id}`).then((res) => res.data);
export const testSpintax = (template: string, mockData?: { firstName?: string; username?: string }) =>
  api.post('/campaigns/test-spintax', { template, mockData }).then((res) => res.data);

// -------------------------------------------------------------
// Adder API (Automation)
// -------------------------------------------------------------
export const getAddTasks = () => api.get('/adder').then((res) => res.data);
export const getAddTaskDetails = (id: string) => api.get(`/adder/${id}`).then((res) => res.data);
export const createAddTask = (data: {
  name: string;
  sourceGroupId?: string;
  targetGroup: string;
  delayMinSeconds?: number;
  delayMaxSeconds?: number;
}) => api.post('/adder', data).then((res) => res.data);
export const startAddTask = (id: string) => api.post(`/adder/${id}/start`).then((res) => res.data);
export const pauseAddTask = (id: string) => api.post(`/adder/${id}/pause`).then((res) => res.data);
export const deleteAddTask = (id: string) => api.delete(`/adder/${id}`).then((res) => res.data);

// -------------------------------------------------------------
// Proxies API
// -------------------------------------------------------------
export const getProxies = () => api.get('/proxies').then((res) => res.data);
export const addProxy = (data: { host: string; port: number; protocol?: string; username?: string; password?: string }) =>
  api.post('/proxies', data).then((res) => res.data);
export const addBulkProxies = (proxies: Array<{ host: string; port: number; protocol?: string; username?: string; password?: string }>) =>
  api.post('/proxies/bulk', { proxies }).then((res) => res.data);
export const testProxy = (id: string) => api.post(`/proxies/${id}/test`).then((res) => res.data);
export const testAllProxies = () => api.post('/proxies/test-all').then((res) => res.data);
export const deleteProxy = (id: string) => api.delete(`/proxies/${id}`).then((res) => res.data);

// -------------------------------------------------------------
// Audit & System Health API
// -------------------------------------------------------------
export const getAuditLogs = (limit: number = 50) => api.get(`/audit/logs?limit=${limit}`).then((res) => res.data);
export const getSystemEvents = (limit: number = 50) => api.get(`/audit/system-events?limit=${limit}`).then((res) => res.data);
export const getSystemHealth = () => api.get('/health').then((res) => res.data);
export const getSystemMetrics = () => api.get('/health/metrics').then((res) => res.data);

// -------------------------------------------------------------
// AI & Interactive Operations Bot API
// -------------------------------------------------------------
export const generateAiSpintax = (data: {
  niche?: string;
  productName?: string;
  tone?: 'urgency' | 'professional' | 'casual' | 'vip';
  includeOffer?: boolean;
  ctaLink?: string;
}) => api.post('/ai/generate-spintax', data).then((res) => res.data);

export const executeAiBotAction = (data: {
  action: 'QUICK_STATUS' | 'GENERATE_SPINTAX' | 'CHECK_HEALTH' | 'PAUSE_CAMPAIGN' | 'RESUME_CAMPAIGN' | 'QUICK_LAUNCH';
  payload?: any;
}) => api.post('/ai/execute-action', data).then((res) => res.data);

// -------------------------------------------------------------
// Official Telegram Bot API Suite
// -------------------------------------------------------------
export const getBots = () => api.get('/bots').then((res) => res.data);
export const getBotDetails = (id: string) => api.get(`/bots/${id}`).then((res) => res.data);
export const connectBot = (data: { token: string; welcomeMessage?: string; autoReplyRules?: any }) =>
  api.post('/bots/connect', data).then((res) => res.data);
export const updateBot = (id: string, data: { welcomeMessage?: string; autoReplyRules?: any; isActive?: boolean }) =>
  api.put(`/bots/${id}`, data).then((res) => res.data);
export const deleteBot = (id: string) => api.delete(`/bots/${id}`).then((res) => res.data);
export const getBotSubscribers = (id: string) => api.get(`/bots/${id}/subscribers`).then((res) => res.data);
export const createBotBroadcast = (id: string, data: { messageText: string; buttons?: any; mediaUrl?: string }) =>
  api.post(`/bots/${id}/broadcast`, data).then((res) => res.data);
export const getBotBroadcasts = (id: string) => api.get(`/bots/${id}/broadcasts`).then((res) => res.data);

// -------------------------------------------------------------
// SuperAdmin & Command Center API
// -------------------------------------------------------------
export const getAdminOverview = () => api.get('/admin/overview').then((res) => res.data);
export const getAdminTenants = (search?: string, tier?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (tier) params.append('tier', tier);
  return api.get(`/admin/tenants?${params.toString()}`).then((res) => res.data);
};
export const updateAdminTenantStatus = (id: string, isActive: boolean) =>
  api.put(`/admin/tenants/${id}/status`, { isActive }).then((res) => res.data);
export const updateAdminTenantPlan = (id: string, data: { subscriptionTier?: string; quotaMessagesLimit?: number; quotaAccountsLimit?: number; extendDays?: number }) =>
  api.put(`/admin/tenants/${id}/plan`, data).then((res) => res.data);
export const impersonateTenant = (id: string) =>
  api.post(`/admin/tenants/${id}/impersonate`).then((res) => res.data);
export const getAdminPayments = (status?: string) => {
  const params = status ? `?status=${status}` : '';
  return api.get(`/admin/payments${params}`).then((res) => res.data);
};
export const approveAdminPayment = (id: string) =>
  api.post(`/admin/payments/${id}/approve`).then((res) => res.data);
export const rejectAdminPayment = (id: string, reason?: string) =>
  api.post(`/admin/payments/${id}/reject`, { reason }).then((res) => res.data);
export const triggerAdminCircuitBreaker = (enable: boolean) =>
  api.post('/admin/circuit-breaker', { enable }).then((res) => res.data);
export const getAdminQueues = () => api.get('/admin/queues').then((res) => res.data);
export const retryAdminFailedJobs = () => api.post('/admin/queues/retry-failed').then((res) => res.data);

// -------------------------------------------------------------
// Billing, Invoices & Manual Payments API
// -------------------------------------------------------------
export const getBillingMethods = () => api.get('/billing/methods').then((res) => res.data);
export const getBillingPlans = () => api.get('/billing/plans').then((res) => res.data);
export const getBillingOverview = () => api.get('/billing/overview').then((res) => res.data);
export const createBillingOrder = (data: {
  planRequested: string;
  durationMonths?: number;
  paymentMethod: string;
  amountPaid: number;
  currency?: string;
  transactionReference?: string;
  receiptImageUrl?: string;
  notes?: string;
}) => api.post('/billing/orders', data).then((res) => res.data);

export const submitBillingReceipt = (data: {
  orderId: string;
  transactionReference: string;
  receiptImageUrl: string;
  userNotes?: string;
}) => api.post('/billing/submit-receipt', data).then((res) => res.data);

export const uploadReceiptFile = (file: File) => {
  const formData = new FormData();
  formData.append('receipt', file);
  return api
    .post('/billing/upload-receipt-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

// -------------------------------------------------------------
// Media & Cloud Storage API
// -------------------------------------------------------------
export const uploadMediaFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api
    .post('/storage/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

// -------------------------------------------------------------
// CRM & Data Export Helpers
// -------------------------------------------------------------
export const exportGroupMembersCsv = (groupId: string) =>
  api.get(`/scraper/groups/${groupId}/export-csv`).then((res) => res.data);

export const exportBotSubscribersCsv = (botId: string) =>
  api.get(`/bots/${botId}/export-subscribers`).then((res) => res.data);

export const exportBillingInvoicesCsv = () =>
  api.get('/billing/export-invoices').then((res) => res.data);

export const downloadCsvFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// -------------------------------------------------------------
// Phase 7: Unified MTProto Inbox API
// -------------------------------------------------------------
export const getAccountDialogs = (accountId: string) =>
  api.get(`/accounts/${accountId}/dialogs`).then((res) => res.data);

export const getDialogMessages = (accountId: string, peer: string) =>
  api.get(`/accounts/${accountId}/dialogs/${encodeURIComponent(peer)}/messages`).then((res) => res.data);

export const sendDirectReply = (accountId: string, peer: string, message: string) =>
  api.post(`/accounts/${accountId}/send-direct`, { peer, message }).then((res) => res.data);

// -------------------------------------------------------------
// Phase 7: Real-Time Channel Cloner & Mirroring API
// -------------------------------------------------------------
export interface ChannelReplacementRule {
  from: string;
  to: string;
}

export const cloneChannelHistory = (data: {
  sourceChannel: string;
  targetChannel: string;
  limit?: number;
  replacements?: ChannelReplacementRule[];
  accountId?: string;
  watermark?: string;
}) => api.post('/campaigns/cloner/history', data).then((res) => res.data);

export const startChannelMirror = (data: {
  sourceChannel: string;
  targetChannel: string;
  replacements?: ChannelReplacementRule[];
  accountId?: string;
  watermark?: string;
}) => api.post('/campaigns/cloner/mirror/start', data).then((res) => res.data);

export const stopChannelMirror = (mirrorId: string) =>
  api.post(`/campaigns/cloner/mirror/stop/${mirrorId}`).then((res) => res.data);

export const getActiveMirrors = () =>
  api.get('/campaigns/cloner/mirror/active').then((res) => res.data);

// -------------------------------------------------------------
// Phase 7: Proxy Pool Auto-Assignment API
// -------------------------------------------------------------
export const autoAssignProxyToAccount = (accountId: string) =>
  api.post(`/accounts/${accountId}/auto-assign-proxy`).then((res) => res.data);

export const autoDistributeProxies = () =>
  api.post('/proxies/auto-distribute').then((res) => res.data);



