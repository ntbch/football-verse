package com.footballverse.game.career;

import com.footballverse.game.dto.Position;
import com.footballverse.game.persistence.CareerSaveEntity;
import com.footballverse.game.persistence.CareerSaveRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class TransferMarketService {
    private static final List<String> OPEN = List.of("SUBMITTED", "COUNTERED", "CLUB_ACCEPTED", "TERMS_COUNTERED", "TERMS");
    private final JdbcOperations jdbc;
    private final CareerSaveRepository careers;

    private Candidate candidate(ResultSet rs) throws SQLException {
        var progress = rs.getInt("progress");
        var overall = rs.getDouble("overall");
        var value = value(overall, rs.getInt("age"));
        var error = progress >= 100 ? 0 : progress >= 75 ? 4 : progress >= 25 ? 8 : 12;
        var spread = BigDecimal.valueOf(progress >= 100 ? 0.05 : progress >= 75 ? 0.15 : 0.35);
        return new Candidate(rs.getObject("id", UUID.class), rs.getString("name"),
            Position.valueOf(rs.getString("primary_position")), rs.getInt("age"),
            rs.getObject("club_id", UUID.class), rs.getString("club_name"), rs.getString("transfer_status"),
            knowledge(progress), progress, Math.max(1, (int) Math.round(overall - error)),
            Math.min(100, (int) Math.round(overall + error)), value.subtract(value.multiply(spread)),
            value.add(value.multiply(spread)));
    }

    private Offer offer(ResultSet rs) throws SQLException {
        return new Offer(rs.getObject("id", UUID.class), rs.getObject("player_id", UUID.class),
            rs.getString("player_name"), rs.getObject("buyer_club_id", UUID.class), rs.getString("buyer_name"),
            rs.getObject("seller_club_id", UUID.class), rs.getString("seller_name"), rs.getBigDecimal("fee"),
            rs.getBigDecimal("wage"), (Integer) rs.getObject("contract_years"), rs.getString("squad_role"),
            rs.getString("status"), rs.getInt("negotiation_round"), rs.getObject("expires_on", LocalDate.class));
    }

    private static int pages(Long total, int size) {
        return (int) Math.ceil((double) (total == null ? 0 : total) / size);
    }

    public TransferMarketService(JdbcOperations jdbc, CareerSaveRepository careers) {
        this.jdbc = jdbc;
        this.careers = careers;
    }

    public TransferMarket market(long ownerId, UUID careerId, UUID clubId) {
        var career = career(ownerId, careerId);
        managed(career, clubId);
        var players = jdbc.query("""
            SELECT p.id, p.name, p.primary_position, p.age, p.club_id, c.name club_name,
                   p.transfer_status, COALESCE(sr.progress, 0) progress,
                   (SELECT avg(value::numeric) FROM jsonb_each_text(p.attributes)) overall
            FROM players p JOIN clubs c ON c.id = p.club_id
            LEFT JOIN scouting_reports sr ON sr.career_save_id = p.career_save_id
                AND sr.club_id = ? AND sr.player_id = p.id
            WHERE p.career_save_id = ? AND p.club_id <> ?
            ORDER BY p.transfer_status = 'LISTED' DESC, overall DESC LIMIT 40
            """, (rs, row) -> {
            var progress = rs.getInt("progress");
            var overall = rs.getDouble("overall");
            var value = value(overall, rs.getInt("age"));
            var error = progress >= 100 ? 0 : progress >= 75 ? 4 : progress >= 25 ? 8 : 12;
            var spread = BigDecimal.valueOf(progress >= 100 ? 0.05 : progress >= 75 ? 0.15 : 0.35);
            return new Candidate(rs.getObject("id", UUID.class), rs.getString("name"),
                Position.valueOf(rs.getString("primary_position")), rs.getInt("age"),
                rs.getObject("club_id", UUID.class), rs.getString("club_name"), rs.getString("transfer_status"),
                knowledge(progress), progress, Math.max(1, (int) Math.round(overall - error)),
                Math.min(100, (int) Math.round(overall + error)), value.subtract(value.multiply(spread)),
                value.add(value.multiply(spread)));
        }, clubId, careerId, clubId);
        return new TransferMarket(clubId, clubBalance(careerId, clubId), wageBudget(careerId, clubId),
            windowOpen(career), players);
    }

    public MarketPage marketPage(long ownerId, UUID careerId, UUID clubId, int page, int size, String query) {
        var career = career(ownerId, careerId);
        managed(career, clubId);
        page = Math.max(0, page);
        size = Math.max(1, Math.min(100, size));
        var search = search(query);
        var total = jdbc.queryForObject("""
            SELECT count(*) FROM players p JOIN clubs c ON c.id=p.club_id
            WHERE p.career_save_id=? AND p.club_id<>? AND
                  (lower(p.name) LIKE ? OR lower(c.name) LIKE ? OR lower(p.primary_position) LIKE ?)
            """, Long.class, careerId, clubId, search, search, search);
        var players = jdbc.query("""
            SELECT p.id, p.name, p.primary_position, p.age, p.club_id, c.name club_name,
                   p.transfer_status, COALESCE(sr.progress, 0) progress,
                   (SELECT avg(value::numeric) FROM jsonb_each_text(p.attributes)) overall
            FROM players p JOIN clubs c ON c.id=p.club_id
            LEFT JOIN scouting_reports sr ON sr.career_save_id=p.career_save_id AND sr.club_id=? AND sr.player_id=p.id
            WHERE p.career_save_id=? AND p.club_id<>? AND
                  (lower(p.name) LIKE ? OR lower(c.name) LIKE ? OR lower(p.primary_position) LIKE ?)
            ORDER BY p.transfer_status='LISTED' DESC, overall DESC, p.name, p.id LIMIT ? OFFSET ?
            """, (rs, row) -> candidate(rs), clubId, careerId, clubId, search, search, search, size, page * size);
        return new MarketPage(clubId, clubBalance(careerId, clubId), wageBudget(careerId, clubId), windowOpen(career),
            players, page, size, total == null ? 0 : total, pages(total, size), career.getVersion());
    }

    @Transactional
    public void scout(long ownerId, UUID careerId, UUID clubId, UUID playerId) {
        var career = career(ownerId, careerId);
        managed(career, clubId);
        player(careerId, playerId);
        jdbc.update("""
            INSERT INTO scouting_reports(career_save_id, club_id, player_id, progress, last_scouted_on)
            VALUES (?, ?, ?, 25, ?) ON CONFLICT (career_save_id, club_id, player_id)
            DO UPDATE SET progress = LEAST(100, scouting_reports.progress + 25), last_scouted_on = EXCLUDED.last_scouted_on
            """, careerId, clubId, playerId, career.getGameDate());
    }

    public List<Offer> offers(long ownerId, UUID careerId, UUID clubId) {
        managed(career(ownerId, careerId), clubId);
        return jdbc.query("""
            SELECT o.*, p.name player_name, b.name buyer_name, s.name seller_name
            FROM transfer_offers o JOIN players p ON p.id=o.player_id
            JOIN clubs b ON b.id=o.buyer_club_id JOIN clubs s ON s.id=o.seller_club_id
            WHERE o.career_save_id=? AND (o.buyer_club_id=? OR o.seller_club_id=?)
            ORDER BY o.updated_at DESC
            """, (rs, row) -> new Offer(rs.getObject("id", UUID.class), rs.getObject("player_id", UUID.class),
            rs.getString("player_name"), rs.getObject("buyer_club_id", UUID.class), rs.getString("buyer_name"),
            rs.getObject("seller_club_id", UUID.class), rs.getString("seller_name"), rs.getBigDecimal("fee"),
            rs.getBigDecimal("wage"), (Integer) rs.getObject("contract_years"), rs.getString("squad_role"),
            rs.getString("status"), rs.getInt("negotiation_round"), rs.getObject("expires_on", LocalDate.class)),
            careerId, clubId, clubId);
    }

    public PageResult<Offer> offersPage(long ownerId, UUID careerId, UUID clubId, int page, int size, String query) {
        var career = career(ownerId, careerId);
        managed(career, clubId);
        page = Math.max(0, page);
        size = Math.max(1, Math.min(100, size));
        var search = search(query);
        var total = jdbc.queryForObject("""
            SELECT count(*) FROM transfer_offers o JOIN players p ON p.id=o.player_id
            WHERE o.career_save_id=? AND (o.buyer_club_id=? OR o.seller_club_id=?) AND lower(p.name) LIKE ?
            """, Long.class, careerId, clubId, clubId, search);
        var items = jdbc.query("""
            SELECT o.*, p.name player_name, b.name buyer_name, s.name seller_name
            FROM transfer_offers o JOIN players p ON p.id=o.player_id
            JOIN clubs b ON b.id=o.buyer_club_id JOIN clubs s ON s.id=o.seller_club_id
            WHERE o.career_save_id=? AND (o.buyer_club_id=? OR o.seller_club_id=?) AND lower(p.name) LIKE ?
            ORDER BY o.updated_at DESC, o.id LIMIT ? OFFSET ?
            """, (rs, row) -> offer(rs), careerId, clubId, clubId, search, size, page * size);
        return PageResult.of(items, page, size, total == null ? 0 : total, career.getVersion());
    }

    @Transactional
    public Offer submit(long ownerId, UUID careerId, UUID buyerId, UUID playerId, BigDecimal fee) {
        var career = career(ownerId, careerId); managed(career, buyerId);
        if (fee == null || fee.signum() <= 0) throw bad("Fee must be positive");
        var player = player(careerId, playerId);
        var sellerId = (UUID) player.get("club_id");
        if (sellerId.equals(buyerId)) throw conflict("Player already belongs to buyer");
        var id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO transfer_offers(id, career_save_id, buyer_club_id, seller_club_id, player_id, fee, status, expires_on)
            VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED', ?)
            """, id, careerId, buyerId, sellerId, playerId, fee, career.getGameDate().plusDays(3));
        return findOffer(id);
    }

    @Transactional
    public Offer respond(long ownerId, UUID careerId, UUID clubId, UUID offerId, String action, BigDecimal fee) {
        managed(career(ownerId, careerId), clubId);
        var offer = offerRow(offerId);
        if (!OPEN.contains(offer.get("status"))) throw conflict("Offer is closed");
        var expectedClub = "COUNTERED".equals(offer.get("status")) ? offer.get("buyer_club_id") : offer.get("seller_club_id");
        if (!clubId.equals(expectedClub)) throw notFound();
        var value = action == null ? "" : action.toUpperCase(Locale.ROOT);
        if ("REJECT".equals(value)) jdbc.update("UPDATE transfer_offers SET status='REJECTED', updated_at=now() WHERE id=?", offerId);
        else if ("ACCEPT".equals(value)) jdbc.update("UPDATE transfer_offers SET status='CLUB_ACCEPTED', updated_at=now() WHERE id=?", offerId);
        else if ("COUNTER".equals(value)) {
            var round = ((Number) offer.get("negotiation_round")).intValue();
            if (round >= 3 || fee == null || fee.signum() <= 0) throw conflict("Counter-offer is not allowed");
            jdbc.update("UPDATE transfer_offers SET fee=?, status='COUNTERED', negotiation_round=negotiation_round+1, updated_at=now() WHERE id=?", fee, offerId);
        } else throw bad("Unsupported offer response");
        return findOffer(offerId);
    }

    @Transactional
    public Offer terms(long ownerId, UUID careerId, UUID clubId, UUID offerId, BigDecimal wage, int years, String role) {
        managed(career(ownerId, careerId), clubId);
        if (wage == null || wage.signum() <= 0 || years < 1 || years > 5 || !List.of("PROSPECT", "SQUAD", "STARTER", "STAR").contains(role))
            throw bad("Invalid contract terms");
        var offer = offerRow(offerId);
        if (!clubId.equals(offer.get("buyer_club_id"))) throw notFound();
        if (!List.of("CLUB_ACCEPTED", "TERMS_COUNTERED").contains(offer.get("status"))) throw conflict("Club has not accepted the fee");
        var currentWage = jdbc.queryForObject("SELECT wage FROM players WHERE id=?", BigDecimal.class, offer.get("player_id"));
        var minimum = currentWage.multiply(BigDecimal.valueOf(1.1));
        var accepted = wage.compareTo(minimum) >= 0 || "STAR".equals(role);
        jdbc.update("UPDATE transfer_offers SET wage=?, contract_years=?, squad_role=?, status=?, negotiation_round=LEAST(3, negotiation_round+1), updated_at=now() WHERE id=?",
            accepted ? wage : minimum, years, role, accepted ? "TERMS" : "TERMS_COUNTERED", offerId);
        return findOffer(offerId);
    }

    @Transactional
    public Offer complete(long ownerId, UUID careerId, UUID clubId, UUID offerId) {
        var career = career(ownerId, careerId); managed(career, clubId);
        return completeInternal(career, clubId, offerId);
    }

    private Offer completeInternal(CareerSaveEntity career, UUID clubId, UUID offerId) {
        var careerId = career.getId();
        var offer = jdbc.queryForMap("SELECT * FROM transfer_offers WHERE id=? AND career_save_id=? FOR UPDATE", offerId, careerId);
        if (!clubId.equals(offer.get("buyer_club_id"))) throw notFound();
        if ("COMPLETED".equals(offer.get("status"))) return findOffer(offerId);
        if (!"TERMS".equals(offer.get("status")) || !windowOpen(career)) throw conflict("Transfer cannot be completed");
        var buyer = (UUID) offer.get("buyer_club_id"); var seller = (UUID) offer.get("seller_club_id");
        var playerId = (UUID) offer.get("player_id"); var fee = (BigDecimal) offer.get("fee"); var wage = (BigDecimal) offer.get("wage");
        if (clubBalance(careerId, buyer).compareTo(fee) < 0 || wageBudget(careerId, buyer).compareTo(wage) < 0)
            throw conflict("Transfer or wage budget exceeded");
        var position = jdbc.queryForObject("SELECT primary_position FROM players WHERE id=? AND club_id=? FOR UPDATE", String.class, playerId, seller);
        var count = jdbc.queryForObject("SELECT count(*) FROM players WHERE club_id=?", Integer.class, seller);
        var positionCount = jdbc.queryForObject("SELECT count(*) FROM players WHERE club_id=? AND primary_position=?", Integer.class, seller, position);
        if (count == null || count <= 11 || ("GK".equals(position) && positionCount != null && positionCount <= 1)) throw conflict("Seller needs squad coverage");
        jdbc.update("UPDATE clubs SET balance=balance-? WHERE id=?", fee, buyer);
        jdbc.update("UPDATE clubs SET balance=balance+? WHERE id=?", fee, seller);
        jdbc.update("UPDATE players SET club_id=?, wage=?, contract_until=?, squad_role=?, transfer_status='AVAILABLE' WHERE id=?",
            buyer, wage, career.getGameDate().plusYears(((Number) offer.get("contract_years")).intValue()), offer.get("squad_role"), playerId);
        jdbc.update("UPDATE transfer_offers SET status='REJECTED', updated_at=now() WHERE player_id=? AND id<>? AND status IN ('SUBMITTED','COUNTERED','CLUB_ACCEPTED','TERMS_COUNTERED','TERMS')", playerId, offerId);
        jdbc.update("UPDATE transfer_offers SET status='COMPLETED', updated_at=now() WHERE id=?", offerId);
        return findOffer(offerId);
    }

    @Transactional
    public void setStatus(long ownerId, UUID careerId, UUID clubId, UUID playerId, String status) {
        managed(career(ownerId, careerId), clubId);
        var value = status == null ? "" : status.toUpperCase(Locale.ROOT);
        if (!List.of("AVAILABLE", "LISTED", "NOT_FOR_SALE", "REQUESTED").contains(value)) throw bad("Invalid transfer status");
        if (jdbc.update("UPDATE players SET transfer_status=? WHERE id=? AND club_id=? AND career_save_id=?", value, playerId, clubId, careerId) == 0) throw notFound();
    }

    @Transactional
    public void advanceDay(long ownerId, UUID careerId) {
        var career = career(ownerId, careerId);
        jdbc.update("UPDATE scouting_reports SET progress=LEAST(100, progress+25), last_scouted_on=? WHERE career_save_id=?", career.getGameDate(), careerId);
        jdbc.update("UPDATE transfer_offers SET status='EXPIRED', updated_at=now() WHERE career_save_id=? AND expires_on<? AND status IN ('SUBMITTED','COUNTERED','CLUB_ACCEPTED','TERMS_COUNTERED','TERMS')", careerId, career.getGameDate());
        jdbc.update("""
            UPDATE transfer_offers o SET
                status=CASE WHEN p.transfer_status='LISTED' OR o.negotiation_round>=3 THEN
                    CASE WHEN p.transfer_status='LISTED' THEN 'CLUB_ACCEPTED' ELSE 'REJECTED' END
                    ELSE 'COUNTERED' END,
                fee=CASE WHEN p.transfer_status<>'LISTED' AND o.negotiation_round<3 THEN o.fee*1.15 ELSE o.fee END,
                negotiation_round=CASE WHEN p.transfer_status<>'LISTED' AND o.negotiation_round<3 THEN o.negotiation_round+1 ELSE o.negotiation_round END,
                updated_at=now()
            FROM players p WHERE p.id=o.player_id AND o.career_save_id=? AND o.buyer_club_id=?
                AND o.status IN ('SUBMITTED','COUNTERED')
            """, careerId, career.getManagedClubId());
        if (windowOpen(career)) {
            jdbc.query("SELECT id, buyer_club_id FROM transfer_offers WHERE career_save_id=? AND buyer_club_id<>? AND status='TERMS' ORDER BY created_at LIMIT 1",
                rs -> { try { completeInternal(career, rs.getObject("buyer_club_id", UUID.class), rs.getObject("id", UUID.class)); } catch (ResponseStatusException ignored) { } },
                careerId, career.getManagedClubId());
        }
        jdbc.update("""
            UPDATE players SET transfer_status='LISTED' WHERE id=(
                SELECT p.id FROM players p WHERE p.career_save_id=? AND p.club_id IS DISTINCT FROM ?
                AND p.transfer_status='AVAILABLE' AND (SELECT count(*) FROM players x WHERE x.club_id=p.club_id)>14
                ORDER BY p.age DESC, p.id LIMIT 1
            )
            """, careerId, career.getManagedClubId());
        // ponytail: one deterministic AI bid per day; add richer squad scoring when league size exceeds demo scale.
        var managed = career.getManagedClubId();
        jdbc.query("""
            SELECT c.id buyer, p.id player, p.club_id seller,
                   ((SELECT avg(value::numeric) FROM jsonb_each_text(p.attributes)) * 50000)::numeric fee
            FROM clubs c JOIN managers m ON m.current_club_id=c.id JOIN LATERAL (
                SELECT p.* FROM players p WHERE p.career_save_id=c.career_save_id AND p.club_id<>c.id
                AND p.transfer_status='LISTED' ORDER BY CASE WHEN m.youth>=60 THEN p.age ELSE 100-p.age END, p.name LIMIT 1
            ) p ON true
            WHERE c.career_save_id=? AND c.id IS DISTINCT FROM ? AND NOT EXISTS (
                SELECT 1 FROM transfer_offers o WHERE o.career_save_id=? AND o.buyer_club_id=c.id AND o.status IN ('SUBMITTED','COUNTERED','CLUB_ACCEPTED','TERMS')
            ) ORDER BY c.id LIMIT 1
            """, rs -> {
            var id = UUID.nameUUIDFromBytes((careerId + career.getGameDate().toString() + rs.getString("buyer")).getBytes());
            jdbc.update("""
                INSERT INTO transfer_offers(id, career_save_id, buyer_club_id, seller_club_id, player_id, fee, wage, contract_years, squad_role, status, expires_on)
                VALUES (?, ?, ?, ?, ?, ?, 12000, 3, 'SQUAD', 'TERMS', ?)
                ON CONFLICT (id) DO NOTHING
                """, id, careerId, rs.getObject("buyer", UUID.class), rs.getObject("seller", UUID.class),
                rs.getObject("player", UUID.class), rs.getBigDecimal("fee"), career.getGameDate().plusDays(3));
        }, careerId, managed, careerId);
    }

    private CareerSaveEntity career(long owner, UUID id) { return careers.findByIdAndOwnerUserId(id, owner).orElseThrow(this::notFound); }
    private void managed(CareerSaveEntity career, UUID club) { if (!club.equals(career.getManagedClubId())) throw notFound(); }
    private void club(UUID career, UUID club) { if (jdbc.queryForObject("SELECT count(*) FROM clubs WHERE id=? AND career_save_id=?", Integer.class, club, career) == 0) throw notFound(); }
    private Map<String, Object> player(UUID career, UUID player) { try { return jdbc.queryForMap("SELECT id, club_id FROM players WHERE id=? AND career_save_id=?", player, career); } catch (Exception e) { throw notFound(); } }
    private Map<String, Object> offerRow(UUID id) { try { return jdbc.queryForMap("SELECT * FROM transfer_offers WHERE id=?", id); } catch (Exception e) { throw notFound(); } }
    private Offer findOffer(UUID id) { return jdbc.queryForObject("""
        SELECT o.*, p.name player_name, b.name buyer_name, s.name seller_name FROM transfer_offers o
        JOIN players p ON p.id=o.player_id JOIN clubs b ON b.id=o.buyer_club_id JOIN clubs s ON s.id=o.seller_club_id WHERE o.id=?
        """, (rs, row) -> new Offer(rs.getObject("id", UUID.class), rs.getObject("player_id", UUID.class), rs.getString("player_name"),
        rs.getObject("buyer_club_id", UUID.class), rs.getString("buyer_name"), rs.getObject("seller_club_id", UUID.class), rs.getString("seller_name"),
        rs.getBigDecimal("fee"), rs.getBigDecimal("wage"), (Integer) rs.getObject("contract_years"), rs.getString("squad_role"), rs.getString("status"),
        rs.getInt("negotiation_round"), rs.getObject("expires_on", LocalDate.class)), id); }
    private BigDecimal clubBalance(UUID career, UUID club) { return jdbc.queryForObject("SELECT balance FROM clubs WHERE id=? AND career_save_id=?", BigDecimal.class, club, career); }
    private BigDecimal wageBudget(UUID career, UUID club) { return jdbc.queryForObject("SELECT wage_budget FROM clubs WHERE id=? AND career_save_id=?", BigDecimal.class, club, career); }
    private boolean windowOpen(CareerSaveEntity career) { var dates = jdbc.queryForMap("SELECT min(match_date) first, max(match_date) last FROM fixtures WHERE career_save_id=? AND season_number=?", career.getId(), career.getSeasonNumber()); var first=dates.get("first"); var last=dates.get("last"); return first == null || !career.getGameDate().isAfter(LocalDate.parse(first.toString()).plusDays(2)) || !career.getGameDate().isBefore(LocalDate.parse(last.toString()).minusDays(1)); }
    private static String knowledge(int progress) { return progress >= 100 ? "FULL" : progress >= 75 ? "GOOD" : progress >= 25 ? "BASIC" : "NONE"; }
    private static String search(String query) {
        var normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return "%" + (normalized.length() < 2 ? "" : normalized) + "%";
    }
    private static BigDecimal value(double overall, int age) { return BigDecimal.valueOf(Math.round(overall * overall * 800 * (age <= 23 ? 1.25 : age >= 30 ? 0.65 : 1))); }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Transfer resource not found"); }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }

    public record Candidate(UUID playerId, String playerName, Position position, int age, UUID clubId, String clubName,
                            String transferStatus, String knowledge, int scoutingProgress, int overallMin, int overallMax,
                            BigDecimal valueMin, BigDecimal valueMax) {}
    public record TransferMarket(UUID clubId, BigDecimal balance, BigDecimal wageBudget, boolean windowOpen, List<Candidate> players) {}
    public record MarketPage(UUID clubId, BigDecimal balance, BigDecimal wageBudget, boolean windowOpen, List<Candidate> items,
                             int page, int size, long totalItems, int totalPages, long dataVersion) {}
    public record Offer(UUID id, UUID playerId, String playerName, UUID buyerClubId, String buyerClubName,
                        UUID sellerClubId, String sellerClubName, BigDecimal fee, BigDecimal wage, Integer contractYears,
                        String squadRole, String status, int negotiationRound, LocalDate expiresOn) {}
}
