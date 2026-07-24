package com.footballverse.game.career;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PageResultTest {
    @Test
    void computesLastPartialPage() {
        var result = PageResult.of(List.of("row"), 2, 25, 51, 7);

        assertThat(result.totalPages()).isEqualTo(3);
        assertThat(result.totalItems()).isEqualTo(51);
        assertThat(result.dataVersion()).isEqualTo(7);
    }
}
