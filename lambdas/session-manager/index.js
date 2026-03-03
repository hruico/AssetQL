const { dynamo, GetCommand, PutCommand, UpdateCommand, QueryCommand, response } = require('../../shared');
const crypto = require('crypto');

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
    try {
        // Debug logging at handler entry
        console.log('=== Session Manager Handler Start ===');
        console.log('HTTP Method:', event.httpMethod);
        console.log('SESSIONS_TABLE_NAME defined?', !!process.env.SESSIONS_TABLE_NAME);
        console.log('SESSIONS_TABLE_NAME value:', process.env.SESSIONS_TABLE_NAME);
        console.log('Request Context:', JSON.stringify(event.requestContext, null, 2));
        console.log('Full Event:', JSON.stringify(event, null, 2));

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
        } else if (httpMethod === 'GET' && !pathParameters.sessionId) {
            // List all sessions for the user
            return await listSessions(event);
        } else {
            return response(400, { error: 'Invalid request method or path' });
        }
    } catch (error) {
        // Catch any unhandled errors and return proper API Gateway response
        console.error('HANDLER ERROR:', error.message, error.stack);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};

/**
 * POST /api/v1/sessions
 * Creates a new session for tracking the iterative refinement workflow
 */
async function createSession(event) {
    try {
        console.log('=== createSession START ===');
        
        // Step 1: Parse event.body
        console.log('STEP 1: Parsing event.body');
        console.log('Raw event.body:', event.body);
        
        const body = event.body ? JSON.parse(event.body) : {};
        console.log('Parsed body:', JSON.stringify(body, null, 2));
        
        const userId = event.requestContext.authorizer.claims.sub;
        console.log('userId from claims:', userId);
        
        const name = body.name || 'Untitled Session';
        const batchId = body.batchId || null; // Optional: link to a CSV batch immediately
        console.log('Session name:', name);
        console.log('batchId:', batchId);

        // Step 2: Generate session data
        console.log('STEP 2: Generating session data');
        const sessionId = crypto.randomUUID();
        const currentPhase = 'UPLOAD';
        const createdAt = new Date().toISOString();
        
        console.log('Generated sessionId:', sessionId);
        console.log('Initial currentPhase:', currentPhase);
        console.log('createdAt:', createdAt);

        const sessionItem = {
            sessionId,
            userId,
            name,
            batchId,
            currentPhase,
            masterPrompt: '',
            lockedStyleElements: [],
            activeRefinements: [],
            createdAt,
            updatedAt: createdAt
        };
        
        console.log('Complete sessionItem:', JSON.stringify(sessionItem, null, 2));

        // Step 3: Save to DynamoDB
        console.log('STEP 3: Saving to DynamoDB');
        console.log('Table name:', process.env.SESSIONS_TABLE_NAME);
        
        await dynamo.send(new PutCommand({
            TableName: process.env.SESSIONS_TABLE_NAME,
            Item: sessionItem
        }));
        
        console.log('DynamoDB PutCommand SUCCESS');

        // Step 4: Prepare response
        console.log('STEP 4: Preparing response');
        const responseData = {
            sessionId,
            userId,
            name,
            currentPhase,
            createdAt
        };
        console.log('Response data:', JSON.stringify(responseData, null, 2));

        // Step 5: Return response
        console.log('STEP 5: Returning response with statusCode 201');
        return {
            statusCode: 201,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
            },
            body: JSON.stringify({
                sessionId,
                userId,
                name,
                currentPhase,
                createdAt
            })
        };

    } catch (error) {
        console.error('Error creating session:', error.message, error.stack);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                error: 'Failed to create session',
                message: error.message
            })
        };
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

/**
 * GET /api/v1/sessions
 * Lists all sessions for the authenticated user
 * Returns sessions sorted by creation date (newest first)
 */
async function listSessions(event) {
    try {
        const userId = event.requestContext.authorizer.claims.sub;

        // Query sessions by userId using GSI (Global Secondary Index)
        // Note: This requires a GSI on userId in the DynamoDB table
        const result = await dynamo.send(new QueryCommand({
            TableName: process.env.SESSIONS_TABLE_NAME,
            IndexName: 'userId-index',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            },
            ScanIndexForward: false // Sort by createdAt descending (newest first)
        }));

        return response(200, {
            sessions: result.Items || []
        });

    } catch (error) {
        console.error('Error listing sessions:', error);
        return response(500, { error: 'Failed to list sessions', details: error.message });
    }
}
