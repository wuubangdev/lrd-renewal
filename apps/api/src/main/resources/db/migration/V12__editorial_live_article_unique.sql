create unique index editorial_live_article_unique on editorial.item ((live->>'articleId')) where live is not null;
