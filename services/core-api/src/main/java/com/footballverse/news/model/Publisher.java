package com.footballverse.news.model;

import com.footballverse.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "publishers")
@Getter
@Setter
@NoArgsConstructor
public class Publisher extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 160)
    private String name;

    @Column(name = "canonical_domain")
    private String canonicalDomain;

    @Column(nullable = false)
    private boolean official;

    @Column(name = "trust_score", nullable = false, precision = 5, scale = 4)
    private BigDecimal trustScore = new BigDecimal("0.5000");

    @Column(nullable = false)
    private boolean active = true;

    public Publisher(String name) {
        this.name = name;
    }
}
