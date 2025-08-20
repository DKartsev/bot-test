console.log('Worker starting...');
console.log('Environment variables:');
console.log('REDIS_URL:', process.env.REDIS_URL);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '***' : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '***' : 'NOT SET');

console.log('Worker started successfully!');

// Keep the process running
setInterval(() => {
  console.log('Worker heartbeat...');
}, 30000);
