const { createClient } = require('@supabase/supabase-js');

async function checkConversationsStructure() {
  console.log('🔍 Проверяем структуру таблицы conversations...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Получаем структуру таблицы conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .limit(3);
    
    if (conversationsError) {
      console.error('❌ Ошибка при получении conversations:', conversationsError);
      return;
    }
    
    console.log('📊 Найдено conversations:', conversations.length);
    
    if (conversations.length > 0) {
      console.log('\n📋 Структура таблицы conversations:');
      const firstConversation = conversations[0];
      Object.keys(firstConversation).forEach(key => {
        const value = firstConversation[key];
        const type = typeof value;
        const preview = type === 'string' ? value.substring(0, 50) + '...' : value;
        console.log(`   - ${key}: ${type} = ${preview}`);
      });
    }
    
    // Проверяем таблицу messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(3);
    
    if (messagesError) {
      console.error('❌ Ошибка при получении messages:', messagesError);
    } else {
      console.log('\n📊 Найдено messages:', messages.length);
      
      if (messages.length > 0) {
        console.log('\n📋 Структура таблицы messages:');
        const firstMessage = messages[0];
        Object.keys(firstMessage).forEach(key => {
          const value = firstMessage[key];
          const type = typeof value;
          const preview = type === 'string' ? value.substring(0, 50) + '...' : value;
          console.log(`   - ${key}: ${type} = ${preview}`);
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Общая ошибка:', err.message);
  }
}

checkConversationsStructure();
