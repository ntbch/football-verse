package com.footballverse.news.clustering;

import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class RuleBasedEventClassifier implements EventClassifier {

    @Override
    public EventFamily classify(String title, String summary) {
        String text = ((title == null ? "" : title) + " " + (summary == null ? "" : summary))
                .toLowerCase(Locale.ROOT);

        if (containsAny(text, "new contract", "extends contract", "extended contract", "contract extension",
                "renewed contract", "renews contract", "signs extension", "signed extension")) {
            return EventFamily.CONTRACT_RENEWAL;
        }
        if (containsAny(text, "sacked", "dismissed", "part ways", "fired", "relieved of duties")) {
            return EventFamily.MANAGER_SACKING;
        }
        if (containsAny(text, "appointed", "named manager", "named head coach", "new manager", "new head coach")) {
            return EventFamily.MANAGER_APPOINTMENT;
        }
        if (containsAny(text, "injury update", "fitness update", "return to training", "back in training", "set to return")) {
            return EventFamily.INJURY_UPDATE;
        }
        if (containsAny(text, "injury", "injured", "ruled out", "hamstring", "acl", "sidelined")) {
            return EventFamily.INJURY;
        }
        if (containsAny(text, "starting xi", "starting lineup", "team news", "line-up", "lineup")) {
            return EventFamily.LINEUP;
        }
        if (containsAny(text, "match preview", "preview", "predicted lineup", "ahead of the match")) {
            return EventFamily.MATCH_PREVIEW;
        }
        if (containsAny(text, "match report", " beat ", "defeated", "full-time", "full time", "win over", "draw with")) {
            return EventFamily.MATCH_RESULT;
        }
        if (containsAny(text, "rumour", "rumor", "gossip", "linked with", "linked to", "eyeing")) {
            return EventFamily.TRANSFER_RUMOUR;
        }
        if (containsAny(text, "interested in", "interest in", "targeting", "targetting", "transfer target")) {
            return EventFamily.TRANSFER_INTEREST;
        }
        if (containsAny(text, "bid", "offer", "submitted proposal", "submit proposal")) {
            return EventFamily.TRANSFER_BID;
        }
        if (containsAny(text, "agreement", "deal agreed", "agreed terms", "personal terms agreed", "here we go")) {
            return EventFamily.TRANSFER_AGREEMENT;
        }
        if (containsAny(text, "official", "confirm signing", "confirmed signing", "joins", "completed transfer",
                "has signed", "have signed", "signs for", "signed for")) {
            return EventFamily.TRANSFER_OFFICIAL;
        }

        return EventFamily.GENERAL;
    }

    private boolean containsAny(String text, String... terms) {
        for (String term : terms) {
            if (text.contains(term)) return true;
        }
        return false;
    }
}
