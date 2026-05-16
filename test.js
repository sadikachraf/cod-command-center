const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url || !key) {
  console.log('Missing env vars');
  process.exit(1);
}
const supabase = createClient(url, key);

async function run() {
  const { data: order } = await supabase.from('orders').select('*').limit(1).single();
  if(!order) {
    console.log('No order found');
    return;
  }
  
  // Test updating status and inserting event
  const { error: err1 } = await supabase.from('orders').update({ status: 'Confirmed' }).eq('id', order.id);
  const { error: err2 } = await supabase.from('order_events').insert({
    order_id: order.id,
    event_type: 'status_changed',
    event_data: { from: order.status, to: 'Confirmed' }
  });
  
  if(err1 || err2) console.log('Error updating status:', err1, err2);
  else console.log('Successfully changed status and inserted event.');
  
  // Test updating notes
  const note = "This is a test note";
  const { error: err3 } = await supabase.from('orders').update({ notes: note }).eq('id', order.id);
  const { error: err4 } = await supabase.from('order_events').insert({
    order_id: order.id,
    event_type: 'note_updated',
    event_data: { note }
  });
  
  if(err3 || err4) console.log('Error updating notes:', err3, err4);
  else console.log('Successfully updated notes and inserted event.');
}
run();
