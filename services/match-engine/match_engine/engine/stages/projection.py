from match_engine.domain import MatchInput, MatchResult, MatchSimulationState, MatchStats, PlayerStats, TeamSnapshot, TeamStats


def finish_match(match: MatchInput, snapshot: MatchSimulationState) -> MatchResult:
    if not snapshot.completed:
        raise ValueError("Cannot finish an incomplete match simulation")
    total_possessions = snapshot.home.possessions + snapshot.away.possessions
    home_share = 50.0 if total_possessions == 0 else round((snapshot.home.possessions / total_possessions) * 100, 1)
    away_share = round(100.0 - home_share, 1)

    home_stats = TeamStats(
        team_id=match.home.id,
        goals=snapshot.home.goals,
        shots=snapshot.home.shots,
        shots_on_target=snapshot.home.shots_on_target,
        xg=snapshot.home.xg,
        possession=home_share,
        passes_attempted=snapshot.home.passes_attempted,
        passes_completed=snapshot.home.passes_completed,
        fouls=snapshot.home.fouls,
        yellow_cards=snapshot.home.yellow_cards,
        red_cards=snapshot.home.red_cards,
    )
    away_stats = TeamStats(
        team_id=match.away.id,
        goals=snapshot.away.goals,
        shots=snapshot.away.shots,
        shots_on_target=snapshot.away.shots_on_target,
        xg=snapshot.away.xg,
        possession=away_share,
        passes_attempted=snapshot.away.passes_attempted,
        passes_completed=snapshot.away.passes_completed,
        fouls=snapshot.away.fouls,
        yellow_cards=snapshot.away.yellow_cards,
        red_cards=snapshot.away.red_cards,
    )
    home_players = tuple(team_player_stats(snapshot.current_home, snapshot.player_data, snapshot.minutes))
    away_players = tuple(team_player_stats(snapshot.current_away, snapshot.player_data, snapshot.minutes))
    stats = MatchStats(
        home=home_stats,
        away=away_stats,
        players=home_players + away_players,
    )
    return MatchResult(
        seed=match.seed,
        engine_version=match.engine_version,
        ruleset_version=match.ruleset_version,
        home_team_id=match.home.id,
        away_team_id=match.away.id,
        home_score=home_stats.goals,
        away_score=away_stats.goals,
        events=snapshot.events,
        stats=stats,
    )


def team_player_stats(team: TeamSnapshot, data, minutes):
    for player in team.players:
        played = minutes.get(str(player.id), 0)
        if played <= 0:
            continue
        values = data.get(str(player.id), {})
        goals = values.get("goals", 0)
        shots = values.get("shots", 0)
        passes_attempted = values.get("passes_attempted", 0)
        passes_completed = values.get("passes_completed", 0)
        tackles = values.get("tackles", 0)
        rating = min(10, 6 + goals * 0.8 + tackles * 0.05 + passes_completed * 0.005)
        yield PlayerStats(
            player_id=player.id,
            team_id=team.id,
            minutes=played,
            rating=round(rating, 2),
            goals=goals,
            shots=shots,
            passes_attempted=passes_attempted,
            passes_completed=passes_completed,
            tackles=tackles,
        )
