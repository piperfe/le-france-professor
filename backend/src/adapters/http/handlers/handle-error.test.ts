import { Response } from 'express';
import { handleError } from './handle-error';

describe('handleError', () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('sends 500 with error message when error is an Error', () => {
    handleError(new Error('Something broke'), mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Something broke' });
  });

  it('sends 500 with "Unknown error" when error is not an Error', () => {
    handleError('string error', mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unknown error',
    });
  });
});
