// Retry temporary upstream failures only; authentication and quota errors need action.
async function withGeminiRetry(operation) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const status = Number(error.response?.status || error.status);
      if (![500, 502, 503, 504].includes(status) || attempt >= 2) throw error;
      const delay = 1000 * (2 ** attempt) + Math.floor(Math.random() * 500);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = { withGeminiRetry };
