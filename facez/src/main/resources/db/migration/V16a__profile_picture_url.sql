-- Phase 8.3-A: Add profile_picture_url column (keep blob for migration period)
ALTER TABLE employee_info
    ADD COLUMN profile_picture_url VARCHAR(500);
