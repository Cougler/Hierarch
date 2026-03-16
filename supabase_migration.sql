-- Migration: Add start_date and end_date columns to projects
-- Run this once in the Supabase SQL editor for project: bccmvisblpuiceuowfez
-- Safe to run on a live database — adds nullable columns, does not modify existing data.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;
