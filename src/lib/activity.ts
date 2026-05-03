import { supabase } from "@/integrations/supabase/client";

export async function logActivity(action: string, entityType: string, entityId: string | null, description: string) {
  await supabase.from("activity_log").insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
  });
}
