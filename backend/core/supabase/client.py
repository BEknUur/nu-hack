from supabase import create_client, Client

from core.supabase.config import supabase_settings

supabase_client: Client = create_client(
    supabase_settings.url,
    supabase_settings.anon_key,
)
