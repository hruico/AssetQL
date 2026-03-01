// Corrected import — add dynamo and UpdateCommand
const { bedrock, dynamo, InvokeModelCommand, UpdateCommand } = require('../../shared');

exports.handler = async (event) => {
    console.log('Bedrock Agent Action Group Event:', JSON.stringify(event, null, 2));

    const { actionGroup, function: functionName, parameters } = event;

    // Extract parameters from the parameters array
    const currentMasterPromptParam = parameters.find(p => p.name === 'currentMasterPrompt');
    const feedbackSummaryParam = parameters.find(p => p.name === 'feedbackSummary');
    const lockedElementsParam = parameters.find(p => p.name === 'lockedElements');
    const sessionIdParam = parameters.find(p => p.name === 'sessionId');
    const sessionId = sessionIdParam ? sessionIdParam.value : null;


    const currentMasterPrompt = currentMasterPromptParam ? currentMasterPromptParam.value : '';
    const feedbackSummary = feedbackSummaryParam ? feedbackSummaryParam.value : '';
    const lockedElementsStr = lockedElementsParam ? lockedElementsParam.value : '[]';

    let lockedElements;
    try {
        lockedElements = JSON.parse(lockedElementsStr);
    } catch (e) {
        lockedElements = [];
    }

    try {
        // Construct the refinement prompt for Nova Lite
        const refinementPrompt = `You are a prompt refinement assistant. Your task is to refine an image generation prompt based on user feedback while respecting locked elements.

CURRENT MASTER PROMPT:
${currentMasterPrompt}

LOCKED ELEMENTS (DO NOT MODIFY THESE):
${lockedElements.length > 0 ? lockedElements.join(', ') : 'None'}

USER FEEDBACK SUMMARY:
${feedbackSummary}

INSTRUCTIONS:
1. NEVER modify any element listed in the locked elements
2. Refine the prompt based on the feedback summary
3. Identify which elements should now be locked (elements the user is satisfied with)
4. Identify active refinements (elements still being adjusted)

Return ONLY a JSON object with this exact structure (no explanation):
{
  "refinedPrompt": "the improved prompt text",
  "updatedLockedElements": ["element1", "element2"],
  "updatedActiveRefinements": ["refinement1", "refinement2"]
}`;

        // Call Amazon Nova Lite
        const novaPayload = {
            messages: [{
                role: 'user',
                content: [
                    { text: refinementPrompt }
                ]
            }],
            inferenceConfig: {
                maxTokens: 2048,
                temperature: 0.3
            }
        };

        const novaRes = await bedrock.send(new InvokeModelCommand({
            //Swapping nova with Micro because it's NO Image recognition work, only Text work and it's Cheap 
            modelId: 'amazon.nova-micro-v1:0',
            body: JSON.stringify(novaPayload),
            contentType: 'application/json'
        }));

        const responseBody = JSON.parse(Buffer.from(novaRes.body).toString());
        const resultText = responseBody.output.message.content[0].text;

        // Strip markdown code fences that LLMs frequently add despite instructions
        //Especially Nova Lite
        const cleanedText = resultText
            .replace(/```json\n?/gi, '')
            .replace(/```\n?/g, '')
            .trim();

        const refinementResult = JSON.parse(cleanedText);

        // After parsing refinementResult successfully, persist the updated state
        await dynamo.send(new UpdateCommand({
            TableName: process.env.SESSIONS_TABLE_NAME,
            Key: { sessionId },  // You'll need to extract sessionId from parameters here too
            UpdateExpression: 'SET masterPrompt = :mp, lockedStyleElements = :le, activeRefinements = :ar',
            ExpressionAttributeValues: {
                ':mp': refinementResult.refinedPrompt,
                ':le': refinementResult.updatedLockedElements,
                ':ar': refinementResult.updatedActiveRefinements
            }
        }));

        // Return in Bedrock Agent response format
        return {
            messageVersion: '1.0',
            response: {
                actionGroup,
                function: functionName,
                functionResponse: {
                    responseBody: {
                        'TEXT': {
                            body: JSON.stringify(refinementResult)
                        }
                    }
                }
            }
        };

    } catch (error) {
        console.error('Error refining prompt:', error);
        return {
            messageVersion: '1.0',
            response: {
                actionGroup,
                function: functionName,
                functionResponse: {
                    responseBody: {
                        'TEXT': {
                            body: JSON.stringify({
                                error: error.message,
                                refinedPrompt: currentMasterPrompt,
                                updatedLockedElements: lockedElements,
                                updatedActiveRefinements: []
                            })
                        }
                    }
                }
            }
        };
    }
};
