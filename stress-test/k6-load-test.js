import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm up
    { duration: '2m', target: 50 }, // Ramp up
    { duration: '5m', target: 100 }, // Sustained load
    { duration: '1m', target: 200 }, // Peak load
    { duration: '2m', target: 100 }, // Ramp down
    { duration: '30s', target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'], // Error rate must be below 10%
    error_rate: ['rate<0.05'], // Custom error rate below 5%
  },
};

const BASE_URL = 'http://localhost:3002';

export function setup() {
  // Create test user for authenticated requests
  const registerPayload = JSON.stringify({
    email: `testuser${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    country: 'US',
  });

  const registerResponse = http.post(
    `${BASE_URL}/auth/register`,
    registerPayload,
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (registerResponse.status === 201) {
    const loginPayload = JSON.stringify({
      email: `testuser${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });

    const loginResponse = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (loginResponse.status === 200) {
      const loginData = JSON.parse(loginResponse.body);
      return { accessToken: loginData.data.accessToken };
    }
  }

  return { accessToken: null };
}

export default function (data) {
  const scenarios = [
    () => healthCheck(),
    () => publicResources(),
    () => productBrowsing(),
    () => authenticationFlow(),
    () => cartOperations(data.accessToken),
    () => orderOperations(data.accessToken),
  ];

  // Randomly select a scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

function healthCheck() {
  const response = http.get(`${BASE_URL}/`);

  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function publicResources() {
  const endpoints = [
    '/resources/countries',
    '/resources/categories',
    '/resources/currencies',
    '/resources/exchange-rates',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`${BASE_URL}${endpoint}`);

  const success = check(response, {
    'public resource status is 200': (r) => r.status === 200,
    'public resource response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function productBrowsing() {
  // Get products list
  const productsResponse = http.get(
    `${BASE_URL}/products?page=${Math.floor(Math.random() * 10) + 1}&limit=${Math.floor(Math.random() * 20) + 5}`,
  );

  const productsSuccess = check(productsResponse, {
    'products list status is 200': (r) => r.status === 200,
    'products list response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  errorRate.add(!productsSuccess);
  responseTime.add(productsResponse.timings.duration);

  // Get specific product details (if products exist)
  if (productsResponse.status === 200) {
    const productId = Math.floor(Math.random() * 100) + 1;
    const productResponse = http.get(`${BASE_URL}/products/${productId}`);

    const productSuccess = check(productResponse, {
      'product details status is 200 or 404': (r) =>
        r.status === 200 || r.status === 404,
      'product details response time < 1000ms': (r) =>
        r.timings.duration < 1000,
    });

    errorRate.add(!productSuccess);
    responseTime.add(productResponse.timings.duration);
  }
}

function authenticationFlow() {
  const email = `testuser${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
  const password = 'TestPassword123!';

  // Register new user
  const registerPayload = JSON.stringify({
    email: email,
    password: password,
    firstName: 'Test',
    lastName: 'User',
    country: 'US',
  });

  const registerResponse = http.post(
    `${BASE_URL}/auth/register`,
    registerPayload,
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const registerSuccess = check(registerResponse, {
    'register status is 201 or 400': (r) =>
      r.status === 201 || r.status === 400, // 400 if user exists
    'register response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!registerSuccess);
  responseTime.add(registerResponse.timings.duration);

  // Login
  const loginPayload = JSON.stringify({
    email: email,
    password: password,
  });

  const loginResponse = http.post(`${BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  errorRate.add(!loginSuccess);
  responseTime.add(loginResponse.timings.duration);
}

function cartOperations(accessToken) {
  if (!accessToken) return;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  // Add item to cart
  const addToCartPayload = JSON.stringify({
    productId: Math.floor(Math.random() * 50) + 1,
    quantity: Math.floor(Math.random() * 5) + 1,
  });

  const addResponse = http.post(`${BASE_URL}/cart/add`, addToCartPayload, {
    headers,
  });

  const addSuccess = check(addResponse, {
    'add to cart status is 200 or 400': (r) =>
      r.status === 200 || r.status === 400,
    'add to cart response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  errorRate.add(!addSuccess);
  responseTime.add(addResponse.timings.duration);

  // Get cart
  const cartResponse = http.get(`${BASE_URL}/cart`, { headers });

  const cartSuccess = check(cartResponse, {
    'get cart status is 200': (r) => r.status === 200,
    'get cart response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!cartSuccess);
  responseTime.add(cartResponse.timings.duration);
}

function orderOperations(accessToken) {
  if (!accessToken) return;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  // First add an item to cart
  const addToCartPayload = JSON.stringify({
    productId: Math.floor(Math.random() * 20) + 1,
    quantity: 1,
  });

  http.post(`${BASE_URL}/cart/add`, addToCartPayload, { headers });

  // Create order
  const orderPayload = JSON.stringify({
    shippingAddress: {
      firstName: 'Test',
      lastName: 'User',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'US',
    },
    paymentMethod: 'card',
  });

  const orderResponse = http.post(`${BASE_URL}/orders`, orderPayload, {
    headers,
  });

  const orderSuccess = check(orderResponse, {
    'create order status is 200 or 400': (r) =>
      r.status === 200 || r.status === 400,
    'create order response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!orderSuccess);
  responseTime.add(orderResponse.timings.duration);
}

export function teardown(data) {
  console.log('Load test completed');
}
