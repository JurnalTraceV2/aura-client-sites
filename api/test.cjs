const handler = require('./simple-auth.cjs');

// Test the API
const mockReq = {
  url: '/api/account/me',
  method: 'GET'
};

const mockRes = {
  setHeader: () => {},
  status: (code) => ({
    json: (data) => console.log(`Status: ${code}`, JSON.stringify(data, null, 2))
  }),
  end: () => {}
};

handler(mockReq, mockRes);
