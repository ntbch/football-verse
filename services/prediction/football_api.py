"""Football API Provider Facade.

Refactored under Phase 3 Slice 3.4 to modularize provider client, normalizers,
and league policy while maintaining 100% backward compatibility.
"""

from providers.client import FOOTBALL_DATA_CACHE, api_get, football_data_get
from providers.league_policy import (
    fixture_season_candidates,
    fixtures_payload,
    football_data_current_round,
    football_data_fixtures_payload,
    football_data_live_payload,
    football_data_matches,
    football_data_matches_for_season,
    football_data_response_count,
    football_data_round_fixtures_payload,
    football_data_rounds,
    football_data_rounds_payload,
    football_data_standings_payload,
    league_code,
    league_id,
    leagues_payload,
    live_payload,
    prediction_history,
    predictions_payload,
    previous_season,
    provider_debug_payload,
    response_count,
    round_fixtures_payload,
    rounds_payload,
    season_candidates,
    standings_payload,
)
from providers.normalizers import (
    football_data_status_name,
    map_fixture,
    map_football_data_match,
    map_football_data_standing,
    map_standing,
    normalize_fixtures,
    ProviderPayloadError,
    status_name,
)

# Re-export module-level attributes for test monkeypatching compatibility
import config

FOOTBALL_PROVIDER = config.FOOTBALL_PROVIDER
API_KEY = config.API_KEY
MOCK_FIXTURES = config.MOCK_FIXTURES
urlopen = None
