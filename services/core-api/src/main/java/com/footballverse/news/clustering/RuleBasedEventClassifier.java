package com.footballverse.news.clustering;

import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class RuleBasedEventClassifier implements EventClassifier {

    @Override
    public EventFamily classify(String title, String summary) {
        String text = ((title == null ? "" : title) + " " + (summary == null ? "" : summary)).toLowerCase(Locale.ROOT);

        if (text.contains("rumour") || text.contains("rumor") || text.contains("gossip") || text.contains("linked with") || text.contains("eyeing")) {
            return EventFamily.TRANSFER_RUMOUR;
        }
        if (text.contains("official") || text.contains("confirm signing") || text.contains("joins") || text.contains("signed contract") || text.contains("completed transfer") || text.contains("sign ") || text.contains("signed ")) {
            return EventFamily.TRANSFER_OFFICIAL;
        }
        if (text.contains("agreement") || text.contains("deal agreed") || text.contains("agreed terms") || text.contains("here we go")) {
            return EventFamily.TRANSFER_AGREEMENT;
        }
        if (text.contains("bid") || text.contains("offer") || text.contains("submit proposal")) {
            return EventFamily.TRANSFER_BID;
        }
        if (text.contains("interested in") || text.contains("target") || text.contains("targetting")) {
            return EventFamily.TRANSFER_INTEREST;
        }
        if (text.contains("injury") || text.contains("injured") || text.contains("ruled out") || text.contains("hamstring") || text.contains("acl") || text.contains("sidelined")) {
            return EventFamily.INJURY;
        }
        if (text.contains("match report") || text.contains("beat ") || text.contains("defeated ") || text.contains("draw ") || text.contains("win over")) {
            return EventFamily.MATCH_RESULT;
        }
        if (text.contains("new contract") || text.contains("extends contract") || text.contains("contract extension")) {
            return EventFamily.CONTRACT_RENEWAL;
        }
        if (text.contains("appointed") || text.contains("new manager") || text.contains("head coach")) {
            return EventFamily.MANAGER_APPOINTMENT;
        }
        if (text.contains("sacked") || text.contains("dismissed") || text.contains("part ways")) {
            return EventFamily.MANAGER_SACKING;
        }

        return EventFamily.GENERAL;
    }
}
