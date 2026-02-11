export type AppRole = "admin" | "coordinator" | "viewer" | "participant";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  show_contact: boolean;
  allow_swap: boolean;
  allow_waitlist: boolean;
  max_signups_per_participant: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Slot {
  id: string;
  event_id: string;
  starts_at: string;
  ends_at: string;
  label: string | null;
  capacity: number;
  sort_order: number;
  created_at: string;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  slot_id: string;
  event_id: string;
  team_id: string | null;
  participant_email: string;
  participant_name: string | null;
  participant_phone: string | null;
  auth_user_id: string | null;
  status: "confirmed" | "cancelled" | "waitlist_promoted";
  created_at: string;
  updated_at: string;
}

export interface WaitlistEntry {
  id: string;
  slot_id: string;
  event_id: string;
  team_id: string | null;
  participant_email: string;
  participant_name: string | null;
  participant_phone: string | null;
  auth_user_id: string | null;
  position: number;
  created_at: string;
}

export interface SwapRequest {
  id: string;
  event_id: string;
  requester_booking_id: string;
  target_booking_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  responded_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  event_id: string | null;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface SlotWithBooking extends Slot {
  booking: (Booking & { team?: Team | null }) | null;
  waitlist_count: number;
}

export interface EventWithSlots extends Event {
  slots: SlotWithBooking[];
}
