package com.footballverse.forum;

import com.footballverse.user.UserAccount;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "forum_thread_follows", uniqueConstraints = {
        @UniqueConstraint(name = "uk_forum_thread_follows_thread_user", columnNames = {"thread_id", "user_id"})
})
@Getter
@NoArgsConstructor
public class ForumThreadFollow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "thread_id", nullable = false)
    private ForumThread thread;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    public ForumThreadFollow(ForumThread thread, UserAccount user) {
        this.thread = thread;
        this.user = user;
    }
}

