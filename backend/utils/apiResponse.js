/**
 * Consistent API envelope.
 *
 * Success: { success: true, data, meta? }
 * Error:   { success: false, error: { message, code?, details? } }
 */

function sendSuccess(res, data, { status = 200, meta = undefined } = {}) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function sendCreated(res, data, meta) {
  return sendSuccess(res, data, { status: 201, meta });
}

function sendNoContent(res) {
  return res.status(204).send();
}

/** Builds the pagination `meta` block shared by every list endpoint. */
function paginationMeta({ page, limit, total }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = { sendSuccess, sendCreated, sendNoContent, paginationMeta };
