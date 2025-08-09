const EventEmitter = require('events');

// In-process event bus for live operator updates.
// Events include tenantId/projectId when available:
//  - 'ask' => { ts, tenantId?, projectId?, responseId, question, lang, source, method, itemId?, pendingId?, matchedQuestion?, score? }
//  - 'moderation' => { ts, tenantId?, action, id, editor?, changes? }
//  - 'feedback' => { ts, tenantId?, responseId, positive, negative, neutral }
const liveBus = new EventEmitter();

module.exports = { liveBus };
