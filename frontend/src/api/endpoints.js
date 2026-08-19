import api, { unwrap, unwrapWithMeta } from './client';

/** Strips empty values so the query string stays clean and cacheable. */
const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
    )
  );

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then(unwrap),
  login: (payload) => api.post('/auth/login', payload).then(unwrap),
  logout: () => api.post('/auth/logout').then(unwrap),
  logoutAll: () => api.post('/auth/logout-all').then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(unwrap),
  resetPassword: (token, password) =>
    api.post(`/auth/reset-password/${token}`, { password }).then(unwrap),
  verifyEmail: (token) => api.post(`/auth/verify-email/${token}`).then(unwrap),
  resendVerification: () => api.post('/auth/resend-verification').then(unwrap),
};

// ── Users ────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get('/users/profile').then(unwrap),
  updateProfile: (payload) => api.put('/users/profile', payload).then(unwrap),
  changePassword: (payload) => api.put('/users/password', payload).then(unwrap),
  deleteAccount: (password) => api.delete('/users/account', { data: { password } }).then(unwrap),
  listAddresses: () => api.get('/users/addresses').then(unwrap),
  addAddress: (payload) => api.post('/users/addresses', payload).then(unwrap),
  updateAddress: (id, payload) => api.put(`/users/addresses/${id}`, payload).then(unwrap),
  deleteAddress: (id) => api.delete(`/users/addresses/${id}`).then(unwrap),
  setDefaultAddress: (id) => api.patch(`/users/addresses/${id}/default`).then(unwrap),
};

// ── Catalogue ────────────────────────────────────────────────────────────────
export const productApi = {
  list: (params) => api.get('/products', { params: clean(params) }).then(unwrapWithMeta),
  get: (slug) => api.get(`/products/${slug}`).then(unwrap),
  related: (slug) => api.get(`/products/${slug}/related`).then(unwrap),
  facets: (params) => api.get('/products/facets', { params: clean(params) }).then(unwrap),
  homeCollections: () => api.get('/products/collections/home').then(unwrap),

  create: (payload) => api.post('/products', payload).then(unwrap),
  update: (id, payload) => api.put(`/products/${id}`, payload).then(unwrap),
  archive: (id) => api.patch(`/products/${id}/archive`).then(unwrap),
  remove: (id) => api.delete(`/products/${id}`).then(unwrap),
  setVariantStock: (id, variantId, stock) =>
    api.patch(`/products/${id}/variants/${variantId}/stock`, { stock }).then(unwrap),
};

export const categoryApi = {
  list: (params) => api.get('/categories', { params: clean(params) }).then(unwrap),
  get: (slug) => api.get(`/categories/${slug}`).then(unwrap),
  create: (payload) => api.post('/categories', payload).then(unwrap),
  update: (id, payload) => api.put(`/categories/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/categories/${id}`).then(unwrap),
};

// ── Orders ───────────────────────────────────────────────────────────────────
export const orderApi = {
  preview: (payload) => api.post('/orders/preview', payload).then(unwrap),
  create: (payload) => api.post('/orders', payload).then(unwrap),
  mine: (params) => api.get('/orders/mine', { params: clean(params) }).then(unwrapWithMeta),
  get: (id) => api.get(`/orders/${id}`).then(unwrap),
  cancel: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }).then(unwrap),

  listAll: (params) => api.get('/orders', { params: clean(params) }).then(unwrapWithMeta),
  updateStatus: (id, payload) => api.patch(`/orders/${id}/status`, payload).then(unwrap),
  refund: (id, payload) => api.post(`/orders/${id}/refund`, payload).then(unwrap),
};

// ── Payments ─────────────────────────────────────────────────────────────────
export const paymentApi = {
  config: () => api.get('/payments/config').then(unwrap),
  createOrder: (orderId) => api.post(`/payments/${orderId}/create`).then(unwrap),
  verify: (orderId, payload) => api.post(`/payments/${orderId}/verify`, payload).then(unwrap),
  markCodPaid: (orderId) => api.patch(`/payments/${orderId}/cod-paid`).then(unwrap),
};

// ── Coupons ──────────────────────────────────────────────────────────────────
export const couponApi = {
  validate: (payload) => api.post('/coupons/validate', payload).then(unwrap),
  list: (params) => api.get('/coupons', { params: clean(params) }).then(unwrapWithMeta),
  create: (payload) => api.post('/coupons', payload).then(unwrap),
  update: (id, payload) => api.put(`/coupons/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/coupons/${id}`).then(unwrap),
};

// ── Reviews ──────────────────────────────────────────────────────────────────
export const reviewApi = {
  forProduct: (productId, params) =>
    api.get(`/products/${productId}/reviews`, { params: clean(params) }).then(unwrapWithMeta),
  eligibility: (productId) => api.get(`/products/${productId}/reviews/eligibility`).then(unwrap),
  create: (productId, payload) => api.post(`/products/${productId}/reviews`, payload).then(unwrap),
  update: (id, payload) => api.put(`/reviews/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/reviews/${id}`).then(unwrap),
  listAll: (params) => api.get('/reviews', { params: clean(params) }).then(unwrapWithMeta),
  setApproval: (id, isApproved) => api.patch(`/reviews/${id}/approval`, { isApproved }).then(unwrap),
};

// ── Contact ──────────────────────────────────────────────────────────────────
export const contactApi = {
  submit: (payload) => api.post('/contact', payload).then(unwrap),
  subscribe: (email) => api.post('/contact/subscribe', { email }).then(unwrap),
  listMessages: (params) =>
    api.get('/contact/messages', { params: clean(params) }).then(unwrapWithMeta),
  updateMessage: (id, status) => api.patch(`/contact/messages/${id}`, { status }).then(unwrap),
  listSubscribers: (params) =>
    api.get('/contact/subscribers', { params: clean(params) }).then(unwrapWithMeta),
};

// ── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get('/admin/stats').then(unwrap),
  inventory: (params) => api.get('/admin/inventory', { params: clean(params) }).then(unwrapWithMeta),
  customers: (params) => api.get('/admin/customers', { params: clean(params) }).then(unwrapWithMeta),
  customer: (id) => api.get(`/admin/customers/${id}`).then(unwrap),
  setRole: (id, role) => api.patch(`/admin/customers/${id}/role`, { role }).then(unwrap),
  setStatus: (id, isActive) => api.patch(`/admin/customers/${id}/status`, { isActive }).then(unwrap),
};

// ── Uploads ──────────────────────────────────────────────────────────────────
export const uploadApi = {
  image: (file, onProgress) => {
    const form = new FormData();
    form.append('image', file);
    return api
      .post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      })
      .then(unwrap);
  },
};
