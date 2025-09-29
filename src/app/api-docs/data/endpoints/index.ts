import type { ApiEndpoint } from '../../types';
import { twitterTasksEndpoints } from './twitter-tasks';
import { twitterDataEndpoints } from './twitter-data';
import { twitterAIBatchEndpoints } from './twitter-ai-batch';
import { twitterProcessingEndpoints } from './twitter-processing';
import { manualTweetsEndpoints } from './manual-tweets';
import { writingAssistantEndpoints } from './writing-assistant';

export const apiEndpoints: ApiEndpoint[] = [
  ...twitterTasksEndpoints,
  ...twitterDataEndpoints,
  ...twitterAIBatchEndpoints,
  ...twitterProcessingEndpoints,
  ...manualTweetsEndpoints,
  ...writingAssistantEndpoints,
];

export {
  twitterTasksEndpoints,
  twitterDataEndpoints,
  twitterAIBatchEndpoints,
  twitterProcessingEndpoints,
  manualTweetsEndpoints,
  writingAssistantEndpoints,
};