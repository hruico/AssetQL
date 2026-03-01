const { v4: uuidv4 } = require('uuid');
const { dynamo, GetCommand, PutCommand, UpdateCommand, response } = require('../../shared');

// Define legal phase transitions
// Each phase can only transition to one specific next phase
// This enforces a strict workflow: UPLOAD → SINGLE_ITERATION → BATCH_REVIEW → STYLE_LOCKED → AUTOMATION → COMPLETE
const LEGAL_TRANSITIONS = {
    'UPLOAD': 'SINGLE_ITERATION',
    'SINGLE_ITERATION': 'BATCH_REVIEW',
    'BATCH_REVIEW': 'STYLE_LOCKED',
    'STYLE_LOCKED': 'AUTOMATION',
    'AUTOMATION': 'COMPLETE'
};

exports.handler = async (event) => {
    console.log('Session Manager Event:', JSON.stringify(event, null, 2));

    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    const path = event.path || '';

    if (httpMethod === 'POST') {
        return await createSession(event);
    } else if (httpMethod === 'PUT' && path.endsWith('/phase')) {
        // Only route to phase update if the path explicitly ends with /phase
        return await updateSessionPhase(event);
    } else if (httpMethod === 'GET' && pathParameters.sessionId) {
        return await getSession(event);
    } else {
        return response(400, { error: 'Invalid request method or path' });
    }
};

/**
 * POST /api/v1/sessions
 * Creates a new session for tracking the iterative refinement workflow
 */
async function createSession(event) {
    try {
        const userId = event.requestContext.authorizer.claims.sub;
        const body = JSON.parse(event.body || '{}');
        const batchId = body.batchId || null; // Optional: link to a CSV batch immediately

        const sessionId = uuidv4();
        const now = new Date().toISOString();

        const sessionItem = {
            sessionId,
            userId,
            batchId,
            currentPhase: 'UPLOAD',
            masterPrompt: '',
            lockedStyleElements: [],
            activeRefinements: [],
            createdAt: now,
            updatedAt: now
        };

        await dynamo.send(new PutCommand({
            TableName: process.env.SESSIONS_TABLE_NAME,
            Item: sessionItem
        }));

        return response(201, sessionItem);

    } catch (error) {
        console.error('Error creating session:', error);
        return response(500, { error: 'Failed to create session', details: error.message });
    }
}

/**
 * PUT /api/v1/sessions/{sessionId}/phase
 * Updates the session phase with strict transition validation
 * 
 * Returns 409 Conflict if the transition is not legal according to LEGAL_TRANSITIONS.
 * This status code is semantically correct because:
 * - The request is valid but conflicts with the current state of the resource
 * - The client needs to know the current phase before attempting another transition
 * - It's distinct from 400 (bad request) because the request format is correct
 */
async function updateSessionPhase(event) {
    try {
        const sessionId = event.pathParameters.sessionId;
        const body = JSON.parse(event.body || '{}');
        const newPhase = body.newPhase;

        if (!newPhase) {
            return response(400, { error: 'newPhase is required in request body' });
        }

        // Fetch current session
        const getResult = await dynamo.send(new GetCommand({
            TableName: process.env.SESSIONS_TABLE_NAME,
            Key: { sessionId }
        }));

        if (!getResult.Item) {
            return response(404, { error: 'Session not found', sessionId });
        }

        const session = getResult.Item;
        const currentPhase = session.currentPhase;

        // Validate phase transition
        // Check if the requested transition is legal according to our workflow
        const allowedNextPhase = LEGAL_TRANSITIONS[currentPhase];

        if (allowedNextPhase !== newPhase) {
            // Return 409 Conflict with detailed error message for frontend display
            return response(409, {
                error: 'Illegal phase transition',
                message: `Cannot transition from ${currentPhase} to ${newPhase}. The only allowed transition from ${currentPhase} is to ${allowedNextPhase || 'NONE (workflow complete)'}.`,
                currentPhase,
                attemptedPhase: newPhase,
                allowedPhase: allowedNextPhase
            });
        }

        // Transition is legal - update the phase
        const now = new Date().toISOString();

        await dynamo.send(new UpdateCommand({
            TableName: process.env.SESSIONS_TABLE_NAME,
            Key: { sessionId },
            UpdateExpression: 'SET currentPhase = :phase, updatedAt = :updated',
            ExpressionAttributeValues: {
                ':phase': newPhase,
                ':updated': now
            },
            ReturnValues: 'ALL_NEW'
        }));

        // Fetch and return the updated session
        const updatedResult = await dynamo.send(new GetCommand({
            TableName: process.env.SESSIONS_TABLE_NAME,
            Key: { sessionId }
        }));

        return response(200, updatedResult.Item);

    } catch (error) {
        console.error('Error updating session phase:', error);
        return response(500, { error: 'Failed to update session phase', details: error.message });
    }
}

/**
 * GET /api/v1/sessions/{sessionId}
 * Retrieves a session by ID
 */
async function getSession(event) {
    try {
        const sessionId = event.pathParameters.sessionId;

        const result = await dynamo.send(new GetCommand({
            TableName: process.env.SESSIONS_TABLE_NAME,
            Key: { sessionId }
        }));

        if (!result.Item) {
            return response(404, { error: 'Session not found', sessionId });
        }

        return response(200, result.Item);

    } catch (error) {
        console.error('Error fetching session:', error);
        return response(500, { error: 'Failed to fetch session', details: error.message });
    }
}
