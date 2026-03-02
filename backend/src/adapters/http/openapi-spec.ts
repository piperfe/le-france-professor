export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Le France Professor API',
    description:
      'API for the Le France Professor application — an AI-powered French language tutor that uses a local LLM (Ollama) to generate conversational responses.',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local development server',
    },
  ],
  tags: [
    {
      name: 'Conversations',
      description: 'Manage tutoring conversations',
    },
  ],
  paths: {
    '/api/conversations': {
      post: {
        tags: ['Conversations'],
        summary: 'Create a new conversation',
        description:
          'Starts a new tutoring session. The tutor (LLM) sends an initial greeting message to kick off the French lesson.',
        operationId: 'createConversation',
        responses: {
          '201': {
            description: 'Conversation created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateConversationResponse',
                },
                example: {
                  conversationId: 'conv-1700000000000-abc123xyz',
                  initialMessage:
                    "Bonjour! Je suis votre professeur de français. Comment puis-je vous aider aujourd'hui?",
                },
              },
            },
          },
          '500': {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
    },
    '/api/conversations/{conversationId}/messages': {
      post: {
        tags: ['Conversations'],
        summary: 'Send a message to the tutor',
        description:
          'Sends a user message within an existing conversation. The tutor processes the conversation history and returns a contextual French tutoring response.',
        operationId: 'sendMessage',
        parameters: [
          {
            $ref: '#/components/parameters/conversationId',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SendMessageRequest',
              },
              example: {
                message: 'Comment dit-on "apple" en français?',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Message processed, tutor response returned',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SendMessageResponse',
                },
                example: {
                  message: 'Comment dit-on "apple" en français?',
                  tutorResponse:
                    'En français, "apple" se dit "une pomme". C\'est un mot féminin. Par exemple: "Je mange une pomme." Voulez-vous pratiquer avec d\'autres fruits?',
                },
              },
            },
          },
          '400': {
            description: 'Bad request — message field is missing',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'Message is required',
                },
              },
            },
          },
          '500': {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
    },
    '/api/conversations/{conversationId}': {
      get: {
        tags: ['Conversations'],
        summary: 'Get a conversation',
        description:
          'Retrieves a conversation by ID, including the full message history with sender and timestamp for each message.',
        operationId: 'getConversation',
        parameters: [
          {
            $ref: '#/components/parameters/conversationId',
          },
        ],
        responses: {
          '200': {
            description: 'Conversation found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GetConversationResponse',
                },
                example: {
                  id: 'conv-1700000000000-abc123xyz',
                  createdAt: '2024-01-15T10:30:00.000Z',
                  messages: [
                    {
                      id: '1700000000001-xyz789',
                      content:
                        "Bonjour! Je suis votre professeur de français. Comment puis-je vous aider aujourd'hui?",
                      sender: 'tutor',
                      timestamp: '2024-01-15T10:30:00.100Z',
                    },
                    {
                      id: '1700000000002-abc456',
                      content: 'Comment dit-on "apple" en français?',
                      sender: 'user',
                      timestamp: '2024-01-15T10:30:15.000Z',
                    },
                  ],
                },
              },
            },
          },
          '500': {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
    },
  },
  components: {
    parameters: {
      conversationId: {
        name: 'conversationId',
        in: 'path',
        required: true,
        description: 'The unique identifier of the conversation',
        schema: {
          type: 'string',
          example: 'conv-1700000000000-abc123xyz',
        },
      },
    },
    schemas: {
      CreateConversationResponse: {
        type: 'object',
        required: ['conversationId', 'initialMessage'],
        properties: {
          conversationId: {
            type: 'string',
            description: 'Unique identifier for the created conversation',
            example: 'conv-1700000000000-abc123xyz',
          },
          initialMessage: {
            type: 'string',
            description: 'The tutor\'s opening message to start the lesson',
            example:
              "Bonjour! Je suis votre professeur de français. Comment puis-je vous aider aujourd'hui?",
          },
        },
      },
      SendMessageRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            description: 'The user\'s message to the tutor',
            example: 'Comment dit-on "apple" en français?',
          },
        },
      },
      SendMessageResponse: {
        type: 'object',
        required: ['message', 'tutorResponse'],
        properties: {
          message: {
            type: 'string',
            description: 'The original user message that was sent',
            example: 'Comment dit-on "apple" en français?',
          },
          tutorResponse: {
            type: 'string',
            description: 'The tutor\'s response to the user message',
            example:
              'En français, "apple" se dit "une pomme". C\'est un mot féminin.',
          },
        },
      },
      Message: {
        type: 'object',
        required: ['id', 'content', 'sender', 'timestamp'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for the message',
            example: '1700000000001-xyz789',
          },
          content: {
            type: 'string',
            description: 'The text content of the message',
            example: 'Bonjour! Comment puis-je vous aider?',
          },
          sender: {
            type: 'string',
            enum: ['user', 'tutor'],
            description: 'Who sent the message',
            example: 'tutor',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'ISO 8601 timestamp of when the message was created',
            example: '2024-01-15T10:30:00.100Z',
          },
        },
      },
      GetConversationResponse: {
        type: 'object',
        required: ['id', 'messages', 'createdAt'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for the conversation',
            example: 'conv-1700000000000-abc123xyz',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'ISO 8601 timestamp of when the conversation was created',
            example: '2024-01-15T10:30:00.000Z',
          },
          messages: {
            type: 'array',
            description: 'Full message history of the conversation',
            items: {
              $ref: '#/components/schemas/Message',
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'string',
            description: 'Error message describing what went wrong',
            example: 'Message is required',
          },
        },
      },
    },
    responses: {
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: 'Conversation not found',
            },
          },
        },
      },
    },
  },
};
