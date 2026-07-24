package com.footballverse.forum.service;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.forum.dto.ForumCategoryRequest;
import com.footballverse.forum.dto.ForumCategoryResponse;
import com.footballverse.forum.dto.PostResponse;
import com.footballverse.forum.dto.ReplyRequest;
import com.footballverse.forum.dto.ReportRequest;
import com.footballverse.forum.dto.ReportResponse;
import com.footballverse.forum.dto.ThreadDetailResponse;
import com.footballverse.forum.dto.ThreadRequest;
import com.footballverse.forum.dto.ThreadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ForumService {

    private final ForumThreadService threadService;
    private final ForumPostService postService;
    private final ForumReportService reportService;

    public List<ForumCategoryResponse> categories() {
        return threadService.categories();
    }

    public ForumCategoryResponse createCategory(ForumCategoryRequest request) {
        return threadService.createCategory(request);
    }

    public PageResponse<ThreadResponse> threads(String categorySlug, int page, int size, String sort) {
        return threadService.threads(categorySlug, page, size, sort);
    }

    public ThreadDetailResponse thread(String slug) {
        return threadService.thread(slug);
    }

    public ThreadResponse createThread(String categorySlug, ThreadRequest request) {
        return threadService.createThread(categorySlug, request);
    }

    public PostResponse reply(Long threadId, ReplyRequest request) {
        return postService.reply(threadId, request);
    }

    public ReportResponse report(ReportRequest request) {
        return reportService.report(request);
    }

    public List<ReportResponse> openReports() {
        return reportService.openReports();
    }

    public ThreadResponse pin(Long id, boolean pinned) {
        return threadService.pin(id, pinned);
    }

    public ThreadResponse lock(Long id, boolean locked) {
        return threadService.lock(id, locked);
    }

    public ThreadResponse hideThread(Long id, boolean hidden) {
        return threadService.hideThread(id, hidden);
    }

    public PostResponse hidePost(Long id, boolean hidden) {
        return postService.hidePost(id, hidden);
    }

    public ReportResponse resolveReport(Long id) {
        return reportService.resolveReport(id);
    }

    public boolean toggleFollow(Long threadId) {
        return threadService.toggleFollow(threadId);
    }

    public List<ThreadResponse> followedThreads() {
        return threadService.followedThreads();
    }

    public ThreadResponse markBestAnswer(Long threadId, Long postId) {
        return threadService.markBestAnswer(threadId, postId);
    }

    public ThreadResponse clearBestAnswer(Long threadId) {
        return threadService.clearBestAnswer(threadId);
    }

    public boolean toggleLikePost(Long postId) {
        return postService.toggleLikePost(postId);
    }
}
