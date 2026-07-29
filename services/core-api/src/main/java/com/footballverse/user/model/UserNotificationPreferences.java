package com.footballverse.user.model;

import com.footballverse.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_notification_preferences")
@Getter
@Setter
@NoArgsConstructor
public class UserNotificationPreferences extends AuditableEntity {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne(optional = false)
    @MapsId
    @JoinColumn(name = "user_id")
    private UserAccount user;

    @Column(name = "forum_replies", nullable = false)
    private boolean forumReplies = true;

    @Column(name = "prediction_scored", nullable = false)
    private boolean predictionScored = true;

    public UserNotificationPreferences(UserAccount user) {
        this.user = user;
    }
}
