package com.footballverse.forum;

import com.footballverse.common.AuditableEntity;
import com.footballverse.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "forum_threads", indexes = {
    @Index(name = "idx_forum_threads_cat_hid_pin_created", columnList = "category_id, hidden, pinned DESC, created_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
public class ForumThread extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, unique = true, length = 220)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private ForumCategory category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private UserAccount author;

    @Column(nullable = false)
    private boolean pinned;

    @Column(nullable = false)
    private boolean locked;

    @Column(nullable = false)
    private boolean hidden;

    @Column(nullable = false)
    private boolean solved;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "best_answer_post_id")
    private ForumPost bestAnswer;

    @Column(nullable = false)
    private Instant lastActivityAt;

    @PrePersist
    void defaultLastActivityAt() {
        if (lastActivityAt == null) {
            lastActivityAt = Instant.now();
        }
    }
}
