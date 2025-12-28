
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testProposalInsert() {
  console.log("Testing Proposal Insert...");

  // 1. Create a dummy proposal
  const proposalData = {
    total_amount: 1000,
    grand_total: 1200,
    status: 'draft',
    proposal_date: new Date().toISOString(),
    // proposal_no is serial, let DB handle it
  };

  const { data: newProposal, error: proposalError } = await supabase
    .from('proposals')
    .insert(proposalData)
    .select('id')
    .single();

  if (proposalError) {
    console.error("Proposal insert failed:", proposalError);
    return;
  }

  const proposalId = newProposal.id;
  console.log("Created proposal:", proposalId);

  // 2. Insert Items
  const items = [
    {
      description: "Test Item 1",
      quantity: 1,
      unit: "Adet",
      unitPrice: 500,
      totalPrice: 500,
      attributes: { color: "red" },
      isHeader: false
    },
    {
      description: "Test Item 2",
      quantity: 2,
      unit: "Adet",
      unitPrice: 250,
      totalPrice: 500,
      isHeader: false
    }
  ];

  const itemsToInsert = items.map((item, index) => ({
    proposal_id: proposalId,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    attributes: item.attributes,
    is_header: item.isHeader,
    order: index
  }));

  console.log("Inserting items:", itemsToInsert);

  const { data: insertedItems, error: itemsError } = await supabase
    .from('proposal_items')
    .insert(itemsToInsert)
    .select();

  if (itemsError) {
    console.error("Items insert failed:", itemsError);
  } else {
    console.log("Items inserted successfully:", insertedItems?.length);
    console.log("Inserted Items:", insertedItems);
  }
}

testProposalInsert();
