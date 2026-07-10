alter table news_comments
    add constraint uq_news_comments_id_article unique (id, article_id);

alter table news_comments
    add constraint fk_news_comments_parent_same_article
    foreign key (parent_id, article_id)
    references news_comments(id, article_id);
