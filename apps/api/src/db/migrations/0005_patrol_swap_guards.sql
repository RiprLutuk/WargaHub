CREATE UNIQUE INDEX uq_active_patrol_swap_source
  ON patrol_swap_requests (source_assignment_id)
  WHERE status IN ('REQUESTED', 'ACCEPTED');

CREATE UNIQUE INDEX uq_active_patrol_swap_target
  ON patrol_swap_requests (target_assignment_id)
  WHERE status IN ('REQUESTED', 'ACCEPTED');
