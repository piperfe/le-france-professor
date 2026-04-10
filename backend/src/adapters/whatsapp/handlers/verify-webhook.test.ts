import { Request, Response } from 'express';
import { createVerifyWebhookHandler } from './verify-webhook';

describe('createVerifyWebhookHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createVerifyWebhookHandler>;

  beforeEach(() => {
    mockRequest = { query: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    handler = createVerifyWebhookHandler('secret-token');
  });

  it('responds 200 with challenge when token matches', () => {
    mockRequest.query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'secret-token', 'hub.challenge': 'abc123' };

    handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith('abc123');
  });

  it('responds 403 when token does not match', () => {
    mockRequest.query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'abc123' };

    handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
  });

  it('responds 403 when mode is not subscribe', () => {
    mockRequest.query = { 'hub.mode': 'unsubscribe', 'hub.verify_token': 'secret-token', 'hub.challenge': 'abc123' };

    handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });
});
