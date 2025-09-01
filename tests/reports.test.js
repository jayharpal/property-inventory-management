const request = require('supertest');
const { app } = require('../server/index');

describe('Reports API', () => {
  // GET /api/reports
  test('should fetch all reports', async () => {
    const response = await request(app).get('/api/reports');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // GET /api/reports/owner/:ownerId
  test('should fetch reports for a specific owner', async () => {
    // This assumes there's at least one owner with ID 1 that has reports
    const response = await request(app).get('/api/reports/owner/1');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // GET /api/reports/:id
  test('should fetch a specific report', async () => {
    // This assumes there's at least one report with ID 1
    const response = await request(app).get('/api/reports/1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title');
  });

  // Mock test for creating a report
  test('should create a new report', async () => {
    const newReport = {
      title: 'Test Report',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      ownerIds: [1],
      notes: 'Test notes'
    };

    const response = await request(app)
      .post('/api/reports')
      .send(newReport);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(newReport.title);
  });

  // Test for deleting a report
  test('should delete a report', async () => {
    // This assumes there's a report with ID 1 that can be deleted
    const response = await request(app).delete('/api/reports/1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(true);
  });

  // Test for downloading a report
  test('should generate a PDF report for download', async () => {
    // This assumes there's a report with ID 1
    const response = await request(app).get('/api/reports/1/download');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
  });

  // Test for sending a report by email
  test('should send a report by email', async () => {
    const emailRequest = {
      reportId: 1,
      email: 'test@example.com'
    };

    const response = await request(app)
      .post('/api/reports/email')
      .send(emailRequest);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(true);
  });
});