const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://hive-backend:8000/api/v1/hospitality/events', {
      name: 'Test Node.js Event',
      event_type: 'party',
      start_at: '2026-06-08 15:00:00',
      end_at: '2026-06-08 18:00:00',
      status: 'draft',
      is_private: false
    }, {
      headers: {
        'Accept': 'application/json',
        // In reality, this requires Sanctum auth cookie or token!
        // If we get 401 Unauthenticated, we need a token.
      }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.status);
    console.error(err.response?.data);
  }
}

test();
