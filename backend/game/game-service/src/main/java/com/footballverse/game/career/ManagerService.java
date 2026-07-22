package com.footballverse.game.career;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.dto.*;
import com.footballverse.game.persistence.CareerSaveEntity;
import com.footballverse.game.persistence.CareerSaveRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

@Service
public class ManagerService {
    private static final Position[] FORMATION = {Position.GK, Position.LB, Position.CB, Position.CB, Position.RB,
        Position.CM, Position.CM, Position.CM, Position.LW, Position.RW, Position.ST};
    private static final String[] NAMES = {"Alex Mercer", "Marco Silva", "Jonas Fischer", "Rafael Moreau",
        "Theo Bennett", "Adrian Kovac", "Milan Costa", "Ibrahim Ward"};
    private final JdbcOperations jdbc;
    private final CareerSaveRepository careers;
    private final ObjectMapper json;

    public ManagerService(JdbcOperations jdbc, CareerSaveRepository careers, ObjectMapper json) {
        this.jdbc = jdbc; this.careers = careers; this.json = json;
    }

    @Transactional
    public UUID seed(CareerSaveEntity career, List<UUID> clubs) {
        UUID playerManager = null;
        for (int index = 0; index < clubs.size(); index++) {
            var id = UUID.randomUUID();
            var tactic = List.of("BALANCED", "GEGENPRESS", "TIKI_TAKA", "COUNTER_ATTACK").get(index % 4);
            jdbc.update("""
                INSERT INTO managers(id, career_save_id, name, age, reputation, status, current_club_id, preferred_tactic,
                    tactical, adaptability, rotation, youth, discipline, transfer_rating, risk)
                VALUES (?, ?, ?, ?, ?, 'EMPLOYED', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, career.getId(), index == 0 ? "Player Manager" : NAMES[index], 38 + index * 4, 55 + index * 3,
                clubs.get(index), tactic, 58 + index * 4, 50 + index * 6, Math.min(100, 45 + index * 8), Math.min(100, 40 + index * 10),
                65 - index * 5, 50 + index * 7, Math.min(100, 45 + index * 9));
            jdbc.update("INSERT INTO manager_careers(id, manager_id, club_id, joined_on) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), id, clubs.get(index), career.getGameDate());
            jdbc.update("""
                INSERT INTO manager_objectives(id, manager_id, club_id, season_number, objective_type, target, weight)
                VALUES (?, ?, ?, ?, 'POINTS', ?, 70)
                """, UUID.randomUUID(), id, clubs.get(index), career.getSeasonNumber(), 8 + index);
            if (index == 0) playerManager = id;
        }
        for (int index = 0; index < 2; index++) {
            jdbc.update("""
                INSERT INTO managers(id, career_save_id, name, age, reputation, status, preferred_tactic,
                    tactical, adaptability, rotation, youth, discipline, transfer_rating, risk)
                VALUES (?, ?, ?, ?, ?, 'UNEMPLOYED', ?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), career.getId(), index == 0 ? "Adrian Kovac" : "Theo Bennett", 44 + index * 7,
                52 + index * 4, index == 0 ? "PARK_THE_BUS" : "WING_PLAY", 55, 62, 58, 60, 57, 54, 50);
        }
        return playerManager;
    }

