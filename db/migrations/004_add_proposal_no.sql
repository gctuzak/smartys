-- Add proposal_no column to proposals table
ALTER TABLE public.proposals 
ADD COLUMN proposal_no SERIAL;

-- Make it unique (optional but good practice)
-- CREATE UNIQUE INDEX idx_proposals_proposal_no ON public.proposals(proposal_no);
