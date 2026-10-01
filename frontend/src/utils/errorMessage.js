/**
 * Extracts a user-friendly, safe error message from an API response, Axios error,
 * standard Error, or string without throwing unhandled exceptions.
 *
 * @param {any} err - The error object, string, or response.
 * @param {string} [fallback='An unexpected error occurred'] - Fallback message if extraction fails.
 * @returns {string} Safe, human-readable error description.
 */
export function getErrorMessage(err, fallback = 'An unexpected error occurred') {
  if (!err) return fallback;

  // If string was passed directly
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }

  // Axios response payload
  const responseData = err?.response?.data;
  if (responseData) {
    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }
    if (Array.isArray(responseData.message) && responseData.message.length > 0) {
      return responseData.message.join('. ');
    }
    if (typeof responseData.message === 'string' && responseData.message.trim()) {
      return responseData.message.trim();
    }
    if (typeof responseData.error === 'string' && responseData.error.trim()) {
      return responseData.error.trim();
    }
  }

  // Standard Error message
  if (typeof err.message === 'string' && err.message.trim()) {
    return err.message.trim();
  }

  return fallback;
}

export default getErrorMessage;
