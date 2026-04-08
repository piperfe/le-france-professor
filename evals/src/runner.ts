import fetch from 'node-fetch';

export type Level = 'A1' | 'A2' | 'B1' | 'B2';
export type EvalMode = 'coherence' | 'discovery';

export interface Scenario {
  id: string;
  description: string;
  level: Level;
  interest: string;
  evalMode: EvalMode;
  studentTurns: string[];
}

export interface Turn {
  student: string;
  tutor: string;
}

export interface Transcript {
  scenarioId: string;
  level: Level;
  interest: string;
  evalMode: EvalMode;
  turns: Turn[];
}

interface CreateConversationResponse {
  conversationId: string;
  initialMessage: string;
}

interface SendMessageResponse {
  tutorResponse: string;
}

export async function runScenario(scenario: Scenario, backendUrl: string): Promise<Transcript> {
  const createRes = await fetch(`${backendUrl}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create conversation: ${createRes.status} ${createRes.statusText}`);
  }

  const { conversationId } = (await createRes.json()) as CreateConversationResponse;
  const turns: Turn[] = [];

  for (const studentTurn of scenario.studentTurns) {
    const msgRes = await fetch(`${backendUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: studentTurn }),
    });

    if (!msgRes.ok) {
      throw new Error(
        `Failed to send message in scenario "${scenario.id}": ${msgRes.status} ${msgRes.statusText}`,
      );
    }

    const { tutorResponse } = (await msgRes.json()) as SendMessageResponse;
    turns.push({ student: studentTurn, tutor: tutorResponse });
  }

  return {
    scenarioId: scenario.id,
    level: scenario.level,
    interest: scenario.interest,
    evalMode: scenario.evalMode,
    turns,
  };
}