    public Lineup lineup(UUID clubId, List<PlayerSnapshot> players) {
        var manager = managerRow(clubId);
        var rotation = ((Number) manager.get("rotation")).doubleValue() / 100;
        var youth = ((Number) manager.get("youth")).doubleValue() / 100;
        var available = players.stream().filter(p -> p.availability() == PlayerAvailability.AVAILABLE).toList();
        var selected = new HashSet<UUID>();
        var slots = new ArrayList<LineupSlot>();
        for (var position : FORMATION) {
            var player = available.stream().filter(p -> !selected.contains(p.id()))
                .max(Comparator.comparingDouble(p -> selectionScore(p, position, rotation, youth))).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.CONFLICT, "Manager cannot build a valid lineup"));
            selected.add(player.id()); slots.add(new LineupSlot(player.id(), position, role(position)));
        }
        var bench = available.stream().filter(p -> !selected.contains(p.id()))
            .sorted(Comparator.comparingDouble((PlayerSnapshot p) -> p.fitness() + p.form()).reversed()).limit(7).map(PlayerSnapshot::id).toList();
        decision((UUID) manager.get("career_save_id"), (UUID) manager.get("id"), LocalDate.parse(manager.get("game_date").toString()), "LINEUP", "SELECTED",
            Map.of("rotation", manager.get("rotation"), "youth", manager.get("youth")));
        return new Lineup(Formation.FOUR_THREE_THREE, slots, bench);
    }

    public Tactic tactic(UUID clubId, int strengthDifference, double fitness, double form, long unavailable, Tactic opponent) {
        var manager = managerRow(clubId);
        var preferred = (String) manager.get("preferred_tactic");
        if (((Number) manager.get("risk")).intValue() >= 70 && strengthDifference >= 0) preferred = "GEGENPRESS";
        return TacticPresets.get(TacticPresets.choose(preferred, strengthDifference, fitness, form, unavailable, opponent));
    }

    public ManagerPlan plan(UUID clubId) {
        var manager = managerRow(clubId);
        return new ManagerPlan((UUID) manager.get("id"), (String) manager.get("name"),
            ((Number) manager.get("adaptability")).intValue(), ((Number) manager.get("risk")).intValue(), List.of(30, 45, 60, 75));
    }

    public Dashboard dashboard(long owner, UUID careerId) {
        var career = career(owner, careerId);
        var id = jdbc.queryForObject("SELECT player_manager_id FROM career_saves WHERE id=?", UUID.class, careerId);
        if (id == null) throw notFound();
        return dashboard(id);
    }

    public Dashboard clubManager(long owner, UUID careerId, UUID clubId) {
        career(owner, careerId);
        var id = jdbc.queryForObject("SELECT id FROM managers WHERE career_save_id=? AND current_club_id=?", UUID.class, careerId, clubId);
        return dashboard(id);
    }

    public List<Map<String, Object>> decisions(long owner, UUID careerId) {
        var dashboard = dashboard(owner, careerId);
        return jdbc.queryForList("SELECT game_date, domain, decision_code, reason FROM manager_decisions WHERE manager_id=? ORDER BY id DESC LIMIT 30", dashboard.id());
    }

    public List<Map<String, Object>> jobs(long owner, UUID careerId) {
        career(owner, careerId);
        return jdbc.queryForList("""
            SELECT c.id club_id, c.name club_name, c.reputation,
                   CASE WHEN m.id IS NULL THEN 'VACANT' ELSE 'FILLED' END status
            FROM clubs c LEFT JOIN managers m ON m.current_club_id=c.id
            WHERE c.career_save_id=? ORDER BY m.id NULLS FIRST, c.reputation DESC
            """, careerId);
    }

    @Transactional
    public void advanceDay(long owner, UUID careerId) {
        var career = career(owner, careerId);
        var rows = jdbc.queryForList("""
            SELECT m.id, m.current_club_id, avg(p.fitness) fitness FROM managers m
            JOIN players p ON p.club_id=m.current_club_id
            WHERE m.career_save_id=? AND m.current_club_id IS NOT NULL AND m.id<>?
            GROUP BY m.id, m.current_club_id ORDER BY m.id
            """, careerId, career.getPlayerManagerId());
        for (var row : rows) {
            var recovery = ((Number) row.get("fitness")).doubleValue() < 78;
            jdbc.update(recovery
                ? "UPDATE players SET fitness=LEAST(100,fitness+3) WHERE club_id=?"
                : "UPDATE players SET form=LEAST(100,form+1) WHERE club_id=?", row.get("current_club_id"));
            decision(careerId, (UUID) row.get("id"), career.getGameDate(), "TRAINING", recovery ? "RECOVERY" : "DEVELOPMENT", Map.of());
        }
        jdbc.update("DELETE FROM manager_decisions WHERE career_save_id=? AND game_date<?", careerId, career.getGameDate().minusDays(30));
    }

    @Transactional
    public void dismiss(long owner, UUID careerId, UUID managerId, String reason) {
        var career = career(owner, careerId);
        dismissInternal(career, managerId, reason);
    }

    private void dismissInternal(CareerSaveEntity career, UUID managerId, String reason) {
        var careerId = career.getId();
        var row = jdbc.queryForMap("SELECT current_club_id FROM managers WHERE id=? AND career_save_id=? FOR UPDATE", managerId, careerId);
        var club = (UUID) row.get("current_club_id");
        jdbc.update("UPDATE manager_careers SET left_on=?, dismissal_reason=? WHERE manager_id=? AND left_on IS NULL", career.getGameDate(), reason, managerId);
        jdbc.update("UPDATE managers SET current_club_id=NULL, status='UNEMPLOYED', board_pressure=50 WHERE id=?", managerId);
        if (managerId.equals(career.getPlayerManagerId())) {
            career.setManagedClubId(null); career.setStatus("UNEMPLOYED"); careers.save(career);
        } else appointBest(career, club, managerId);
    }

    @Transactional
    public void acceptJob(long owner, UUID careerId, UUID clubId) {
        var career = career(owner, careerId);
        if (career.getPlayerManagerId() == null) throw notFound();
        var managerStatus = jdbc.queryForObject("SELECT status FROM managers WHERE id=?", String.class, career.getPlayerManagerId());
        if (!"UNEMPLOYED".equals(managerStatus)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Manager is already employed");
        var occupied = jdbc.queryForObject("SELECT count(*) FROM managers WHERE current_club_id=?", Integer.class, clubId);
        if (occupied != null && occupied > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Job is not vacant");
        appoint(career, career.getPlayerManagerId(), clubId);
        career.setManagedClubId(clubId); career.setStatus("ACTIVE"); careers.save(career);
    }

    @Transactional
    public void record(UUID careerId, UUID homeClub, UUID awayClub, int homeScore, int awayScore, LocalDate date) {
        updateRecord(homeClub, homeScore, awayScore, date); updateRecord(awayClub, awayScore, homeScore, date);
        var career = careers.findById(careerId).orElseThrow();
        var reviews = jdbc.query("SELECT id FROM managers WHERE career_save_id=? AND board_pressure>=90 AND matches>=5 AND current_club_id IS NOT NULL ORDER BY id",
            (rs,row) -> rs.getObject("id", UUID.class), careerId);
        for (var manager : reviews) dismissInternal(career, manager, "Board confidence collapsed");
    }

    private void updateRecord(UUID club, int scored, int conceded, LocalDate date) {
        var result = scored > conceded ? "wins=wins+1" : scored < conceded ? "losses=losses+1" : "draws=draws+1";
        var delta = scored > conceded ? -8 : scored < conceded ? 12 : 2;
        jdbc.update("UPDATE managers SET matches=matches+1, " + result + ", board_pressure=LEAST(100,GREATEST(0,board_pressure+?)) WHERE current_club_id=?", delta, club);
        jdbc.update("UPDATE manager_careers SET matches=matches+1, " + result + " WHERE club_id=? AND left_on IS NULL", club);
        jdbc.update("UPDATE manager_objectives SET progress=progress+? WHERE club_id=? AND status='ACTIVE' AND objective_type='POINTS'", scored > conceded ? 3 : scored == conceded ? 1 : 0, club);
    }

    private void appointBest(CareerSaveEntity career, UUID club, UUID excluded) {
        var ids = jdbc.query("SELECT id FROM managers WHERE career_save_id=? AND status='UNEMPLOYED' AND id<>? ORDER BY reputation DESC, id LIMIT 1",
            (rs,row) -> rs.getObject("id", UUID.class), career.getId(), excluded);
        var id = ids.isEmpty() ? null : ids.getFirst();
        if (id != null) appoint(career, id, club);
    }

    private void appoint(CareerSaveEntity career, UUID manager, UUID club) {
        jdbc.update("UPDATE managers SET current_club_id=?, status='EMPLOYED', board_pressure=20 WHERE id=?", club, manager);
        jdbc.update("INSERT INTO manager_careers(id,manager_id,club_id,joined_on) VALUES(?,?,?,?)", UUID.randomUUID(), manager, club, career.getGameDate());
    }

    private Dashboard dashboard(UUID id) {
        return jdbc.queryForObject("""
            SELECT m.*, c.name club_name FROM managers m LEFT JOIN clubs c ON c.id=m.current_club_id WHERE m.id=?
            """, (rs, row) -> new Dashboard(rs.getObject("id", UUID.class), rs.getString("name"), rs.getInt("age"),
            rs.getInt("reputation"), rs.getString("status"), rs.getObject("current_club_id", UUID.class), rs.getString("club_name"),
            rs.getString("preferred_tactic"), rs.getInt("tactical"), rs.getInt("adaptability"), rs.getInt("rotation"),
            rs.getInt("youth"), rs.getInt("discipline"), rs.getInt("transfer_rating"), rs.getInt("risk"),
            rs.getInt("board_pressure"), pressure(rs.getInt("board_pressure")), rs.getInt("matches"), rs.getInt("wins"),
            rs.getInt("draws"), rs.getInt("losses"), objectives(id)), id);
    }

    private List<Objective> objectives(UUID manager) {
        return jdbc.query("SELECT objective_type,target,weight,progress,status FROM manager_objectives WHERE manager_id=? ORDER BY weight DESC",
            (rs,row) -> new Objective(rs.getString(1),rs.getInt(2),rs.getInt(3),rs.getInt(4),rs.getString(5)), manager);
    }

    private Map<String,Object> managerRow(UUID clubId) { return jdbc.queryForMap("SELECT m.*, s.game_date FROM managers m JOIN career_saves s ON s.id=m.career_save_id WHERE m.current_club_id=?", clubId); }
    private CareerSaveEntity career(long owner, UUID id) { return careers.findByIdAndOwnerUserId(id, owner).orElseThrow(this::notFound); }
    private void decision(UUID career, UUID manager, LocalDate date, String domain, String code, Map<String,Object> reason) {
        try { jdbc.update("INSERT INTO manager_decisions(career_save_id,manager_id,game_date,domain,decision_code,reason) VALUES(?,?,?,?,?,CAST(? AS jsonb))",
            career, manager, date, domain, code, json.writeValueAsString(reason)); } catch (JsonProcessingException e) { throw new IllegalStateException(e); }
    }
    private static double selectionScore(PlayerSnapshot p, Position position, double rotation, double youth) {
        var fit = p.primaryPosition() == position ? 20 : p.secondaryPositions().contains(position) ? 8 : -20;
        var attrs = p.attributes();
        var quality = (attrs.decisions() + attrs.positioning() + attrs.teamwork()) / 3.0;
        var ageBonus = youth * Math.max(0, 24 - p.age());
        return quality + fit + p.form() * .15 + p.morale() * .1 + p.fitness() * (.1 + rotation * .15) + ageBonus;
    }
    private static PlayerRole role(Position p) { return switch(p) { case GK -> PlayerRole.GOALKEEPER; case LB,RB -> PlayerRole.FULL_BACK; case CB -> PlayerRole.CENTRAL_DEFENDER; case CM -> PlayerRole.CENTRAL_MIDFIELDER; case LW,RW -> PlayerRole.WINGER; case ST -> PlayerRole.POACHER; default -> PlayerRole.CENTRAL_MIDFIELDER; }; }
    private static String pressure(int value) { return value >= 80 ? "CRITICAL" : value >= 50 ? "UNDER_PRESSURE" : "SAFE"; }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager resource not found"); }

    public record Objective(String type, int target, int weight, int progress, String status) {}
    public record Dashboard(UUID id, String name, int age, int reputation, String status, UUID clubId, String clubName,
        String preferredTactic, int tactical, int adaptability, int rotation, int youth, int discipline, int transfer,
        int risk, int boardPressure, String pressure, int matches, int wins, int draws, int losses, List<Objective> objectives) {}
}
