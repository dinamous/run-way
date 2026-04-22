#!/bin/bash
# Uso: bash supabase/deploy-functions.sh
npx supabase functions deploy admin-clients
npx supabase functions deploy admin-members
npx supabase functions deploy admin-notifications
npx supabase functions deploy admin-users
