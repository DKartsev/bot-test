const EventEmitter = require('events');

// In-process event bus for live operator updates.
// Events:
//  - 'ask' => { ts, responseId, question, lang, source, method, itemId?, pendingId?, matchedQuestion?, score? }
//  - 'moderation' => { ts, action, id, editor?, changes? }
//  - 'feedback' => { ts, responseId, positive, negative, neutral }
const liveBus = new EventEmitter();

module.exports = { liveBus };
